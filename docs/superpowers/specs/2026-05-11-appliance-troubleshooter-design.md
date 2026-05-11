# Appliance Troubleshooter v1 Design

**Date:** 2026-05-11
**Status:** Brainstorming → ready for writing-plans
**Project repo (planned):** `../slop-appliance-doctor/` (not yet bootstrapped)
**Vetted entry:** `VETTED.md` → Appliance Troubleshooter
**Follows pattern:** Vision-LLM as Ambient Domain Expert (2nd instance — Plant Doctor was 1st)
**Reference implementation:** `../slop-plant-doctor/` (most architecture and infrastructure is reused; only the appliance-specific deltas are detailed here)

## Summary

Appliance Troubleshooter is a public, free, mobile-first web app that diagnoses malfunctioning home appliances (dishwashers, washers, dryers, refrigerators, ovens) from a photo plus optional context (freeform text, make/model/serial, error code) and returns a structured diagnosis: appliance identification, primary failure mode with confidence and evidence-cited rationale, DIY recovery steps with difficulty levels, "call a pro" recommendation when warranted, parts list, alternative diagnoses, and verification checks.

v1 reuses Plant Doctor's stack (SvelteKit + Cloudflare Workers + Static Assets, OpenRouter via Qwen2.5-VL 72B, KV-backed result persistence, layered cost controls, Turnstile, shareable `/d/[id]` URLs) and adds:
- Two optional capture fields (model/serial, error code)
- A new `ApplianceDiagnosisResult` schema with DIY/pro split, difficulty levels, and parts list
- A light hand-curated reference data table (~50–75 entries across 5 categories) injected into the system prompt after pure-function filtering
- An appliance-specific system prompt with explicit safety rules (gas, refrigeration, energized circuits)

The goal of v1 is to test whether the Vision-LLM as Ambient Domain Expert pattern flexes to a vertical with a meaningfully different output shape and stronger safety constraints, while reusing as much of the proven Plant Doctor scaffolding as possible.

## Context

This is the second instance of the Vision-LLM as Ambient Domain Expert pattern (see `VETTED.md`). Plant Doctor shipped 2026-05-11 (see `2026-05-11-plant-doctor-design.md` + the deployed app at https://slop-plant-doctor.meigo.workers.dev/). Appliance Troubleshooter is the second instance picked because:

- **Strongest business case** of the five vetted instances ($150 service-call avoidance, B2B home-warranty insurer angle, parts affiliate revenue, willingness-to-pay precedent in adjacent products).
- **Open reference data ready** (iFixit's CC-licensed content, university repair-manual references) — though v1 uses a hand-curated subset rather than full RAG (see "Reference Data" section for rationale).
- **Pattern stretch** — different output shape (diagnosis tree + parts list + DIY/pro split + difficulty levels) than Plant Doctor. If the Plant Doctor scaffolding flexes to this without major refactoring, the pattern bet pays off and instances #3–5 become much cheaper.
- **Workable dogfooding** — quality fixtures sourced from r/fixit photo posts + iFixit's failure-mode galleries + user's own appliances cover most v1 needs.

## Scope

**In scope for v1:**
- Public, shareable web app at a single Worker domain
- Five appliance categories: dishwasher, clothes washer, clothes dryer, refrigerator, oven/range
- "Other" category fallback that responds gracefully ("we don't optimize for this yet — here's a best-guess diagnosis without category-specific reference data")
- Photo upload (single photo; mobile camera + drag/drop/paste on desktop)
- Three text inputs: freeform description (required-ish, "What's it doing?"), make/model/serial (optional), error code (optional)
- Diagnosis via Vision-LLM (OpenRouter, default Qwen2.5-VL 72B) with hand-curated reference data injected into the system prompt
- Structured result: appliance ID + primary diagnosis (rationale + DIY recovery + call-pro decision + parts) + 1–2 alternatives + verification checks
- Shareable `/d/[id]` URLs (90-day KV TTL)
- Layered cost controls (Turnstile, IP rate limit, per-IP daily cap, global daily budget cap) — inherited from Plant Doctor
- Mobile-first responsive UI, single column, ~700px max width — inherited
- Quality-test fixture set (~20–25 photos across the 5 categories)

**Out of scope for v1 (deferred to v2+):**
- Accounts, auth, payments
- Appliance memory / per-appliance history (model-number → past diagnoses lookup)
- Affiliate links on parts list (the data model supports `partNumber` + `typicalCostUsd`; the UI doesn't render clickable links yet)
- Full iFixit RAG (vector index over the corpus)
- Multi-photo uploads (model sticker + display + damaged area)
- HVAC, water heaters, microwaves, vacuums, small appliances (out of the top-5 categories)
- Real-time parts pricing lookup (Repair Clinic / Amazon API)
- BYOK
- Native mobile app
- **i18n** — UI is hardcoded English; system prompt is English. See cross-cutting i18n note in `VETTED.md` for the v2 expansion pattern.

## Architecture

### Components (delta from Plant Doctor)

**Reused verbatim from `slop-plant-doctor`** (modules copy-pasted at bootstrap, only the schema type-parameter swapped where applicable):
- SvelteKit + TypeScript on Cloudflare Workers + Static Assets (`@sveltejs/adapter-cloudflare` v7+)
- `wrangler.toml` config pattern (Workers + Assets binding + KV binding + `[vars]` + secrets via `wrangler secret put`)
- KV-backed result persistence (90-day TTL), rate-limit counters, daily-cap counters, budget counter
- OpenRouter client (`callOpenRouter`)
- Parser (markdown fence stripping + balanced-brace JSON extraction + Zod validation)
- Cost estimator + per-model rate table
- Turnstile verification
- Error taxonomy + factory functions
- ID generator (8-char URL-safe nanoid)
- Hash helper (SHA-256 for IP hashing)
- Client-side photo compression (canvas, 2048px max, JPEG q80)
- Single-column 700px-max responsive UI shell
- `/d/[id]` SSR result page + `/example` static page + `/+error.svelte` 404/error page
- Cost-control middleware in the API endpoint
- Vitest + Playwright configs

**New for Appliance Troubleshooter:**
1. **Reference data module** (`src/lib/referenceData.ts`) — hand-curated failure-mode table + pure-function selector.
2. **Appliance system prompt** (`src/lib/prompt.ts`) — different content; same builder shape.
3. **`ApplianceDiagnosisResult` schema** (`src/lib/schema.ts`) — new structure; parser remains generic over the schema type.
4. **Capture page additions** — two new optional fields (model/serial, error code) below the existing textarea.
5. **Result page rewrite** — same single-column shell, different section layout (appliance card → primary with rationale → call-pro callout when applicable → DIY steps with difficulty pills → parts list → alternatives → what would change my mind → footer + CTA).
6. **Quality fixture manifest** — appliance-specific fixtures (~20–25), schema extended with optional `errorCode` field per fixture.

### What's deliberately not here

- **No DB** (KV covers v1 needs)
- **No accounts** (same as Plant Doctor)
- **No persisted photos by default** (sent to OpenRouter, dropped after response; canvas re-encoding strips EXIF before upload)
- **No shared library with Plant Doctor** — two instances are too few to justify a shared package. Code reuse via copy-paste at bootstrap. Revisit after instance #3 or #4.

### Unit boundaries

Same boundaries as Plant Doctor:
- Frontend → typed `ApplianceDiagnosisResult` against a stubbed API
- LLM module → one function: `diagnose(photo, freeformText, modelField, errorCode) → ApplianceDiagnosisResult`, testable with fixtures
- Storage module → `{ save(result) → id, load(id) → result | null }`, KV-mock-able
- Cost-control wrappers → pure functions over KV state
- Reference data → pure function `selectRelevantModes(categoryHint, errorCode) → FailureMode[]`, no I/O

## Data Flow

### Capture flow

1. User selects a photo (mobile rear camera via `capture="environment"`; desktop file picker / drag-drop / paste)
2. Frontend compresses to max 2048px JPEG q80, target <2MB
3. User fills:
   - **Freeform text** (`<textarea>`, 2000 char cap, placeholder: `"What's it doing? When did it start?"`) — strongly encouraged but not strictly required
   - **Make / model / serial** (`<input type="text">`, 200 char cap, placeholder: `"Whirlpool WDT780SAEM or just the model sticker"`) — optional
   - **Error code** (`<input type="text">`, 50 char cap, placeholder: `"e.g. LE, F21, dE"`, monospace font) — optional
4. Turnstile validates the request
5. Submit → `POST /api/diagnose` (multipart: photo + text + modelField + errorCode + turnstileToken)

### Server-side `/api/diagnose`

1. Verify Turnstile token → 401 on failure
2. Per-IP hourly rate-limit check (default 10/hour, KV-backed sliding window) → 429 with `Retry-After`
3. Per-IP daily cap check (default 50/day) → 429
4. Global daily budget check (default `DAILY_BUDGET_CENTS=1000`) → 503
5. Validate input bounds:
   - `photo`: ≤4MB raw (browser-compresses to <2MB but accept some slop)
   - `text`: ≤2000 chars
   - `modelField`: ≤200 chars
   - `errorCode`: ≤50 chars
   - MIME type: JPEG / PNG / WebP
6. Derive `categoryHint` heuristically: scan `text` + `modelField` for category keywords (dishwasher, washing machine, dryer, etc.); fall back to `'unknown'`.
7. Call `selectRelevantModes(categoryHint, errorCode)` to filter the reference data.
8. Build OpenRouter request: system prompt (appliance instructions + filtered reference data + JSON schema) + user content (photo as base64 data URL + structured optional fields + freeform text).
9. Call OpenRouter with the configured model and `response_format: { type: 'json_object' }`.
10. Parse response (fence stripping → JSON extraction → Zod validation against `ApplianceDiagnosisResultSchema`).
11. On schema failure: retry once with reinforced "return ONLY JSON" prefix; on second failure return 500.
12. Increment global daily budget counter (actual cost from response usage, fallback to estimate).
13. Generate 8-char nanoid; save `{ result, createdAt, model }` to `DIAGNOSES` KV (90-day TTL).
14. Return `{ id, result }`.

### Result flow

1. `/d/[id]` SSR loader fetches from KV; 404 if not found / expired.
2. Renders the appliance result layout (see UI section).
3. "Diagnose another appliance" CTA → `/`.

### Data model

```ts
type ApplianceCategory = 'dishwasher' | 'washer' | 'dryer' | 'refrigerator' | 'oven' | 'other';

type Appliance = {
  category: ApplianceCategory;
  make: string | null;             // "Whirlpool"
  model: string | null;            // "WDT780SAEM"
  confidence: number;              // 0.0–1.0
};

type RecoveryStep = {
  action: string;                  // "Disconnect power at the breaker"
  difficulty: 'easy' | 'moderate' | 'advanced';
};

type Recovery = {
  diy: RecoveryStep[];             // ordered DIY steps
  callPro: boolean;                // true = stop, call a service tech
  proReason?: string;              // safety / specialty tool / warranty
};

type Part = {
  name: string;                    // "Drain pump assembly"
  partNumber?: string;             // "W10348269" if a standard one exists
  typicalCostUsd?: string;         // "$45–80" — range, never exact
};

type PrimaryDiagnosis = {
  name: string;                    // "Drain pump failure"
  confidence: number;
  rationale: string;               // evidence-cited
  recovery: Recovery;
  parts: Part[];                   // empty if none needed
};

type AlternativeDiagnosis = {
  name: string;
  confidence: number;              // < primary.confidence
  rationale: string;
};

type ApplianceDiagnosisResult = {
  appliance: Appliance | null;
  primary: PrimaryDiagnosis;
  alternatives: AlternativeDiagnosis[];
  whatWouldChangeMyMind: string[]; // 1–3 cheap checks
  meta: {
    model: string;                 // OpenRouter model identifier
    createdAt: string;             // ISO 8601
  };
};

type StoredDiagnosis = {
  result: ApplianceDiagnosisResult;
  createdAt: string;
};
```

### KV keys

Same prefix scheme as Plant Doctor (separate KV namespace per Worker):

| Key pattern | Value | TTL |
|---|---|---|
| `diag:<id>` | `StoredDiagnosis` | 90 days |
| `rl:<sha256(ip)>:<hour>` | request count | 2 hours |
| `daily:<sha256(ip)>:<date>` | request count | 48 hours |
| `budget:<date>` | cents spent today | 48 hours |

## LLM Prompt Design

### System prompt (final wording iterated during build)

```
You are an expert appliance-repair technician diagnosing home
appliances from photos and user-provided context. You combine
appliance repair knowledge with disciplined uncertainty and safety-
first recommendations.

You receive: one photo of the appliance or its damaged area, plus
optional freeform text, optional make/model/serial, and optional
error code from the display.

Reference (top failure modes for related appliances):
<injected: result of selectRelevantModes(categoryHint, errorCode)>

Produce a JSON object matching this schema:
  <ApplianceDiagnosisResult schema inline>

Rules:

1. Identify the appliance category (dishwasher, washer, dryer,
   refrigerator, oven, other). If certain, fill make + model. If
   unsure, set make/model to null. Confidence honest.

2. Every rationale must cite visible evidence from the photo OR the
   user-provided fields ("error code LE suggests drain pump...").
   Not generic descriptions.

3. Each DIY step has a difficulty:
   - 'easy': no tools / under 10 minutes / no disassembly
   - 'moderate': basic tools / 30–60 minutes / partial disassembly
   - 'advanced': specialty tools or significant disassembly

4. callPro MUST be true when:
   - Gas appliances (gas range, gas dryer) and the suspected fault
     involves gas lines, valves, or igniters
   - Sealed refrigeration system (compressor, sealed refrigerant
     lines)
   - Active electrical hazard (visible burning, exposed wires, water
     near energized components)
   - Diagnosis confidence below 0.5 AND the failure involves a major
     component (motor, control board, sealed system)
   Provide proReason explaining why.

5. parts: list replacement parts only if the primary diagnosis
   requires them. Include partNumber ONLY if you are confident the
   standard part number for the named make/model is X — DO NOT
   hallucinate part numbers. typicalCostUsd is a range
   ("$45–80"), never a single number.

6. Provide 1–2 alternative diagnoses with confidence below the
   primary, or [] if none.

7. whatWouldChangeMyMind: 1–3 cheap checks the user can do to
   confirm/refute the primary diagnosis (e.g. "Open the drain pump
   filter — if heavily clogged, diagnosis shifts to clogged drain").

8. Safety: NEVER recommend bypassing safety interlocks, working on
   energized circuits, or disassembling sealed refrigeration
   systems. If any DIY step would involve these, set callPro: true
   and exclude that step.

9. Tone: direct, no padding. Write for someone who wants to act.

10. Output ONLY the JSON object, no prose around it.
```

### User message structure

```
[image attachment]

User-provided context:
- Freeform: <text>  OR  "no additional context"
- Make/model/serial: <value>  OR  "not provided"
- Error code: <value>  OR  "not provided"

Diagnose this appliance. Return only the JSON object matching the schema.
```

### Structured-output enforcement

Same as Plant Doctor:
- Request JSON mode via OpenRouter (`response_format: { type: 'json_object' }` where supported)
- Server-side Zod validation against `ApplianceDiagnosisResultSchema`
- On failure: one retry with reinforced "return ONLY a JSON object with these exact keys" prefix
- On second failure: 500 to client

### Model-specific quirks

Inherited from Plant Doctor's parser:
- Qwen2.5-VL: occasional trailing prose → balanced-brace extractor
- Gemini Flash: markdown code fences → strip
- Claude: clean JSON, no special handling

### Per-request budget

- `max_tokens: 2000` (Plant Doctor used 1500; the appliance schema is richer — parts list, DIY/pro structure, more rationale per diagnosis — so output tokens are higher)
- Input bounded by client-side compression (<2MB photo) + 2000-char text + 250 chars across two optional fields + reference data injection (~300–2,250 tokens depending on filter results)
- Reserve estimate per request: 30 cents (same as Plant Doctor — refined post-launch based on actual spend telemetry)

## UI

### Layout principle

Same as Plant Doctor: single column, max-width ~700px, mobile-first. Justified by the same dominant use case (diagnosis happens at the appliance, on a phone).

### Capture page (`/`)

```
Plant Doctor → Appliance Troubleshooter

[Tagline: "Photo + a few words. Get an appliance diagnosis."]

[Photo drop zone / preview thumbnail]

[Freeform textarea: "What's it doing? When did it start?"]

[Optional: Make / model / serial]
[Optional: Error code on display]

[Turnstile widget]

[Submit button — "Diagnose"]

[See an example diagnosis →]
```

The two optional fields are visually de-emphasized (smaller labels, `(optional)` hint inline) so the form doesn't feel heavier than Plant Doctor's.

### Result page (`/d/[id]`)

Sections, top to bottom:

1. **Header** — back link "← Appliance Troubleshooter"
2. **Appliance card** — category label + make/model headline + confidence. If `appliance: null`, render "Couldn't identify the specific make/model — diagnosis is based on visible failure symptoms" in place of the card.
3. **Primary diagnosis card** — accent-bordered, with name + confidence headline + evidence-cited rationale.
4. **Call-pro callout** (amber/orange banner) — only when `callPro: true`, with the `proReason` text prominent. When `callPro: false` but DIY step 1 is a critical safety preface, render a smaller advisory callout instead.
5. **DIY steps** — numbered ordered list, each step with a small inline difficulty pill (`easy` = green, `moderate` = amber, `advanced` = red).
6. **Parts list** — name + monospace part number + cost range. Whole section omitted when `parts: []`.
7. **Alternatives** — lightweight list, name + confidence + short rationale. Omitted when empty.
8. **What would change my mind** — bulleted checks.
9. **Footer** — model identifier + ISO date + share/copy-link button.
10. **CTA** — "Diagnose another appliance" → `/`.

### Empty / edge states

- `appliance: null` → narrative summary in place of the card (see above).
- `parts: []` → omit parts section.
- `callPro: true` → DIY steps still shown but framed as "what a technician will likely do — here's so you can sanity-check the quoted repair" (avoid hiding info; the user can still verify the diagnosis by reading).
- Out-of-scope subject (not an appliance, irreparable damage) → LLM's safety-rule output renders in the primary slot.

## Reference Data

The new differentiator vs Plant Doctor's LLM-only v1 approach.

### Source-of-truth file

`src/lib/referenceData.ts` — single TypeScript file, pure data + a pure selector function. No DB, no CMS, no external content fetch.

### Entry shape

```ts
type FailureMode = {
  category: 'dishwasher' | 'washer' | 'dryer' | 'refrigerator' | 'oven';
  name: string;                    // "Drain pump failure"
  symptoms: string[];              // 1–3 short symptom strings
  errorCodePatterns?: string[];    // brand-agnostic codes that map: ["LE", "Le", "5E", "OE"]
  diyDifficulty: 'easy' | 'moderate' | 'advanced';
  callProIf?: string;              // condition under which a pro is required
  typicalParts?: string[];
};
```

### Selector

```ts
function selectRelevantModes(
  categoryHint: FailureMode['category'] | 'unknown',
  errorCode: string | null
): FailureMode[] {
  // Tier 1: exact error-code match → return only matching modes
  // Tier 2: category filter → return that category's modes
  // Tier 3: fall through → return all modes (~75 entries)
}
```

Note the enum split: `FailureMode['category']` covers the 5 known categories (dishwasher / washer / dryer / refrigerator / oven). `Appliance['category']` in the result schema additionally allows `'other'`. When deriving `categoryHint` for the selector from the LLM's output or user input, map `'other'` → `'unknown'` so we fall through to the all-modes case. This keeps the reference data table focused while letting the result schema gracefully report "this is some other appliance."

### Seeding (v1)

50–75 hand-written entries across the 5 categories. Sources:
- iFixit's "common problems" pages per appliance category (CC-licensed reference content)
- Manufacturer service-manual top-failure tables (factual statements, not copyrighted prose)
- r/fixit threads on recurring failure modes

Each entry takes ~3 minutes to write once the source is open. Total seeding effort: 4–6 hours.

### Growth

Add an entry whenever the quality runner flags a misdiagnosis on a fixture that the existing reference set should have caught. Slow, evidence-driven. Target: ~150 entries by 6 months post-launch.

### Validation

Unit test in `tests/unit/referenceData.test.ts`:
- Every entry has required fields filled
- Every `errorCodePatterns` entry is upper/lowercase-normalized
- Warn (not fail) if an error code appears in >3 unrelated diagnoses (curation hygiene)
- Every `category` value is in the enum

### Token-budget impact

- Average entry ≈ 30 tokens
- Worst case (~75 entries injected): ~2,250 tokens of system-prompt context
- Typical filtered case (one category, ~10–15 entries): ~300–450 tokens

Within `max_tokens` and per-request budget limits.

## Cost Controls

Inherited verbatim from Plant Doctor. Defaults:

| Variable | Default | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | (required) | API auth |
| `OPENROUTER_MODEL` | `qwen/qwen-2.5-vl-72b-instruct` | Model selection |
| `DAILY_BUDGET_CENTS` | `1000` | Global daily cap |
| `RATE_LIMIT_PER_HOUR` | `10` | Per-IP hourly cap |
| `DAILY_CAP_PER_IP` | `50` | Per-IP daily cap |
| `MAX_OUTPUT_TOKENS` | `2000` | LLM output bound (raised from 1500 — richer schema) |
| `TURNSTILE_SITE_KEY` | (required, in `.env`) | Captcha site key (build-time) |
| `TURNSTILE_SECRET_KEY` | (required, as secret) | Captcha verification |

Reserve estimate per request: 30 cents (matches Plant Doctor; refine after the first week of telemetry).

Monitoring: same minimal approach — Cloudflare Worker logs + `wrangler tail` for first 1–2 weeks. Photo bytes never logged.

## Error Handling

Same error taxonomy as Plant Doctor (`turnstile_failed`, `rate_limited`, `daily_cap_per_ip`, `budget_exhausted`, `photo_too_large`, `photo_unsupported_format`, `text_too_long`, `llm_error`, `schema_error`, `internal_error`). Same user-facing messages.

Two new validation cases:
- `modelField` > 200 chars → 400 with message "Model field is too long. Trim it down."
- `errorCode` > 50 chars → 400 with message "Error code is too long. Just the code (e.g. LE, F21)."

The result page handles the same 404 + 500 cases as Plant Doctor.

## Testing

### Unit (Vitest)

Reuse from Plant Doctor (rename "Plant Doctor"-specific strings):
- Parser tests + fixtures (the parser is generic over schema type; new fixtures cover the appliance schema)
- Cost estimator + per-model rate table
- ID generation
- Hash helper
- Storage module (save/load against KV mock)
- Rate-limit module
- Daily cap module
- Budget cap module
- Turnstile verification
- Prompt builder (appliance system prompt — verify required strings present)

New unit tests:
- `tests/unit/schema.test.ts` — valid `ApplianceDiagnosisResult`, `appliance: null`, `parts: []`, `callPro: true` paths, confidence-bound rejection
- `tests/unit/referenceData.test.ts` — `selectRelevantModes` tier 1/2/3, manifest validation rules

### Integration (Vitest with mocks)

- `tests/integration/diagnose.test.ts` — full pipeline, mock OpenRouter, verify reference data injection picks correct entries for an error code, verify retry-on-schema-failure
- `tests/integration/api-diagnose.test.ts` — POST endpoint with cost-control chain, two new optional fields forwarded into the prompt, length caps reject oversize input

### E2E (Playwright, reuse slop-plant-doctor's config)

- Capture page renders (with the two new optional fields)
- Static example page renders an appliance diagnosis
- Non-existent `/d/[id]` renders the error page

### LLM output quality (manual runner)

- ~20–25 fixtures, 4–5 per category. Each fixture: `{ id, file, freeformText, modelField?, errorCode?, expected: { category, primaryCategory, primaryCategoryAlternatives?, callPro? } }`.
- Coverage targets per category (representative top failure modes):
  - Dishwasher: drain pump, door latch, control board, heating element
  - Washer: drain pump, lid switch, drive belt, drum bearing
  - Dryer: heating element, drum belt, thermal fuse, lint-restriction
  - Refrigerator: compressor (callPro), defrost heater, door seal, ice maker
  - Oven: igniter, thermostat, broil element, gas line (callPro)
- Fixture-prep rules (same hygiene as Plant Doctor): neutral filenames, crop out manufacturer logos / model stickers visible in the photo that would leak the answer (only when the fixture is testing pure visual diagnosis; fixtures testing "with model field provided" should keep the sticker), neutral freeform text without diagnostic guesses.
- Scoring: category match, primary-diagnosis category match (against expected + aliases), `callPro` correctness for safety-critical fixtures.

### Reusable from slop-plant-doctor

- Vitest config
- Playwright config
- KV mock helper
- General test scaffolding

### Explicitly not in v1

- Real-time CI runs against OpenRouter (cost-prohibitive)
- Cross-browser testing beyond modern evergreens (dogfood Safari iOS specifically for camera input)
- Synthetic appliance-photo generation

## Monetization (deferred, design leaves doors open)

v1 has no monetization. Architecture leaves room for:
- **Affiliate links on parts** — data model already supports `partNumber` + `typicalCostUsd`. v2 wires those to Repair Clinic / eBay / Amazon affiliate URLs. Per the spec's business angle, parts affiliate is a meaningful revenue line for this vertical.
- **Pro tier with appliance history** — v2 freemium ($5–10/mo, anonymous device-bound at first, accounts later)
- **B2B angle** — home-warranty insurers paying to reduce service-call volume (v3+, requires sales / partnership work, not code)

Realistic staged path:
- **v1.5** (~1–2 mo post-launch): affiliate links on parts list
- **v2** (~3–6 mo): Pro tier with appliance history + memory ("you had this issue with this dishwasher 4 months ago, here's what fixed it")
- **v3+** (if signal exists): white-label / API for warranty companies, integration with parts suppliers (Repair Clinic) for real-time pricing

## Open Questions

Deferred to implementation time, not blockers:

1. **What's the right category-hint heuristic?** Looking for category keywords in freeform text + modelField may miss edge cases (e.g., user types "the thing in the kitchen that washes plates"). Worst case: fall through to `'unknown'` and inject all reference data; LLM filters. Implementation phase will iterate on this if quality testing flags it.
2. **Should `partNumber` be looked up via an external service?** Currently the LLM is asked NOT to hallucinate part numbers. The risk is that without lookups, real numbers may not appear for many diagnoses. v2 work: integrate a parts catalog. v1 acceptable result: `partNumber` is omitted often; user can search by part name.
3. **Should error-code patterns be brand-specific (e.g. `"Whirlpool:F21"` vs just `"F21"`)?** Currently entries store brand-agnostic codes. Brand-specific would be more precise but ~doubles the table size. v1 stays brand-agnostic; iterate post-launch if confusion arises.
4. **Quality threshold for launch:** set after running the fixture set (e.g. "category match ≥90% AND primary-diagnosis category match ≥75% AND callPro correctness ≥95% on safety-critical fixtures").
5. **Photo-thumbnail storage** — same open question as Plant Doctor (privacy vs shared-link context). Default: no thumbnail. Revisit at implementation.

## Stack Reference

| Layer | Tech | Notes |
|---|---|---|
| Frontend | SvelteKit (Svelte 5) + TypeScript | Same as Plant Doctor |
| Hosting | Cloudflare Workers + Static Assets | Same |
| API | SvelteKit route handlers inside the Worker | Same |
| Storage | Cloudflare KV (`DIAGNOSES` namespace) | New namespace per Worker |
| Captcha | Cloudflare Turnstile | Same |
| LLM | OpenRouter | Same |
| Default model | `qwen/qwen-2.5-vl-72b-instruct` | Same; env-swappable |
| Schema validation | Zod | Same |
| Testing | Vitest + Playwright | Reuse slop-plant-doctor configs |
| Compression (client) | canvas + JPEG encode | Same |
| Dev | `wrangler dev` (or `npm run dev` for fast iteration with stubbed platform) | Same |

## Estimated Effort

3–4 weeks for v1 working prototype (vs Plant Doctor's 3–5 weeks; faster because most modules copy-paste):

- **Week 1**: Bootstrap repo, copy reusable modules from slop-plant-doctor, customize schema + types + prompt builder + reference data table seeding.
- **Week 2**: Implement diagnose pipeline + API endpoint with the two new fields + reference data injection logic + tests.
- **Week 3**: Capture page + result page UI customization (appliance card, DIY/pro callout, difficulty pills, parts list) + example page + Playwright tests.
- **Week 4**: Quality fixture set curation + manual quality runs + prompt iteration + reference data growth + launch prep (KV namespace, Worker secrets, deploy, smoke test).

Curation of reference data + quality fixtures is the bottleneck. If prior knowledge of appliance failure modes is shallow, allow extra time for sourcing material from iFixit + service manuals.
