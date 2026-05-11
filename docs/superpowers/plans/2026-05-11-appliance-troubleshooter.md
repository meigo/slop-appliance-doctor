# Appliance Troubleshooter v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Appliance Troubleshooter v1 — a public, free, mobile-first web app that diagnoses sick home appliances from a photo + optional context (freeform text, model/serial, error code), returning structured JSON with appliance ID, ranked diagnoses, DIY/pro recovery split, difficulty levels, parts list, alternatives, and verification checks.

**Architecture:** Second instance of the Vision-LLM as Ambient Domain Expert pattern. Heavy reuse from `~/Projects/slop/slop-plant-doctor/` (the deployed reference implementation): same SvelteKit-on-Cloudflare-Workers stack, same cost-control wrappers, same KV storage pattern, same OpenRouter client, same UI shell, same deploy flow (`wrangler deploy`). New work limited to: new schema, new prompt with safety rules, hand-curated reference-data module, two added capture fields, different result-page render.

**Tech Stack:** SvelteKit (Svelte 5) + TypeScript, `@sveltejs/adapter-cloudflare` v7+, Cloudflare Workers + Static Assets + KV + Turnstile, OpenRouter (default `qwen/qwen-2.5-vl-72b-instruct`), Zod, nanoid, Vitest (+ happy-dom + @testing-library/svelte), Playwright.

**Spec reference:** `slop-ideas/docs/superpowers/specs/2026-05-11-appliance-troubleshooter-design.md`

**Reference implementation to copy from:** `~/Projects/slop/slop-plant-doctor/`

**Naming convention:** types and Zod schemas keep the same exported names as Plant Doctor (`DiagnosisResult`, `DiagnosisResultSchema`) but their shape is different in this repo. This minimizes import-site churn while keeping the per-app schemas independent.

**Working directory note:**
- **Task 1** runs from `~/Projects/slop/`.
- **Tasks 2+** run inside `~/Projects/slop/slop-appliance-doctor/`.

---

## File Structure (target)

```
slop-appliance-doctor/                          # everything copy-from-slop-plant-doctor unless flagged NEW or CHANGED
  package.json                                  CHANGED (name)
  tsconfig.json
  svelte.config.js
  vite.config.ts
  wrangler.toml                                 CHANGED (name + Worker-specific bits)
  playwright.config.ts
  .gitignore
  .dev.vars                                     CHANGED (placeholder values for new app)
  .dev.vars.example                             CHANGED (placeholder values)
  .env.example                                  CHANGED (placeholder values)
  README.md                                     CHANGED (new content)
  docs/superpowers/
    specs/2026-05-11-appliance-troubleshooter-design.md   NEW (copy from slop-ideas)
    plans/2026-05-11-appliance-troubleshooter.md          NEW (copy from slop-ideas)
  src/
    app.html
    app.d.ts
    app.css
    lib/
      types.ts                                  CHANGED (ApplianceDiagnosisResult shape)
      schema.ts                                 CHANGED (Zod for appliance schema)
      errors.ts                                 (verbatim — same 10 codes)
      id.ts                                     (verbatim)
      hash.ts                                   (verbatim)
      parser.ts                                 (verbatim — generic over schema name)
      cost.ts                                   (verbatim — same rate table)
      storage.ts                                (verbatim — generic over result type)
      rateLimit.ts                              (verbatim)
      dailyCap.ts                               (verbatim)
      budget.ts                                 (verbatim)
      turnstile.ts                              (verbatim)
      prompt.ts                                 CHANGED (appliance system prompt)
      openrouter.ts                             (verbatim)
      diagnose.ts                               (verbatim — name swap only)
      photoCompress.ts                          (verbatim)
      referenceData.ts                          NEW
    routes/
      +layout.svelte                            (verbatim)
      +error.svelte                             (verbatim — uses page.status generically)
      +page.svelte                              CHANGED (capture form + two new fields)
      d/[id]/
        +page.svelte                            CHANGED (appliance result render)
        +page.server.ts                         (verbatim — generic over result type)
      example/
        +page.svelte                            CHANGED (appliance example)
      api/diagnose/
        +server.ts                              CHANGED (handle new fields + reference-data injection)
  static/
    favicon.svg                                 (verbatim or new)
  tests/
    setup.ts                                    (verbatim)
    unit/
      schema.test.ts                            CHANGED (appliance schema tests)
      id.test.ts                                (verbatim)
      parser.test.ts                            CHANGED (new fixtures for appliance schema)
      cost.test.ts                              (verbatim)
      storage.test.ts                           CHANGED (sample data is an appliance result now)
      rateLimit.test.ts                         (verbatim)
      dailyCap.test.ts                          (verbatim)
      budget.test.ts                            (verbatim)
      turnstile.test.ts                         (verbatim)
      prompt.test.ts                            CHANGED (appliance prompt tests)
      openrouter.test.ts                        (verbatim)
      hash.test.ts                              (verbatim)
      referenceData.test.ts                     NEW
    integration/
      diagnose.test.ts                          CHANGED (appliance pipeline)
      api-diagnose.test.ts                      CHANGED (new fields)
    e2e/
      happy-path.spec.ts                        CHANGED (appliance UI strings)
    fixtures/
      llm-responses/
        appliance-clean.json                    NEW
        appliance-trailing-prose.txt            NEW
        appliance-fenced.txt                    NEW
        appliance-invalid-schema.txt            NEW
      appliance-photos/
        .gitignore                              NEW
      appliance-photos.manifest.json            NEW
    support/
      kvMock.ts                                 (verbatim)
  scripts/
    quality-run.ts                              CHANGED (appliance schema)
```

---

## Phase 1 — Bootstrap (clone from slop-plant-doctor)

### Task 1: Clone slop-plant-doctor structure into a new repo

**Files:** all of `slop-appliance-doctor/` (created by tooling)

**Working dir:** `~/Projects/slop/`

- [ ] **Step 1: Copy the slop-plant-doctor directory**

```bash
cd ~/Projects/slop
cp -r slop-plant-doctor slop-appliance-doctor
cd slop-appliance-doctor
```

- [ ] **Step 2: Strip transient build/install state and the old git history**

```bash
rm -rf .git node_modules .svelte-kit .wrangler test-results playwright-report
```

- [ ] **Step 3: Strip Plant Doctor-specific docs**

```bash
rm -f docs/superpowers/specs/2026-05-11-plant-doctor-design.md
rm -f docs/superpowers/plans/2026-05-11-plant-doctor.md
```

The Appliance Troubleshooter spec + plan get copied in Task 2.

- [ ] **Step 4: Initialize fresh git**

```bash
git init
```

- [ ] **Step 5: Verify the directory contents look right**

```bash
ls
```

Expected to see `package.json`, `wrangler.toml`, `svelte.config.js`, `src/`, `tests/`, `docs/`, etc. — but no `.git/`, `node_modules/`, `.svelte-kit/`, or `.wrangler/`.

No commit yet — we'll commit after the renames in Task 2.

---

### Task 2: Rename to slop-appliance-doctor; copy spec + plan; first commit

**Files:**
- Modify: `package.json` (name)
- Modify: `wrangler.toml` (name)
- Replace: `README.md`
- Create: `docs/superpowers/specs/2026-05-11-appliance-troubleshooter-design.md` (copy)
- Create: `docs/superpowers/plans/2026-05-11-appliance-troubleshooter.md` (copy)

**Working dir:** `~/Projects/slop/slop-appliance-doctor/`

- [ ] **Step 1: Update `package.json` name**

Find the `"name"` line near the top and change:
```json
"name": "slop-appliance-doctor"
```

Leave version, scripts, deps untouched.

- [ ] **Step 2: Update `wrangler.toml` name**

Change the first line:
```toml
name = "slop-appliance-doctor"
```

Everything else (KV bindings, vars, main path) gets configured in Task 15. The existing values are still Plant Doctor's — that's fine for now, since deploy doesn't happen yet.

- [ ] **Step 3: Replace `README.md`** with a stub (full README in Task 17):

```markdown
# Appliance Troubleshooter

Second instance of the Vision-LLM as Ambient Domain Expert pattern. Diagnoses home appliances from a photo + optional context.

Full README pending Task 17.

Design spec: `docs/superpowers/specs/2026-05-11-appliance-troubleshooter-design.md`
Implementation plan: `docs/superpowers/plans/2026-05-11-appliance-troubleshooter.md`
```

- [ ] **Step 4: Copy the spec + plan from slop-ideas**

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp ../slop-ideas/docs/superpowers/specs/2026-05-11-appliance-troubleshooter-design.md docs/superpowers/specs/
cp ../slop-ideas/docs/superpowers/plans/2026-05-11-appliance-troubleshooter.md docs/superpowers/plans/
```

- [ ] **Step 5: Reset `.dev.vars` to placeholder values** (Plant Doctor's values are still there; tests don't care, but cleanliness):

Replace `.dev.vars` content with:
```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=qwen/qwen-2.5-vl-72b-instruct
DAILY_BUDGET_CENTS=1000
RATE_LIMIT_PER_HOUR=10
DAILY_CAP_PER_IP=50
MAX_OUTPUT_TOKENS=2000
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Note `MAX_OUTPUT_TOKENS=2000` (Plant Doctor's was `1500`).

`.dev.vars.example` should match (it already does — verify).

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

- [ ] **Step 7: Verify everything still builds + tests pass against the unchanged code**

```bash
npm run check
npm run test:unit
```

Both should return clean — the codebase is identical to slop-plant-doctor's at this point.

- [ ] **Step 8: Initial commit**

```bash
git add -A
git commit -m "Initial scaffold cloned from slop-plant-doctor"
```

---

## Phase 2 — Types + Schema

### Task 3: Replace `src/lib/types.ts` with appliance types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Replace the file entirely**

```ts
// Core types for appliance diagnoses.

export type ApplianceCategory =
  | 'dishwasher'
  | 'washer'
  | 'dryer'
  | 'refrigerator'
  | 'oven'
  | 'other';

export type Appliance = {
  category: ApplianceCategory;
  make: string | null;
  model: string | null;
  confidence: number;
};

export type RecoveryStep = {
  action: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
};

export type Recovery = {
  diy: RecoveryStep[];
  callPro: boolean;
  proReason?: string;
};

export type Part = {
  name: string;
  partNumber?: string;
  typicalCostUsd?: string;
};

export type PrimaryDiagnosis = {
  name: string;
  confidence: number;
  rationale: string;
  recovery: Recovery;
  parts: Part[];
};

export type AlternativeDiagnosis = {
  name: string;
  confidence: number;
  rationale: string;
};

// Keep the exported name `DiagnosisResult` — this minimizes import-site churn
// vs slop-plant-doctor while keeping schemas independent.
export type DiagnosisResult = {
  appliance: Appliance | null;
  primary: PrimaryDiagnosis;
  alternatives: AlternativeDiagnosis[];
  whatWouldChangeMyMind: string[];
  meta: {
    model: string;
    createdAt: string;
  };
};

export type StoredDiagnosis = {
  result: DiagnosisResult;
  createdAt: string;
};

// Inherited verbatim from slop-plant-doctor — same 10 codes.
export type ApiErrorCode =
  | 'turnstile_failed'
  | 'rate_limited'
  | 'daily_cap_per_ip'
  | 'budget_exhausted'
  | 'photo_too_large'
  | 'photo_unsupported_format'
  | 'text_too_long'
  | 'llm_error'
  | 'schema_error'
  | 'internal_error';
```

- [ ] **Step 2: Verify type-check fails on consumers that haven't been updated yet**

```bash
npm run check
```

Expected: errors in `src/lib/schema.ts`, `src/lib/diagnose.ts`, `src/routes/d/[id]/+page.svelte`, etc. — because the schema's old `Species` shape doesn't match the new `Appliance` shape. **This is expected** — Tasks 4–8 fix them.

- [ ] **Step 3: Commit the type change (errors will be visible in the diff)**

```bash
git add src/lib/types.ts
git commit -m "Replace types with appliance diagnosis shape"
```

---

### Task 4: Replace `src/lib/schema.ts` with appliance Zod schema (TDD)

**Files:**
- Modify: `src/lib/schema.ts`
- Modify: `tests/unit/schema.test.ts`

- [ ] **Step 1: Replace `tests/unit/schema.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { DiagnosisResultSchema } from '../../src/lib/schema';

describe('DiagnosisResultSchema (appliance)', () => {
  it('parses a minimal valid result', () => {
    const valid = {
      appliance: { category: 'dishwasher', make: 'Whirlpool', model: 'WDT780SAEM', confidence: 0.9 },
      primary: {
        name: 'Drain pump failure',
        confidence: 0.75,
        rationale: 'Standing water in tub after cycle; humming sound from lower area.',
        recovery: {
          diy: [{ action: 'Disconnect power at breaker', difficulty: 'easy' }],
          callPro: false
        },
        parts: []
      },
      alternatives: [],
      whatWouldChangeMyMind: ['Open drain pump filter and check for clogs.'],
      meta: { model: 'qwen/qwen-2.5-vl-72b-instruct', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(valid)).not.toThrow();
  });

  it('accepts appliance: null', () => {
    const data = {
      appliance: null,
      primary: {
        name: 'Electrical fault',
        confidence: 0.5,
        rationale: 'Visible burning on internal wiring.',
        recovery: {
          diy: [],
          callPro: true,
          proReason: 'Active electrical hazard.'
        },
        parts: []
      },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(data)).not.toThrow();
  });

  it('accepts appliance with null make/model (category-only ID)', () => {
    const data = {
      appliance: { category: 'washer', make: null, model: null, confidence: 0.6 },
      primary: {
        name: 'Drum bearing wear',
        confidence: 0.7,
        rationale: 'Loud grinding during spin cycle.',
        recovery: {
          diy: [{ action: 'Inspect spider arm', difficulty: 'advanced' }],
          callPro: false
        },
        parts: [{ name: 'Drum bearing kit', typicalCostUsd: '$80–150' }]
      },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(data)).not.toThrow();
  });

  it('rejects unknown appliance category', () => {
    const bad = {
      appliance: { category: 'toaster', make: null, model: null, confidence: 0.5 },
      primary: { name: 'X', confidence: 0.5, rationale: 'r', recovery: { diy: [], callPro: false }, parts: [] },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(bad)).toThrow();
  });

  it('rejects unknown difficulty', () => {
    const bad = {
      appliance: null,
      primary: {
        name: 'X',
        confidence: 0.5,
        rationale: 'r',
        recovery: {
          diy: [{ action: 'do thing', difficulty: 'extreme' }],
          callPro: false
        },
        parts: []
      },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(bad)).toThrow();
  });

  it('rejects confidence > 1', () => {
    const bad = {
      appliance: { category: 'dryer', make: null, model: null, confidence: 1.2 },
      primary: { name: 'X', confidence: 0.5, rationale: 'r', recovery: { diy: [], callPro: false }, parts: [] },
      alternatives: [],
      whatWouldChangeMyMind: [],
      meta: { model: 'x', createdAt: '2026-05-11T10:00:00Z' }
    };
    expect(() => DiagnosisResultSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (or compiles but mismatches the old schema)**

```bash
npm run test:unit -- schema
```

Expected: most tests FAIL because the schema still has the plant shape.

- [ ] **Step 3: Replace `src/lib/schema.ts`**

```ts
import { z } from 'zod';

const ApplianceCategoryEnum = z.enum(['dishwasher', 'washer', 'dryer', 'refrigerator', 'oven', 'other']);

const ApplianceSchema = z.object({
  category: ApplianceCategoryEnum,
  make: z.string().min(1).nullable(),
  model: z.string().min(1).nullable(),
  confidence: z.number().min(0).max(1)
});

const RecoveryStepSchema = z.object({
  action: z.string().min(1),
  difficulty: z.enum(['easy', 'moderate', 'advanced'])
});

const RecoverySchema = z.object({
  diy: z.array(RecoveryStepSchema),
  callPro: z.boolean(),
  proReason: z.string().optional()
});

const PartSchema = z.object({
  name: z.string().min(1),
  partNumber: z.string().optional(),
  typicalCostUsd: z.string().optional()
});

const PrimaryDiagnosisSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  recovery: RecoverySchema,
  parts: z.array(PartSchema)
});

const AlternativeDiagnosisSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1)
});

export const DiagnosisResultSchema = z.object({
  appliance: ApplianceSchema.nullable(),
  primary: PrimaryDiagnosisSchema,
  alternatives: z.array(AlternativeDiagnosisSchema),
  whatWouldChangeMyMind: z.array(z.string()),
  meta: z.object({
    model: z.string().min(1),
    createdAt: z.string().min(1)
  })
});

export type DiagnosisResultZ = z.infer<typeof DiagnosisResultSchema>;
```

- [ ] **Step 4: Run tests; verify pass**

```bash
npm run test:unit -- schema
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Run full check**

```bash
npm run check
```

Some unrelated errors may still remain (in diagnose.ts, prompt.ts, etc.) — they get fixed in Tasks 6–8.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schema.ts tests/unit/schema.test.ts
git commit -m "Replace Zod schema with appliance diagnosis shape"
```

---

## Phase 3 — Reference Data

### Task 5: Create `src/lib/referenceData.ts` with table + selector (TDD)

**Files:**
- Create: `src/lib/referenceData.ts`
- Create: `tests/unit/referenceData.test.ts`

- [ ] **Step 1: Write the failing test** in `tests/unit/referenceData.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { FAILURE_MODES, selectRelevantModes } from '../../src/lib/referenceData';

describe('FAILURE_MODES', () => {
  it('has at least 30 entries seeded (target ~50–75 at v1 launch)', () => {
    expect(FAILURE_MODES.length).toBeGreaterThanOrEqual(30);
  });

  it('every entry has the required fields', () => {
    for (const m of FAILURE_MODES) {
      expect(m.category).toMatch(/^(dishwasher|washer|dryer|refrigerator|oven)$/);
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.symptoms.length).toBeGreaterThan(0);
      expect(['easy', 'moderate', 'advanced']).toContain(m.diyDifficulty);
    }
  });

  it('error code patterns are uppercase-normalized', () => {
    for (const m of FAILURE_MODES) {
      if (m.errorCodePatterns) {
        for (const p of m.errorCodePatterns) {
          expect(p).toBe(p.toUpperCase());
        }
      }
    }
  });
});

describe('selectRelevantModes', () => {
  it('tier 1: errorCode exact match returns only matching entries', () => {
    // Seed should include a known LE pattern for dishwasher and/or washer (drain pump).
    const result = selectRelevantModes('unknown', 'LE');
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.errorCodePatterns?.map(p => p.toUpperCase())).toContain('LE');
    }
  });

  it('tier 1 is case-insensitive on user input', () => {
    const upper = selectRelevantModes('unknown', 'LE');
    const lower = selectRelevantModes('unknown', 'le');
    expect(upper.length).toBe(lower.length);
  });

  it('tier 2: categoryHint returns that category', () => {
    const result = selectRelevantModes('dishwasher', null);
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.category).toBe('dishwasher');
    }
  });

  it('tier 3: unknown + no errorCode returns all modes', () => {
    const result = selectRelevantModes('unknown', null);
    expect(result.length).toBe(FAILURE_MODES.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (module not found)**

```bash
npm run test:unit -- referenceData
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/referenceData.ts`** with the type, selector, and seeded entries

This is a content-heavy task. Write the file with **at least 30 entries** seeded across the 5 categories, with error-code patterns sourced from common-knowledge fault codes (LE/Le for LG drain, F21 for Whirlpool drain, etc.). Each entry takes ~3 minutes to draft once you have references handy.

```ts
export type FailureMode = {
  category: 'dishwasher' | 'washer' | 'dryer' | 'refrigerator' | 'oven';
  name: string;
  symptoms: string[];
  errorCodePatterns?: string[];
  diyDifficulty: 'easy' | 'moderate' | 'advanced';
  callProIf?: string;
  typicalParts?: string[];
};

export const FAILURE_MODES: FailureMode[] = [
  // === DISHWASHER (target ~10 entries) ===
  {
    category: 'dishwasher',
    name: 'Drain pump failure',
    symptoms: [
      'standing water in tub after cycle',
      'humming or buzzing from lower area during drain phase'
    ],
    errorCodePatterns: ['LE', 'OE', 'F21', '5E'],
    diyDifficulty: 'moderate',
    typicalParts: ['drain pump assembly']
  },
  {
    category: 'dishwasher',
    name: 'Door latch / interlock failure',
    symptoms: [
      'cycle will not start',
      'control panel lights but pumps are silent'
    ],
    errorCodePatterns: ['F02', 'DE', 'DO'],
    diyDifficulty: 'easy',
    typicalParts: ['door latch assembly', 'door switch']
  },
  {
    category: 'dishwasher',
    name: 'Clogged drain hose or air gap',
    symptoms: [
      'standing water in tub but pump runs',
      'water backs up into sink during cycle'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['drain hose']
  },
  {
    category: 'dishwasher',
    name: 'Heating element failure',
    symptoms: [
      'dishes not drying',
      'water not heating during wash cycle'
    ],
    errorCodePatterns: ['F22', 'HE'],
    diyDifficulty: 'moderate',
    typicalParts: ['heating element']
  },
  {
    category: 'dishwasher',
    name: 'Spray arm clog or break',
    symptoms: [
      'top rack dishes still dirty after cycle',
      'visibly damaged or stuck spray arm'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['spray arm assembly']
  },
  {
    category: 'dishwasher',
    name: 'Control board fault',
    symptoms: [
      'no response to button presses',
      'erratic cycle behavior',
      'all indicator lights blinking'
    ],
    errorCodePatterns: ['F01', 'CE'],
    diyDifficulty: 'advanced',
    callProIf: 'confidence is low or board is sealed unit',
    typicalParts: ['main control board']
  },
  {
    category: 'dishwasher',
    name: 'Inlet valve failure',
    symptoms: [
      'no water entering tub',
      'water hammer sound at start of cycle'
    ],
    errorCodePatterns: ['F03', 'IE'],
    diyDifficulty: 'moderate',
    typicalParts: ['water inlet valve']
  },

  // === WASHER (target ~10 entries) ===
  {
    category: 'washer',
    name: 'Drain pump failure',
    symptoms: [
      'water remains in drum after cycle',
      'humming noise from base during drain phase',
      'will not advance to spin cycle'
    ],
    errorCodePatterns: ['LE', 'OE', '5E', 'F21', 'NF'],
    diyDifficulty: 'moderate',
    typicalParts: ['drain pump assembly']
  },
  {
    category: 'washer',
    name: 'Lid or door switch failure',
    symptoms: [
      'will not start when lid/door closed',
      'spin cycle will not engage'
    ],
    errorCodePatterns: ['DL', 'F02', 'DE'],
    diyDifficulty: 'easy',
    typicalParts: ['lid switch', 'door lock assembly']
  },
  {
    category: 'washer',
    name: 'Drive belt slipping or broken',
    symptoms: [
      'motor runs but drum does not turn',
      'rubber smell during spin cycle'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['drive belt']
  },
  {
    category: 'washer',
    name: 'Drum bearing wear',
    symptoms: [
      'loud grinding or roaring during spin',
      'visible drum play when pushed',
      'wet bearing area underneath'
    ],
    diyDifficulty: 'advanced',
    callProIf: 'requires tub removal and spider replacement',
    typicalParts: ['drum bearing kit', 'tub seal']
  },
  {
    category: 'washer',
    name: 'Inlet valve or hose failure',
    symptoms: [
      'no water filling',
      'leaking from rear of machine'
    ],
    errorCodePatterns: ['F08', 'IE'],
    diyDifficulty: 'easy',
    typicalParts: ['inlet valve', 'fill hose']
  },
  {
    category: 'washer',
    name: 'Out-of-balance / suspension failure',
    symptoms: [
      'machine walks across floor during spin',
      'loud banging during spin cycle'
    ],
    errorCodePatterns: ['UE', 'UB'],
    diyDifficulty: 'moderate',
    typicalParts: ['suspension rods', 'shock absorbers']
  },
  {
    category: 'washer',
    name: 'Motor coupler failure (top-load direct-drive)',
    symptoms: [
      'motor runs but no agitation',
      'plastic fragments visible under machine'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['motor coupler']
  },

  // === DRYER (target ~10 entries) ===
  {
    category: 'dryer',
    name: 'Heating element failure',
    symptoms: [
      'drum turns but no heat',
      'clothes still wet after full cycle'
    ],
    errorCodePatterns: ['F01', 'HE'],
    diyDifficulty: 'moderate',
    typicalParts: ['heating element']
  },
  {
    category: 'dryer',
    name: 'Thermal fuse blown',
    symptoms: [
      'no heat suddenly after working fine',
      'dryer runs but cold'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['thermal fuse']
  },
  {
    category: 'dryer',
    name: 'Drive belt broken',
    symptoms: [
      'motor hums but drum does not turn',
      'drum spins freely by hand with no resistance'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['drive belt']
  },
  {
    category: 'dryer',
    name: 'Lint or vent restriction',
    symptoms: [
      'clothes take multiple cycles to dry',
      'dryer hot to the touch externally',
      'lint accumulation around door seal'
    ],
    diyDifficulty: 'easy',
    typicalParts: []
  },
  {
    category: 'dryer',
    name: 'Idler pulley wear',
    symptoms: [
      'loud squealing during operation',
      'thumping noise from drum area'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['idler pulley', 'drive belt']
  },
  {
    category: 'dryer',
    name: 'Door switch failure',
    symptoms: [
      'dryer will not start',
      'works only when door held closed in specific way'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['door switch']
  },
  {
    category: 'dryer',
    name: 'Gas valve or igniter failure (gas dryer)',
    symptoms: [
      'drum turns but no heat (gas dryer)',
      'clicking sound but no ignition'
    ],
    diyDifficulty: 'advanced',
    callProIf: 'gas appliance — gas line work required',
    typicalParts: ['gas valve solenoid kit', 'igniter']
  },

  // === REFRIGERATOR (target ~10 entries; many lean callPro) ===
  {
    category: 'refrigerator',
    name: 'Defrost heater failure',
    symptoms: [
      'frost buildup on rear of freezer compartment',
      'fridge section warm while freezer works'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['defrost heater', 'defrost thermostat']
  },
  {
    category: 'refrigerator',
    name: 'Door seal (gasket) failure',
    symptoms: [
      'visible gaps in door seal',
      'condensation around door edges',
      'compressor runs constantly'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['door gasket']
  },
  {
    category: 'refrigerator',
    name: 'Ice maker fault',
    symptoms: [
      'ice maker not producing ice',
      'water line frozen',
      'ice cubes hollow or undersized'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['ice maker assembly', 'water inlet valve']
  },
  {
    category: 'refrigerator',
    name: 'Evaporator fan failure',
    symptoms: [
      'fridge warm, freezer cold but not very cold',
      'no fan noise when door opened'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['evaporator fan motor']
  },
  {
    category: 'refrigerator',
    name: 'Compressor or sealed system failure',
    symptoms: [
      'both fridge and freezer warm',
      'compressor running but no cooling',
      'visible oil residue at fittings'
    ],
    diyDifficulty: 'advanced',
    callProIf: 'sealed refrigeration system — requires EPA certification',
    typicalParts: ['compressor (pro install)']
  },
  {
    category: 'refrigerator',
    name: 'Condenser coil dirty',
    symptoms: [
      'compressor runs constantly',
      'higher than normal temperatures'
    ],
    diyDifficulty: 'easy',
    typicalParts: []
  },
  {
    category: 'refrigerator',
    name: 'Drain tube clogged (water pooling)',
    symptoms: [
      'water collecting at bottom of fridge',
      'ice buildup in freezer floor'
    ],
    diyDifficulty: 'easy',
    typicalParts: []
  },

  // === OVEN (target ~5–10; gas-heavy bias toward callPro) ===
  {
    category: 'oven',
    name: 'Bake element failure (electric)',
    symptoms: [
      'oven not heating to set temperature',
      'visible break or burn spot on bake element'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['bake element']
  },
  {
    category: 'oven',
    name: 'Broil element failure (electric)',
    symptoms: [
      'broil function not working',
      'visible damage on broil element'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['broil element']
  },
  {
    category: 'oven',
    name: 'Oven thermostat / temp sensor fault',
    symptoms: [
      'oven temperature reads incorrectly',
      'food consistently over- or under-cooked',
      'temperature swings during cooking'
    ],
    errorCodePatterns: ['F1', 'F3', 'F30'],
    diyDifficulty: 'moderate',
    typicalParts: ['temperature sensor', 'thermostat']
  },
  {
    category: 'oven',
    name: 'Igniter failure (gas oven)',
    symptoms: [
      'oven not heating (gas)',
      'clicking sound but no flame',
      'weak glow from igniter when calling for heat'
    ],
    diyDifficulty: 'advanced',
    callProIf: 'gas appliance — confirm gas line work scope before DIY',
    typicalParts: ['oven igniter']
  },
  {
    category: 'oven',
    name: 'Door seal failure',
    symptoms: [
      'heat escaping from door edges',
      'long preheat times',
      'visible damage on door gasket'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['oven door gasket']
  },
  {
    category: 'oven',
    name: 'Control board fault',
    symptoms: [
      'erratic display',
      'oven not responding to button presses',
      'unable to set temperature or function'
    ],
    errorCodePatterns: ['F2', 'F10'],
    diyDifficulty: 'advanced',
    callProIf: 'electronics work near gas/electric supply',
    typicalParts: ['main control board']
  }
];

export function selectRelevantModes(
  categoryHint: FailureMode['category'] | 'unknown',
  errorCode: string | null
): FailureMode[] {
  const normalizedCode = errorCode?.trim().toUpperCase() ?? null;

  // Tier 1: exact error-code match across all categories.
  if (normalizedCode) {
    const hits = FAILURE_MODES.filter(m =>
      m.errorCodePatterns?.some(p => p === normalizedCode)
    );
    if (hits.length > 0) return hits;
  }

  // Tier 2: category filter if known.
  if (categoryHint !== 'unknown') {
    return FAILURE_MODES.filter(m => m.category === categoryHint);
  }

  // Tier 3: all modes.
  return FAILURE_MODES;
}
```

Count: 7 dishwasher + 7 washer + 7 dryer + 7 fridge + 6 oven = 34 entries. Above the 30-minimum the test enforces. Add more entries post-launch as quality runs reveal misses.

- [ ] **Step 4: Run tests; verify pass**

```bash
npm run test:unit -- referenceData
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Verify full check still works (other consumers remain broken — that's fine)**

```bash
npm run check
```

Errors expected in `diagnose.ts`, `prompt.ts`, route files — fixed in Tasks 6+.

- [ ] **Step 6: Commit**

```bash
git add src/lib/referenceData.ts tests/unit/referenceData.test.ts
git commit -m "Add hand-curated reference data + selector for 5 appliance categories"
```

---

## Phase 4 — Prompt + Diagnose Pipeline

### Task 6: Replace `src/lib/prompt.ts` with appliance system prompt (TDD)

**Files:**
- Modify: `src/lib/prompt.ts`
- Modify: `tests/unit/prompt.test.ts`

- [ ] **Step 1: Replace `tests/unit/prompt.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserContent } from '../../src/lib/prompt';
import type { FailureMode } from '../../src/lib/referenceData';

const SAMPLE_MODES: FailureMode[] = [
  {
    category: 'dishwasher',
    name: 'Drain pump failure',
    symptoms: ['water remains in tub', 'humming during drain'],
    errorCodePatterns: ['LE', 'OE'],
    diyDifficulty: 'moderate',
    typicalParts: ['drain pump']
  }
];

describe('buildSystemPrompt', () => {
  it('includes appliance-technician role and key rules', () => {
    const p = buildSystemPrompt(SAMPLE_MODES);
    expect(p.toLowerCase()).toContain('appliance');
    expect(p).toContain('confidence');
    expect(p).toContain('whatWouldChangeMyMind');
    expect(p).toContain('callPro');
    expect(p).toContain('difficulty');
    expect(p).toContain('parts');
    expect(p).toContain('JSON');
  });

  it('includes the safety rules (gas/sealed system/electrical)', () => {
    const p = buildSystemPrompt(SAMPLE_MODES);
    expect(p.toLowerCase()).toMatch(/gas/);
    expect(p.toLowerCase()).toMatch(/sealed|refrigerat/);
    expect(p.toLowerCase()).toMatch(/electric/);
  });

  it('injects the provided reference modes into the prompt', () => {
    const p = buildSystemPrompt(SAMPLE_MODES);
    expect(p).toContain('Drain pump failure');
    expect(p).toContain('LE');
  });

  it('handles empty reference modes gracefully', () => {
    const p = buildSystemPrompt([]);
    expect(p.length).toBeGreaterThan(0);
    expect(p).not.toContain('undefined');
  });
});

describe('buildUserContent', () => {
  it('includes the photo, freeform text, and optional fields', () => {
    const c = buildUserContent('data:image/jpeg;base64,XYZ', 'wont start', 'Whirlpool WDT780', 'F21');
    expect(Array.isArray(c)).toBe(true);
    const text = c.find(x => x.type === 'text');
    expect(text?.text).toContain('wont start');
    expect(text?.text).toContain('Whirlpool WDT780');
    expect(text?.text).toContain('F21');
  });

  it('shows placeholders when optional fields missing', () => {
    const c = buildUserContent('data:image/jpeg;base64,XYZ', '', '', '');
    const text = c.find(x => x.type === 'text');
    expect(text?.text.toLowerCase()).toContain('no additional context');
    expect(text?.text.toLowerCase()).toContain('not provided');
  });

  it('respects retry mode instruction', () => {
    const c = buildUserContent('data:image/jpeg;base64,XYZ', 'x', '', '', { retry: true });
    const text = c.find(x => x.type === 'text');
    expect(text?.text.toLowerCase()).toContain('previous response did not match the schema');
  });
});
```

- [ ] **Step 2: Run test to verify it fails (signature mismatch on existing prompt module)**

```bash
npm run test:unit -- prompt
```

- [ ] **Step 3: Replace `src/lib/prompt.ts`**

```ts
import type { FailureMode } from './referenceData';

export function buildSystemPrompt(referenceModes: FailureMode[]): string {
  const refSection = referenceModes.length > 0
    ? `\nReference (top failure modes for related appliances):\n${referenceModes.map(formatMode).join('\n')}\n`
    : '';

  return `You are an expert appliance-repair technician diagnosing home appliances from photos and user-provided context. You combine appliance repair knowledge with disciplined uncertainty and safety-first recommendations.

You receive: one photo of the appliance or its damaged area, plus optional freeform text, optional make/model/serial, and optional error code from the display.
${refSection}
Produce a JSON object matching this schema (TypeScript-style for clarity):

{
  "appliance": {
    "category": "dishwasher" | "washer" | "dryer" | "refrigerator" | "oven" | "other",
    "make": string | null,
    "model": string | null,
    "confidence": number
  } | null,
  "primary": {
    "name": string,
    "confidence": number,
    "rationale": string,
    "recovery": {
      "diy": Array<{ "action": string, "difficulty": "easy" | "moderate" | "advanced" }>,
      "callPro": boolean,
      "proReason"?: string
    },
    "parts": Array<{ "name": string, "partNumber"?: string, "typicalCostUsd"?: string }>
  },
  "alternatives": Array<{ "name": string, "confidence": number, "rationale": string }>,
  "whatWouldChangeMyMind": string[],
  "meta": { "model": string, "createdAt": string }
}

Rules:

1. Identify the appliance category. If certain, fill make + model. If unsure, set make/model to null. Confidence honest.

2. Every rationale must cite visible evidence from the photo OR the user-provided fields ("error code LE suggests drain pump..."), not generic descriptions.

3. DIY step difficulty:
   - 'easy': no tools / under 10 minutes / no disassembly
   - 'moderate': basic tools / 30-60 minutes / partial disassembly
   - 'advanced': specialty tools or significant disassembly

4. callPro MUST be true when:
   - Gas appliances (gas range, gas dryer) and the suspected fault involves gas lines, valves, or igniters
   - Sealed refrigeration system (compressor, sealed refrigerant lines)
   - Active electrical hazard (visible burning, exposed wires, water near energized components)
   - Diagnosis confidence below 0.5 AND the failure involves a major component (motor, control board, sealed system)
   Provide proReason explaining why.

5. parts: list replacement parts only if the primary diagnosis requires them. Include partNumber ONLY if confident the standard part number for the named make/model is X — DO NOT hallucinate part numbers. typicalCostUsd is a range ("$45-80"), never a single number.

6. Provide 1-2 alternative diagnoses with confidence below the primary, or [] if none.

7. whatWouldChangeMyMind: 1-3 cheap checks the user can do to confirm/refute the primary diagnosis.

8. Safety: NEVER recommend bypassing safety interlocks, working on energized circuits, or disassembling sealed refrigeration systems. If any DIY step would involve these, set callPro: true and exclude that step.

9. Tone: direct, no padding. Write for someone who wants to act.

10. Output ONLY the JSON object, no prose around it.

The "meta.model" field will be overwritten server-side; you may pass through a placeholder. "meta.createdAt" likewise.`;
}

function formatMode(m: FailureMode): string {
  const codes = m.errorCodePatterns?.length ? ` (codes: ${m.errorCodePatterns.join(', ')})` : '';
  const parts = m.typicalParts?.length ? `; typical parts: ${m.typicalParts.join(', ')}` : '';
  return `- [${m.category}] ${m.name}${codes} — symptoms: ${m.symptoms.join('; ')}; DIY: ${m.diyDifficulty}${parts}`;
}

type UserContentPart =
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'text'; text: string };

export function buildUserContent(
  photoDataUrl: string,
  freeformText: string,
  modelField: string,
  errorCode: string,
  opts: { retry?: boolean } = {}
): UserContentPart[] {
  const freeform = freeformText.trim().length > 0
    ? `- Freeform: ${freeformText.trim()}`
    : '- Freeform: no additional context';

  const model = modelField.trim().length > 0
    ? `- Make/model/serial: ${modelField.trim()}`
    : '- Make/model/serial: not provided';

  const code = errorCode.trim().length > 0
    ? `- Error code: ${errorCode.trim()}`
    : '- Error code: not provided';

  const retryPreamble = opts.retry
    ? 'Your previous response did not match the schema. Return ONLY a JSON object with these exact keys: appliance, primary, alternatives, whatWouldChangeMyMind, meta. No prose, no markdown fences.\n\n'
    : '';

  const userContext = `User-provided context:\n${freeform}\n${model}\n${code}`;

  return [
    { type: 'image_url', image_url: { url: photoDataUrl } },
    { type: 'text', text: `${retryPreamble}${userContext}\n\nDiagnose this appliance. Return only the JSON object matching the schema.` }
  ];
}
```

- [ ] **Step 4: Run tests; verify pass**

```bash
npm run test:unit -- prompt
```

Expected: 7 tests PASS (4 system prompt + 3 user content).

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompt.ts tests/unit/prompt.test.ts
git commit -m "Replace prompt builder with appliance-specific system prompt + reference injection"
```

---

### Task 7: Update `src/lib/diagnose.ts` to use the new prompt signature

**Files:**
- Modify: `src/lib/diagnose.ts`
- Modify: `tests/integration/diagnose.test.ts`

The diagnose module previously called `buildUserContent(photoDataUrl, freeformText, { retry })`. Now it must also accept `modelField` and `errorCode`, and call `buildSystemPrompt(referenceModes)` with the selected modes.

- [ ] **Step 1: Replace `tests/integration/diagnose.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { runDiagnose } from '../../src/lib/diagnose';
import { makeKvMock } from '../support/kvMock';

const validJson = (model: string) => JSON.stringify({
  appliance: { category: 'dishwasher', make: 'Whirlpool', model: 'WDT780', confidence: 0.9 },
  primary: {
    name: 'Drain pump failure',
    confidence: 0.75,
    rationale: 'r',
    recovery: { diy: [{ action: 'unplug', difficulty: 'easy' }], callPro: false },
    parts: []
  },
  alternatives: [],
  whatWouldChangeMyMind: [],
  meta: { model, createdAt: '2026-05-11T10:00:00Z' }
});

describe('runDiagnose (appliance)', () => {
  it('returns id + result on happy path; updates budget; passes optional fields through', async () => {
    const kv = makeKvMock();
    const openRouter = vi.fn(async () => ({
      content: validJson('qwen/qwen-2.5-vl-72b-instruct'),
      usage: { prompt_tokens: 1000, completion_tokens: 500, total_cost: 0.005 }
    }));

    const r = await runDiagnose({
      kv,
      ipHash: 'ip',
      photoDataUrl: 'data:image/jpeg;base64,xxx',
      freeformText: 'wont drain',
      modelField: 'Whirlpool WDT780',
      errorCode: 'LE',
      apiKey: 'k',
      model: 'qwen/qwen-2.5-vl-72b-instruct',
      maxOutputTokens: 2000,
      callOpenRouter: openRouter as any
    });

    expect(r.id).toMatch(/^[0-9a-z]{8}$/);
    expect(r.result.appliance?.make).toBe('Whirlpool');
    expect(r.result.meta.model).toBe('qwen/qwen-2.5-vl-72b-instruct');

    // Verify the optional fields made it into the user content text.
    const callArgs = openRouter.mock.calls[0][0];
    const userText = callArgs.userContent.find((p: any) => p.type === 'text')?.text ?? '';
    expect(userText).toContain('wont drain');
    expect(userText).toContain('Whirlpool WDT780');
    expect(userText).toContain('LE');
  });

  it('retries once on schema error and succeeds', async () => {
    const kv = makeKvMock();
    const openRouter = vi.fn()
      .mockResolvedValueOnce({ content: '{"bad":true}', usage: { total_cost: 0.001 } })
      .mockResolvedValueOnce({ content: validJson('qwen/qwen-2.5-vl-72b-instruct'), usage: { total_cost: 0.005 } });

    const r = await runDiagnose({
      kv, ipHash: 'ip', photoDataUrl: 'data:image/jpeg;base64,xxx',
      freeformText: '', modelField: '', errorCode: '',
      apiKey: 'k', model: 'qwen/qwen-2.5-vl-72b-instruct', maxOutputTokens: 2000,
      callOpenRouter: openRouter as any
    });

    expect(openRouter).toHaveBeenCalledTimes(2);
    expect(r.result.primary.name).toBe('Drain pump failure');
  });

  it('throws schemaError after second failure', async () => {
    const kv = makeKvMock();
    const openRouter = vi.fn(async () => ({ content: '{"still":"bad"}', usage: { total_cost: 0 } }));

    await expect(runDiagnose({
      kv, ipHash: 'ip', photoDataUrl: 'data:image/jpeg;base64,xxx',
      freeformText: '', modelField: '', errorCode: '',
      apiKey: 'k', model: 'qwen/qwen-2.5-vl-72b-instruct', maxOutputTokens: 2000,
      callOpenRouter: openRouter as any
    })).rejects.toThrow(/schema/i);

    expect(openRouter).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Replace `src/lib/diagnose.ts`**

```ts
import { parseDiagnosisResponse, ParseError } from './parser';
import { buildSystemPrompt, buildUserContent } from './prompt';
import { saveDiagnosis } from './storage';
import { recordSpend } from './budget';
import { parseActualCostCents, estimateCostCents } from './cost';
import { llmError, schemaError } from './errors';
import { selectRelevantModes, type FailureMode } from './referenceData';
import type { OpenRouterCallArgs, OpenRouterCallResult } from './openrouter';
import { callOpenRouter as defaultCallOpenRouter } from './openrouter';
import type { DiagnosisResult } from './types';

export type RunDiagnoseArgs = {
  kv: KVNamespace;
  ipHash: string;
  photoDataUrl: string;
  freeformText: string;
  modelField: string;
  errorCode: string;
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  callOpenRouter?: (args: OpenRouterCallArgs) => Promise<OpenRouterCallResult>;
};

export type RunDiagnoseResult = { id: string; result: DiagnosisResult };

// Heuristic: derive a category hint from freeform text and the model field.
// Pure function, no LLM cost.
function deriveCategoryHint(freeform: string, modelField: string): FailureMode['category'] | 'unknown' {
  const text = `${freeform} ${modelField}`.toLowerCase();
  if (/dishwasher/.test(text)) return 'dishwasher';
  if (/washer|washing machine/.test(text)) return 'washer';
  if (/dryer/.test(text)) return 'dryer';
  if (/fridge|refrigerator/.test(text)) return 'refrigerator';
  if (/oven|range|stove/.test(text)) return 'oven';
  return 'unknown';
}

export async function runDiagnose(args: RunDiagnoseArgs): Promise<RunDiagnoseResult> {
  const call = args.callOpenRouter ?? defaultCallOpenRouter;
  const categoryHint = deriveCategoryHint(args.freeformText, args.modelField);
  const errorCodeForSelector = args.errorCode.trim().length > 0 ? args.errorCode : null;
  const referenceModes = selectRelevantModes(categoryHint, errorCodeForSelector);
  const systemPrompt = buildSystemPrompt(referenceModes);

  let lastUsage: OpenRouterCallResult['usage'];
  let parsed: DiagnosisResult | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: OpenRouterCallResult;
    try {
      raw = await call({
        apiKey: args.apiKey,
        model: args.model,
        systemPrompt,
        userContent: buildUserContent(
          args.photoDataUrl,
          args.freeformText,
          args.modelField,
          args.errorCode,
          { retry: attempt > 0 }
        ),
        maxOutputTokens: args.maxOutputTokens
      });
    } catch (e) {
      throw llmError();
    }
    lastUsage = raw.usage;

    try {
      parsed = parseDiagnosisResponse(raw.content);
      break;
    } catch (e) {
      if (!(e instanceof ParseError) || attempt === 1) {
        throw schemaError();
      }
    }
  }

  if (!parsed) throw schemaError();

  parsed.meta = { model: args.model, createdAt: new Date().toISOString() };

  const costCents = parseActualCostCents({ usage: lastUsage }) ?? estimateCostCents(
    args.model,
    lastUsage?.prompt_tokens ?? 1500,
    lastUsage?.completion_tokens ?? 500
  );
  await recordSpend(args.kv, costCents);

  const id = await saveDiagnosis(args.kv, parsed);
  return { id, result: parsed };
}
```

- [ ] **Step 3: Run tests; verify pass**

```bash
npm run test:unit -- diagnose
```

Expected: 3 PASS.

- [ ] **Step 4: Run full check**

```bash
npm run check
```

Errors expected only in the route files / parser fixtures — fixed in Tasks 8 and 12.

- [ ] **Step 5: Commit**

```bash
git add src/lib/diagnose.ts tests/integration/diagnose.test.ts
git commit -m "Update diagnose pipeline for appliance schema + reference data injection"
```

---

## Phase 5 — API Endpoint

### Task 8: Update `src/routes/api/diagnose/+server.ts` to handle new fields

**Files:**
- Modify: `src/routes/api/diagnose/+server.ts`
- Modify: `tests/integration/api-diagnose.test.ts`

- [ ] **Step 1: Replace `tests/integration/api-diagnose.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/routes/api/diagnose/+server';
import { makeKvMock } from '../support/kvMock';

function makeFormData(opts: {
  photo?: Blob;
  text?: string;
  modelField?: string;
  errorCode?: string;
  token?: string;
}): FormData {
  const fd = new FormData();
  if (opts.photo !== undefined) fd.append('photo', opts.photo, 'p.jpg');
  fd.append('text', opts.text ?? '');
  fd.append('modelField', opts.modelField ?? '');
  fd.append('errorCode', opts.errorCode ?? '');
  fd.append('turnstileToken', opts.token ?? 'test-token');
  return fd;
}

function makeRequest(fd: FormData): Request {
  return new Request('http://localhost/api/diagnose', { method: 'POST', body: fd });
}

const validJson = JSON.stringify({
  appliance: { category: 'dishwasher', make: 'X', model: 'Y', confidence: 0.7 },
  primary: {
    name: 'Drain pump failure',
    confidence: 0.7,
    rationale: 'r',
    recovery: { diy: [], callPro: false },
    parts: []
  },
  alternatives: [],
  whatWouldChangeMyMind: [],
  meta: { model: 'qwen/qwen-2.5-vl-72b-instruct', createdAt: '2026-05-11T10:00:00Z' }
});

beforeEach(() => vi.restoreAllMocks());

const baseEvent = (request: Request, kv: KVNamespace) => ({
  request,
  platform: {
    env: {
      DIAGNOSES: kv,
      OPENROUTER_API_KEY: 'k',
      OPENROUTER_MODEL: 'qwen/qwen-2.5-vl-72b-instruct',
      DAILY_BUDGET_CENTS: '1000',
      RATE_LIMIT_PER_HOUR: '10',
      DAILY_CAP_PER_IP: '50',
      MAX_OUTPUT_TOKENS: '2000',
      TURNSTILE_SITE_KEY: 'site',
      TURNSTILE_SECRET_KEY: 'secret'
    }
  },
  getClientAddress: () => '1.2.3.4'
} as any);

describe('POST /api/diagnose (appliance)', () => {
  it('returns 200 + id on happy path with all optional fields', async () => {
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.includes('turnstile')) return new Response(JSON.stringify({ success: true }));
      if (u.includes('openrouter')) {
        return new Response(JSON.stringify({
          choices: [{ message: { content: validJson } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_cost: 0.001 }
        }));
      }
      throw new Error('unexpected: ' + u);
    }) as any;

    const fd = makeFormData({
      photo: new Blob(['x'], { type: 'image/jpeg' }),
      text: 'wont drain',
      modelField: 'Whirlpool WDT780',
      errorCode: 'LE'
    });
    const res = await POST(baseEvent(makeRequest(fd), makeKvMock()));
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string };
    expect(body.id).toMatch(/^[0-9a-z]{8}$/);
  });

  it('returns 400 when modelField is oversize', async () => {
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: true }));
      throw new Error('unexpected');
    }) as any;

    const fd = makeFormData({
      photo: new Blob(['x'], { type: 'image/jpeg' }),
      modelField: 'a'.repeat(201)
    });
    const res = await POST(baseEvent(makeRequest(fd), makeKvMock()));
    expect(res.status).toBe(400);
  });

  it('returns 400 when errorCode is oversize', async () => {
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: true }));
      throw new Error('unexpected');
    }) as any;

    const fd = makeFormData({
      photo: new Blob(['x'], { type: 'image/jpeg' }),
      errorCode: 'F' + '1'.repeat(50)
    });
    const res = await POST(baseEvent(makeRequest(fd), makeKvMock()));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm run test:unit -- api-diagnose
```

Expected: FAIL — current endpoint doesn't accept the new fields.

- [ ] **Step 3: Replace `src/routes/api/diagnose/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { verifyTurnstile } from '$lib/turnstile';
import { sha256Hex } from '$lib/hash';
import { checkAndIncrementRateLimit } from '$lib/rateLimit';
import { checkAndIncrementDailyCap } from '$lib/dailyCap';
import { canSpend } from '$lib/budget';
import { runDiagnose } from '$lib/diagnose';
import {
  ApiError,
  turnstileFailed, rateLimited, dailyCapHit, budgetExhausted,
  photoTooLarge, photoUnsupportedFormat, textTooLong, internalError
} from '$lib/errors';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 2000;
const MAX_MODEL_CHARS = 200;
const MAX_ERROR_CODE_CHARS = 50;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function envInt(v: string | undefined, fallback: number): number {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return `data:${blob.type};base64,${btoa(bin)}`;
}

function errorResponse(e: ApiError): Response {
  const body = JSON.stringify({ code: e.code, message: e.userMessage });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (e.retryAfterSeconds !== undefined) headers['Retry-After'] = String(e.retryAfterSeconds);
  return new Response(body, { status: e.httpStatus, headers });
}

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
  if (!platform) return errorResponse(internalError());
  const env = platform.env;

  try {
    const form = await request.formData();
    const photo = form.get('photo');
    const text = (form.get('text') as string | null) ?? '';
    const modelField = (form.get('modelField') as string | null) ?? '';
    const errorCode = (form.get('errorCode') as string | null) ?? '';
    const turnstileToken = (form.get('turnstileToken') as string | null) ?? '';

    if (!(photo instanceof Blob) || photo.size === 0) return errorResponse(photoTooLarge());
    if (photo.size > MAX_PHOTO_BYTES) return errorResponse(photoTooLarge());
    if (!ALLOWED_MIME.has(photo.type)) return errorResponse(photoUnsupportedFormat());
    if (text.length > MAX_TEXT_CHARS) return errorResponse(textTooLong());
    if (modelField.length > MAX_MODEL_CHARS) {
      return errorResponse(new ApiError('text_too_long', 400, 'Model field is too long. Trim it down.'));
    }
    if (errorCode.length > MAX_ERROR_CODE_CHARS) {
      return errorResponse(new ApiError('text_too_long', 400, 'Error code is too long. Just the code (e.g. LE, F21).'));
    }

    const ip = getClientAddress();
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken, ip);
    if (!ok) return errorResponse(turnstileFailed());

    const ipHash = await sha256Hex(ip);

    const rate = await checkAndIncrementRateLimit(env.DIAGNOSES, ipHash, envInt(env.RATE_LIMIT_PER_HOUR, 10));
    if (!rate.allowed) return errorResponse(rateLimited(rate.retryAfterSeconds));

    const day = await checkAndIncrementDailyCap(env.DIAGNOSES, ipHash, envInt(env.DAILY_CAP_PER_IP, 50));
    if (!day.allowed) return errorResponse(dailyCapHit());

    const reserveEstimate = 30;
    const budget = await canSpend(env.DIAGNOSES, envInt(env.DAILY_BUDGET_CENTS, 1000), reserveEstimate);
    if (!budget.allowed) return errorResponse(budgetExhausted());

    const photoDataUrl = await blobToDataUrl(photo);

    const result = await runDiagnose({
      kv: env.DIAGNOSES,
      ipHash,
      photoDataUrl,
      freeformText: text,
      modelField,
      errorCode,
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL ?? 'qwen/qwen-2.5-vl-72b-instruct',
      maxOutputTokens: envInt(env.MAX_OUTPUT_TOKENS, 2000)
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e);
    console.error('diagnose endpoint error:', e);
    return errorResponse(internalError());
  }
};
```

Note: `ApiError` is imported and constructed inline for the two new oversize-field errors (no new factory functions needed since `text_too_long` covers both with custom messages). If you prefer, add `modelTooLong()` and `errorCodeTooLong()` factories to `src/lib/errors.ts` — out of scope here.

- [ ] **Step 4: Run tests; verify pass**

```bash
npm run test:unit -- api-diagnose
```

Expected: 3 PASS.

- [ ] **Step 5: Run all tests**

```bash
npm run test:unit
```

Expect everything to pass at this point — all unit + integration tests are now appliance-compliant.

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/diagnose/+server.ts tests/integration/api-diagnose.test.ts
git commit -m "Update /api/diagnose to handle modelField + errorCode + length caps"
```

---

## Phase 6 — UI

### Task 9: Update capture page `src/routes/+page.svelte`

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  import { compressPhoto, type CompressedPhoto } from '$lib/photoCompress';

  let photo: CompressedPhoto | null = $state(null);
  let photoError = $state<string | null>(null);
  let text = $state('');
  let modelField = $state('');
  let errorCode = $state('');
  let submitting = $state(false);
  let formError = $state<string | null>(null);
  let turnstileToken = $state<string | null>(null);

  async function handlePhotoChange(e: Event) {
    photoError = null;
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      photoError = 'Use JPEG, PNG, or WebP.';
      return;
    }

    try {
      photo = await compressPhoto(file);
    } catch (err) {
      photoError = 'Could not process that image. Try another.';
    }
  }

  function clearPhoto() {
    photo = null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = null;
    if (!photo) { formError = 'Please add a photo.'; return; }
    if (!turnstileToken) { formError = 'Waiting on captcha. Try again in a moment.'; return; }

    submitting = true;
    try {
      const fd = new FormData();
      fd.append('photo', photo.blob, 'appliance.jpg');
      fd.append('text', text);
      fd.append('modelField', modelField);
      fd.append('errorCode', errorCode);
      fd.append('turnstileToken', turnstileToken);

      const res = await fetch('/api/diagnose', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Something went wrong.' }));
        formError = body.message ?? 'Something went wrong.';
        return;
      }
      const { id } = (await res.json()) as { id: string };
      window.location.assign(`/d/${id}`);
    } catch (err) {
      formError = "Couldn't reach the server. Check your connection and try again.";
    } finally {
      submitting = false;
    }
  }

  onMount(() => {
    const render = () => {
      if (!window.turnstile) return;
      window.turnstile.render('#turnstile-container', {
        sitekey: PUBLIC_TURNSTILE_SITE_KEY,
        callback: (token) => { turnstileToken = token; },
        'error-callback': () => { turnstileToken = null; },
        'expired-callback': () => { turnstileToken = null; }
      });
    };
    if (window.turnstile) render();
    else window.onTurnstileLoad = render;
  });
</script>

<svelte:head>
  <title>Appliance Troubleshooter</title>
  <meta name="description" content="Photo + a few words. Get an appliance diagnosis." />
</svelte:head>

<header style="margin-bottom: 2rem;">
  <h1 style="margin: 0 0 0.25rem;">Appliance Troubleshooter</h1>
  <p style="margin: 0; color: var(--muted);">Photo + a few words. Get a diagnosis.</p>
</header>

<form onsubmit={handleSubmit}>
  <div class="photo-section">
    {#if photo}
      <img src={photo.dataUrl} alt="Selected appliance" style="max-width: 100%; border-radius: 6px;" />
      <button type="button" onclick={clearPhoto} style="margin-top: 0.5rem; background: none; border: none; color: var(--muted); text-decoration: underline; padding: 0;">
        Replace photo
      </button>
    {:else}
      <label class="drop-zone">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onchange={handlePhotoChange}
          style="display: none;"
        />
        <span>Tap to take a photo or pick one</span>
      </label>
    {/if}
    {#if photoError}
      <p style="color: var(--danger); margin-top: 0.5rem;">{photoError}</p>
    {/if}
  </div>

  <div style="margin-top: 1rem;">
    <textarea
      bind:value={text}
      placeholder="What's it doing? When did it start?"
      maxlength="2000"
      rows="3"
      style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font: inherit;"
    ></textarea>
  </div>

  <div style="margin-top: 0.75rem;">
    <label style="font-size: 0.8rem; color: var(--muted);">Make / model / serial <span style="font-weight: normal;">(optional)</span></label>
    <input
      type="text"
      bind:value={modelField}
      placeholder="Whirlpool WDT780SAEM"
      maxlength="200"
      style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; font: inherit; margin-top: 0.25rem;"
    />
  </div>

  <div style="margin-top: 0.75rem;">
    <label style="font-size: 0.8rem; color: var(--muted);">Error code on display <span style="font-weight: normal;">(optional)</span></label>
    <input
      type="text"
      bind:value={errorCode}
      placeholder="LE, F21, dE"
      maxlength="50"
      style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; font: 14px ui-monospace, monospace; margin-top: 0.25rem;"
    />
  </div>

  <div id="turnstile-container" style="margin-top: 1rem;"></div>

  {#if formError}
    <p style="color: var(--danger); margin-top: 1rem;">{formError}</p>
  {/if}

  <button type="submit" class="button-primary" style="margin-top: 1.5rem;" disabled={submitting || !photo}>
    {submitting ? 'Diagnosing…' : 'Diagnose'}
  </button>
</form>

<p style="margin-top: 1.5rem; text-align: center; color: var(--muted); font-size: 0.9rem;">
  <a href="/example" style="color: var(--muted);">See an example diagnosis →</a>
</p>

<style>
  .photo-section { width: 100%; }
  .drop-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    border: 2px dashed var(--border);
    border-radius: 8px;
    color: var(--muted);
    cursor: pointer;
    text-align: center;
    padding: 1rem;
  }
  .drop-zone:hover { background: rgba(0, 0, 0, 0.02); }
</style>
```

- [ ] **Step 2: Verify compile**

```bash
npm run check
```

Expected: 0 errors. (If errors about `$env/static/public` missing `PUBLIC_TURNSTILE_SITE_KEY`, ensure `.env` has it — already in the inherited config.)

- [ ] **Step 3: Verify dev server renders the form**

```bash
npm run dev &
DEV_PID=$!
sleep 5
curl -s http://localhost:5173/ | grep -E "Appliance Troubleshooter|modelField|errorCode" | head -5
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
```

Expected: see references to "Appliance Troubleshooter" and the new input fields in the rendered HTML.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "Update capture page with appliance UI + two new optional fields"
```

---

### Task 10: Update result page `src/routes/d/[id]/+page.svelte`

**Files:**
- Modify: `src/routes/d/[id]/+page.svelte`

(The `+page.server.ts` is generic — no changes needed.)

- [ ] **Step 1: Replace the result page**

```svelte
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const result = $derived(data.result);
  const created = $derived(new Date(data.createdAt));

  function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
  }

  function difficultyColor(d: 'easy' | 'moderate' | 'advanced'): string {
    if (d === 'easy') return '#d4e8d8';
    if (d === 'moderate') return '#fde7c0';
    return '#fad0c8';
  }

  function copyShareLink() {
    navigator.clipboard?.writeText(window.location.href);
  }
</script>

<svelte:head>
  <title>{result.primary.name} — Appliance Troubleshooter</title>
  <meta name="description" content={`${result.primary.name}: ${result.primary.rationale.slice(0, 140)}`} />
</svelte:head>

<header style="margin-bottom: 1.5rem;">
  <a href="/" style="color: var(--muted); text-decoration: none;">← Appliance Troubleshooter</a>
</header>

<section style="margin-bottom: 1.5rem;">
  {#if result.appliance}
    <p style="margin: 0; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Appliance</p>
    <h2 style="margin: 0;">
      {#if result.appliance.make || result.appliance.model}
        {result.appliance.make ?? ''} {result.appliance.model ?? ''}
      {:else}
        {result.appliance.category}
      {/if}
      <span style="color: var(--muted); font-weight: normal; font-size: 0.85rem;">· {pct(result.appliance.confidence)}</span>
    </h2>
    <p style="margin: 0.25rem 0 0; color: var(--muted); font-size: 0.9rem;">{result.appliance.category}</p>
  {:else}
    <p style="margin: 0; color: var(--muted);">
      Couldn't identify the specific make/model — diagnosis is based on visible failure symptoms.
    </p>
  {/if}
</section>

<section style="margin-bottom: 1.5rem; border-left: 3px solid var(--accent); padding-left: 1rem;">
  <p style="margin: 0; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Primary diagnosis</p>
  <h2 style="margin: 0;">
    {result.primary.name}
    <span style="color: var(--muted); font-weight: normal; font-size: 0.85rem;">· {pct(result.primary.confidence)}</span>
  </h2>
  <p>{result.primary.rationale}</p>
</section>

{#if result.primary.recovery.callPro}
  <div style="margin: 0 0 1rem; padding: 0.75rem 1rem; background: #ffe9d6; border-radius: 6px; border-left: 4px solid #c44;">
    <div style="font-weight: 600; color: #6a2a00;">⚠ Call a professional</div>
    {#if result.primary.recovery.proReason}
      <div style="font-size: 0.9rem; color: #6a2a00; margin-top: 0.3rem;">{result.primary.recovery.proReason}</div>
    {/if}
  </div>
{/if}

{#if result.primary.recovery.diy.length > 0}
  <section style="margin-bottom: 1.5rem;">
    <p style="margin: 0 0 0.5rem; font-weight: 600;">
      {result.primary.recovery.callPro ? 'What a technician will likely do' : 'DIY steps'}
    </p>
    <ol style="margin: 0; padding-left: 1.2rem;">
      {#each result.primary.recovery.diy as step}
        <li style="margin-bottom: 0.3rem;">
          {step.action}
          <span style="font-size: 0.7rem; padding: 0.1rem 0.5rem; background: {difficultyColor(step.difficulty)}; border-radius: 10px; margin-left: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">
            {step.difficulty}
          </span>
        </li>
      {/each}
    </ol>
  </section>
{/if}

{#if result.primary.parts.length > 0}
  <section style="margin-bottom: 1.5rem;">
    <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Parts</p>
    {#each result.primary.parts as part}
      <div style="margin: 0.2rem 0;">
        <strong>{part.name}</strong>
        {#if part.partNumber}<span style="font-family: ui-monospace, monospace; color: var(--muted); margin-left: 0.5rem;">{part.partNumber}</span>{/if}
        {#if part.typicalCostUsd}<span style="color: var(--muted); margin-left: 0.5rem;">{part.typicalCostUsd}</span>{/if}
      </div>
    {/each}
  </section>
{/if}

{#if result.alternatives.length > 0}
  <section style="margin-bottom: 1.5rem;">
    <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Alternatives</p>
    {#each result.alternatives as alt}
      <p style="margin: 0.3rem 0;">
        <strong>{alt.name}</strong>
        <span style="color: var(--muted);"> · {pct(alt.confidence)}</span>
        — {alt.rationale}
      </p>
    {/each}
  </section>
{/if}

{#if result.whatWouldChangeMyMind.length > 0}
  <section style="margin-bottom: 1.5rem;">
    <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">What would change my mind</p>
    <ul style="margin: 0; padding-left: 1.2rem;">
      {#each result.whatWouldChangeMyMind as check}
        <li>{check}</li>
      {/each}
    </ul>
  </section>
{/if}

<footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
  <span>{result.meta.model} · {created.toLocaleDateString()}</span>
  <button type="button" onclick={copyShareLink} style="background: none; border: 1px solid var(--border); color: var(--muted); padding: 0.25rem 0.5rem; border-radius: 4px;">
    Copy link
  </button>
</footer>

<div style="margin-top: 1.5rem;">
  <a href="/" class="button-primary" style="display: inline-block; text-align: center; text-decoration: none;">
    Diagnose another appliance
  </a>
</div>
```

- [ ] **Step 2: Verify compile**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/d/[id]/+page.svelte
git commit -m "Update result page to render appliance diagnosis (DIY/pro + parts + difficulty pills)"
```

---

### Task 11: Update example page `src/routes/example/+page.svelte`

**Files:**
- Modify: `src/routes/example/+page.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  const result = {
    appliance: { category: 'dishwasher', make: 'Whirlpool', model: 'WDT780SAEM', confidence: 0.88 },
    primary: {
      name: 'Drain pump failure',
      confidence: 0.75,
      rationale: 'Standing water in the tub after the cycle finishes, with a humming sound from the lower area when the drain phase starts. Error code matches the known drain-circuit fault pattern for this model.',
      recovery: {
        diy: [
          { action: 'Disconnect power at the breaker', difficulty: 'easy' as const },
          { action: 'Pull the dishwasher out and remove the lower kick panel', difficulty: 'easy' as const },
          { action: 'Locate the drain pump (cylindrical, ~4 inch, on the sump assembly)', difficulty: 'moderate' as const },
          { action: 'Disconnect harness + hose clamps; remove pump', difficulty: 'moderate' as const },
          { action: 'Install replacement pump in reverse order, restore power, run a rinse-only cycle to verify', difficulty: 'moderate' as const }
        ],
        callPro: false
      },
      parts: [
        { name: 'Drain pump assembly', partNumber: 'W10348269', typicalCostUsd: '$45–80' }
      ]
    },
    alternatives: [
      { name: 'Clogged drain hose', confidence: 0.15, rationale: 'Less likely given humming sound; hose blockage usually presents as quiet failure.' },
      { name: 'Control board fault', confidence: 0.10, rationale: 'Possible but rare; board faults usually show as full unresponsiveness rather than partial cycle.' }
    ],
    whatWouldChangeMyMind: [
      'Open the drain pump filter — if heavily clogged, diagnosis shifts to "clogged drain."',
      'Run a test cycle with cabinet open — if the pump spins normally during drain, the issue is downstream (hose / disposal connection).'
    ],
    meta: { model: 'qwen/qwen-2.5-vl-72b-instruct', createdAt: '2026-05-11T10:00:00Z' }
  };

  const created = new Date(result.meta.createdAt);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const difficultyColor = (d: 'easy' | 'moderate' | 'advanced') =>
    d === 'easy' ? '#d4e8d8' : d === 'moderate' ? '#fde7c0' : '#fad0c8';
</script>

<svelte:head>
  <title>Example diagnosis — Appliance Troubleshooter</title>
</svelte:head>

<header style="margin-bottom: 1.5rem;">
  <a href="/" style="color: var(--muted); text-decoration: none;">← Appliance Troubleshooter</a>
  <p style="margin: 0.5rem 0 0; color: var(--muted); font-size: 0.85rem;">This is a static example, not a real diagnosis.</p>
</header>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Appliance</p>
  <h2 style="margin: 0;">{result.appliance.make} {result.appliance.model}
    <span style="color: var(--muted); font-weight: normal; font-size: 0.85rem;">· {pct(result.appliance.confidence)}</span>
  </h2>
  <p style="margin: 0.25rem 0 0; color: var(--muted); font-size: 0.9rem;">{result.appliance.category}</p>
</section>

<section style="margin-bottom: 1.5rem; border-left: 3px solid var(--accent); padding-left: 1rem;">
  <p style="margin: 0; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Primary diagnosis</p>
  <h2 style="margin: 0;">{result.primary.name}
    <span style="color: var(--muted); font-weight: normal; font-size: 0.85rem;">· {pct(result.primary.confidence)}</span>
  </h2>
  <p>{result.primary.rationale}</p>
</section>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0 0 0.5rem; font-weight: 600;">DIY steps</p>
  <ol style="margin: 0; padding-left: 1.2rem;">
    {#each result.primary.recovery.diy as step}
      <li style="margin-bottom: 0.3rem;">
        {step.action}
        <span style="font-size: 0.7rem; padding: 0.1rem 0.5rem; background: {difficultyColor(step.difficulty)}; border-radius: 10px; margin-left: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">
          {step.difficulty}
        </span>
      </li>
    {/each}
  </ol>
</section>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Parts</p>
  {#each result.primary.parts as part}
    <div style="margin: 0.2rem 0;">
      <strong>{part.name}</strong>
      <span style="font-family: ui-monospace, monospace; color: var(--muted); margin-left: 0.5rem;">{part.partNumber}</span>
      <span style="color: var(--muted); margin-left: 0.5rem;">{part.typicalCostUsd}</span>
    </div>
  {/each}
</section>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Alternatives</p>
  {#each result.alternatives as alt}
    <p style="margin: 0.3rem 0;"><strong>{alt.name}</strong> <span style="color: var(--muted);">· {pct(alt.confidence)}</span> — {alt.rationale}</p>
  {/each}
</section>

<section style="margin-bottom: 1.5rem;">
  <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">What would change my mind</p>
  <ul style="margin: 0; padding-left: 1.2rem;">
    {#each result.whatWouldChangeMyMind as check}
      <li>{check}</li>
    {/each}
  </ul>
</section>

<footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.85rem;">
  Example · {result.meta.model}
</footer>

<div style="margin-top: 1.5rem;">
  <a href="/" class="button-primary" style="display: inline-block; text-align: center; text-decoration: none;">
    Diagnose your appliance
  </a>
</div>
```

- [ ] **Step 2: Verify compile**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/example/+page.svelte
git commit -m "Update example page with appliance diagnosis content"
```

---

## Phase 7 — Tests

### Task 12: Adapt parser fixtures + tests for the appliance schema

**Files:**
- Modify: `tests/unit/parser.test.ts`
- Create: `tests/fixtures/llm-responses/appliance-clean.json`
- Create: `tests/fixtures/llm-responses/appliance-trailing-prose.txt`
- Create: `tests/fixtures/llm-responses/appliance-fenced.txt`
- Create: `tests/fixtures/llm-responses/appliance-invalid-schema.txt`
- Delete: old plant fixtures (`qwen-clean.json`, `qwen-trailing-prose.txt`, `gemini-fenced.txt`, `invalid-schema.txt`)

- [ ] **Step 1: Delete old plant fixtures**

```bash
rm tests/fixtures/llm-responses/qwen-clean.json
rm tests/fixtures/llm-responses/qwen-trailing-prose.txt
rm tests/fixtures/llm-responses/gemini-fenced.txt
rm tests/fixtures/llm-responses/invalid-schema.txt
```

- [ ] **Step 2: Create the 4 new appliance fixtures**

`tests/fixtures/llm-responses/appliance-clean.json`:
```json
{
  "appliance": { "category": "dishwasher", "make": "Whirlpool", "model": "WDT780SAEM", "confidence": 0.9 },
  "primary": {
    "name": "Drain pump failure",
    "confidence": 0.75,
    "rationale": "Standing water and humming from drain area.",
    "recovery": {
      "diy": [
        { "action": "Disconnect power", "difficulty": "easy" },
        { "action": "Remove kick panel and access pump", "difficulty": "moderate" }
      ],
      "callPro": false
    },
    "parts": [{ "name": "drain pump", "partNumber": "W10348269", "typicalCostUsd": "$45-80" }]
  },
  "alternatives": [
    { "name": "Clogged drain hose", "confidence": 0.15, "rationale": "Less likely given humming." }
  ],
  "whatWouldChangeMyMind": ["Check the drain pump filter for clogs."],
  "meta": { "model": "qwen/qwen-2.5-vl-72b-instruct", "createdAt": "2026-05-11T10:00:00Z" }
}
```

`tests/fixtures/llm-responses/appliance-trailing-prose.txt`:
```
{"appliance":{"category":"washer","make":"LG","model":"WM3900","confidence":0.85},"primary":{"name":"Drain pump failure","confidence":0.8,"rationale":"Error code LE indicates drain.","recovery":{"diy":[{"action":"unplug","difficulty":"easy"}],"callPro":false},"parts":[]},"alternatives":[],"whatWouldChangeMyMind":[],"meta":{"model":"qwen/qwen-2.5-vl-72b-instruct","createdAt":"2026-05-11T10:00:00Z"}}

Hope this helps! Let me know if you need more details.
```

`tests/fixtures/llm-responses/appliance-fenced.txt` (use literal triple-backticks; this file has exactly 3 lines):
````
```json
{"appliance":null,"primary":{"name":"Heating element failure","confidence":0.7,"rationale":"Drum turns but no heat.","recovery":{"diy":[{"action":"check","difficulty":"easy"}],"callPro":false},"parts":[]},"alternatives":[],"whatWouldChangeMyMind":[],"meta":{"model":"google/gemini-2.5-flash","createdAt":"2026-05-11T10:00:00Z"}}
```
````

`tests/fixtures/llm-responses/appliance-invalid-schema.txt`:
```
{"appliance":{"category":"toaster","make":null,"model":null,"confidence":0.5},"primary":{}}
```

- [ ] **Step 3: Replace `tests/unit/parser.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDiagnosisResponse, ParseError } from '../../src/lib/parser';

const FIX = join(__dirname, '../fixtures/llm-responses');
const read = (name: string) => readFileSync(join(FIX, name), 'utf8');

describe('parseDiagnosisResponse (appliance schema)', () => {
  it('parses a clean response', () => {
    const r = parseDiagnosisResponse(read('appliance-clean.json'));
    expect(r.appliance?.make).toBe('Whirlpool');
    expect(r.primary.name).toBe('Drain pump failure');
    expect(r.primary.parts[0].partNumber).toBe('W10348269');
  });

  it('handles trailing prose after the JSON object', () => {
    const r = parseDiagnosisResponse(read('appliance-trailing-prose.txt'));
    expect(r.appliance?.make).toBe('LG');
  });

  it('strips markdown code fences', () => {
    const r = parseDiagnosisResponse(read('appliance-fenced.txt'));
    expect(r.appliance).toBeNull();
    expect(r.primary.name).toBe('Heating element failure');
  });

  it('throws ParseError on schema-invalid content', () => {
    expect(() => parseDiagnosisResponse(read('appliance-invalid-schema.txt'))).toThrow(ParseError);
  });

  it('throws ParseError when no JSON object found', () => {
    expect(() => parseDiagnosisResponse('Just prose, no JSON.')).toThrow(ParseError);
  });
});
```

- [ ] **Step 4: Run tests; verify pass**

```bash
npm run test:unit -- parser
```

Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/parser.test.ts tests/fixtures/llm-responses/
git commit -m "Adapt parser fixtures + tests for appliance schema"
```

---

### Task 13: Adapt storage tests + Playwright happy-path

**Files:**
- Modify: `tests/unit/storage.test.ts`
- Modify: `tests/e2e/happy-path.spec.ts`

- [ ] **Step 1: Update `tests/unit/storage.test.ts`** — change the sample to an appliance result

```ts
import { describe, it, expect } from 'vitest';
import { saveDiagnosis, loadDiagnosis, KEY_PREFIX } from '../../src/lib/storage';
import { makeKvMock } from '../support/kvMock';
import type { DiagnosisResult } from '../../src/lib/types';

const sample: DiagnosisResult = {
  appliance: { category: 'dishwasher', make: 'Whirlpool', model: 'WDT780', confidence: 0.9 },
  primary: {
    name: 'Drain pump failure',
    confidence: 0.7,
    rationale: 'r',
    recovery: { diy: [], callPro: false },
    parts: []
  },
  alternatives: [],
  whatWouldChangeMyMind: [],
  meta: { model: 'qwen/qwen-2.5-vl-72b-instruct', createdAt: '2026-05-11T10:00:00Z' }
};

describe('storage', () => {
  it('saveDiagnosis returns an ID and stores under the right key', async () => {
    const kv = makeKvMock();
    const id = await saveDiagnosis(kv, sample);
    expect(id).toMatch(/^[0-9a-z]{8}$/);
    const raw = await kv.get(KEY_PREFIX + id);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.result.appliance?.make).toBe('Whirlpool');
    expect(stored.createdAt).toBeDefined();
  });

  it('loadDiagnosis returns null for missing key', async () => {
    const kv = makeKvMock();
    expect(await loadDiagnosis(kv, 'aaaaaaaa')).toBeNull();
  });

  it('loadDiagnosis returns the saved result', async () => {
    const kv = makeKvMock();
    const id = await saveDiagnosis(kv, sample);
    const stored = await loadDiagnosis(kv, id);
    expect(stored?.result.appliance?.make).toBe('Whirlpool');
  });
});
```

- [ ] **Step 2: Update `tests/e2e/happy-path.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('capture page renders and the submit button starts disabled', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Appliance Troubleshooter' })).toBeVisible();
  await expect(page.getByPlaceholder(/What's it doing/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Whirlpool WDT780SAEM/i)).toBeVisible();
  await expect(page.getByPlaceholder(/LE, F21, dE/i)).toBeVisible();

  const submit = page.getByRole('button', { name: /^Diagnose$/i });
  await expect(submit).toBeDisabled();
});

test('example page renders an appliance diagnosis', async ({ page }) => {
  await page.goto('/example');

  await expect(page.getByText('Drain pump failure')).toBeVisible();
  await expect(page.getByText(/W10348269/)).toBeVisible();
  await expect(page.getByText(/DIY steps/i)).toBeVisible();
});

test('non-existent diagnosis ID renders error page', async ({ page }) => {
  await page.goto('/d/zzzzzzzz', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/diagnose a new (plant|appliance)|new plant|new appliance/i)).toBeVisible({ timeout: 5000 });
});
```

The 404 test uses a relaxed assertion because the error page text from Plant Doctor still says "Diagnose a new plant" — that gets fixed indirectly by the `+error.svelte` text. Actually let me verify... the error page from Plant Doctor says "Diagnose a new plant" — yes that's plant-specific. Update that page too:

- [ ] **Step 3: Update `src/routes/+error.svelte`** — fix the CTA text

```svelte
<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>Appliance Troubleshooter — {page.status}</title>
</svelte:head>

<header style="margin-bottom: 1.5rem;">
  <a href="/" style="color: var(--muted); text-decoration: none;">← Appliance Troubleshooter</a>
</header>

<h1>{page.status === 404 ? "Diagnosis not found" : "Something went wrong"}</h1>

{#if page.status === 404}
  <p>This diagnosis isn't available — it may have expired or the link is wrong.</p>
{:else}
  <p>Try again, or come back later.</p>
{/if}

<a href="/" class="button-primary" style="display: inline-block; text-align: center; text-decoration: none; margin-top: 1rem;">
  Diagnose a new appliance
</a>
```

- [ ] **Step 4: Tighten the Playwright 404 assertion to just match "appliance"**

```ts
test('non-existent diagnosis ID renders error page', async ({ page }) => {
  await page.goto('/d/zzzzzzzz', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/diagnose a new appliance/i)).toBeVisible({ timeout: 5000 });
});
```

(Apply this in the file from Step 2.)

- [ ] **Step 5: Run all tests**

```bash
npm run test:unit
npm run test:e2e
```

Expected: all unit + integration tests pass; 3 Playwright tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/storage.test.ts tests/e2e/happy-path.spec.ts src/routes/+error.svelte
git commit -m "Adapt storage tests, Playwright happy-path, and error page for appliance app"
```

---

### Task 14: Create the appliance quality fixtures manifest + adapt quality runner

**Files:**
- Create: `tests/fixtures/appliance-photos/.gitignore`
- Create: `tests/fixtures/appliance-photos.manifest.json`
- Modify: `scripts/quality-run.ts`
- Delete: `tests/fixtures/plant-photos/` and `tests/fixtures/plant-photos.manifest.json`

- [ ] **Step 1: Delete the old plant fixtures**

```bash
rm -rf tests/fixtures/plant-photos
rm -f tests/fixtures/plant-photos.manifest.json
```

- [ ] **Step 2: Create `tests/fixtures/appliance-photos/.gitignore`**

Directory + ignore file:
```bash
mkdir -p tests/fixtures/appliance-photos
```

Then create `tests/fixtures/appliance-photos/.gitignore` with:
```
*
!.gitignore
```

- [ ] **Step 3: Create `tests/fixtures/appliance-photos.manifest.json`**

```json
{
  "fixtures": [
    {
      "id": "dishwasher-drain-pump-1",
      "file": "dishwasher-drain-pump-1.jpg",
      "freeformText": "water remains in tub after cycle",
      "modelField": "",
      "errorCode": "LE",
      "expected": {
        "category": "dishwasher",
        "primaryCategory": "drain pump",
        "primaryCategoryAlternatives": ["drain", "pump"]
      }
    },
    {
      "id": "washer-drain-pump-1",
      "file": "washer-drain-pump-1.jpg",
      "freeformText": "won't drain, water stuck in drum",
      "modelField": "LG WM3900",
      "errorCode": "OE",
      "expected": {
        "category": "washer",
        "primaryCategory": "drain pump",
        "primaryCategoryAlternatives": ["drain", "pump"]
      }
    },
    {
      "id": "dryer-heating-element-1",
      "file": "dryer-heating-element-1.jpg",
      "freeformText": "drum turns but no heat",
      "modelField": "",
      "errorCode": "",
      "expected": {
        "category": "dryer",
        "primaryCategory": "heating element",
        "primaryCategoryAlternatives": ["element", "heat"],
        "callPro": false
      }
    },
    {
      "id": "fridge-compressor-1",
      "file": "fridge-compressor-1.jpg",
      "freeformText": "both fridge and freezer warm, compressor running",
      "modelField": "",
      "errorCode": "",
      "expected": {
        "category": "refrigerator",
        "primaryCategory": "compressor",
        "primaryCategoryAlternatives": ["sealed system", "refrigerant"],
        "callPro": true
      }
    },
    {
      "id": "oven-igniter-gas-1",
      "file": "oven-igniter-gas-1.jpg",
      "freeformText": "gas oven not heating, igniter glows weakly",
      "modelField": "",
      "errorCode": "",
      "expected": {
        "category": "oven",
        "primaryCategory": "igniter",
        "primaryCategoryAlternatives": ["gas valve", "ignition"],
        "callPro": true
      }
    }
  ],
  "instructions": "Add ~20–25 fixtures across the 5 categories (target 4–5 per category). Source photos from r/fixit posts (with permission), iFixit failure-mode galleries (CC-licensed where applicable), and personal appliances. Each fixture file lives in tests/fixtures/appliance-photos/ (gitignored).",
  "fixturePrep": {
    "filename": "Use neutral filenames (fixture-001.jpg). Filenames don't reach the LLM in the live app, but neutral names prevent reviewer bias.",
    "visibleText": "Crop out manufacturer labels, model stickers, repair-shop watermarks, and any visible text — UNLESS the fixture specifically tests 'with visible model sticker' (in which case freeformText/modelField should leave that field blank to test pure visual ID).",
    "freeformText": "Use neutral symptom descriptions a non-expert would give. Don't include diagnostic guesses in the manifest.",
    "exif": "EXIF is stripped by canvas re-encoding in the live app, so fixture EXIF doesn't matter for accuracy. Strip it anyway if sharing the set publicly.",
    "callProFixtures": "Critical safety check: every gas/sealed-refrigeration/electrical-hazard fixture should have expected.callPro: true and the scorer verifies the LLM matched."
  }
}
```

- [ ] **Step 4: Replace `scripts/quality-run.ts`**

```ts
// Manual quality runner. Run with: npm run quality
// Reads tests/fixtures/appliance-photos.manifest.json + tests/fixtures/appliance-photos/.
// Calls OpenRouter for each fixture, writes a report to quality-reports/<timestamp>.md.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { callOpenRouter } from '../src/lib/openrouter';
import { buildSystemPrompt, buildUserContent } from '../src/lib/prompt';
import { parseDiagnosisResponse } from '../src/lib/parser';
import { selectRelevantModes, type FailureMode } from '../src/lib/referenceData';

type Fixture = {
  id: string;
  file: string;
  freeformText: string;
  modelField: string;
  errorCode: string;
  expected: {
    category?: FailureMode['category'];
    primaryCategory: string;
    primaryCategoryAlternatives?: string[];
    callPro?: boolean;
  };
};

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL ?? 'qwen/qwen-2.5-vl-72b-instruct';
if (!apiKey) {
  console.error('OPENROUTER_API_KEY not set');
  process.exit(1);
}

const manifestPath = 'tests/fixtures/appliance-photos.manifest.json';
const photosDir = 'tests/fixtures/appliance-photos';
const reportsDir = 'quality-reports';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { fixtures: Fixture[] };

async function loadAsDataUrl(path: string): Promise<string> {
  const buf = readFileSync(path);
  const ext = path.toLowerCase().split('.').pop();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function matches(actual: string, expected: string): boolean {
  return actual.toLowerCase().includes(expected.toLowerCase());
}

function deriveCategoryHint(freeform: string, modelField: string): FailureMode['category'] | 'unknown' {
  const t = `${freeform} ${modelField}`.toLowerCase();
  if (/dishwasher/.test(t)) return 'dishwasher';
  if (/washer|washing machine/.test(t)) return 'washer';
  if (/dryer/.test(t)) return 'dryer';
  if (/fridge|refrigerator/.test(t)) return 'refrigerator';
  if (/oven|range|stove/.test(t)) return 'oven';
  return 'unknown';
}

async function run() {
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(reportsDir, `${stamp}.md`);

  let report = `# Quality run ${stamp}\n\nModel: \`${model}\`\n\n`;
  let categoryMatches = 0;
  let primaryMatches = 0;
  let callProMatches = 0;
  let callProRelevant = 0;
  let total = 0;

  for (const fx of manifest.fixtures) {
    const photoPath = join(photosDir, fx.file);
    if (!existsSync(photoPath)) {
      report += `## ${fx.id}\n\n_SKIPPED — fixture file missing at ${photoPath}_\n\n`;
      continue;
    }
    total++;

    const dataUrl = await loadAsDataUrl(photoPath);
    const categoryHint = deriveCategoryHint(fx.freeformText, fx.modelField);
    const refModes = selectRelevantModes(categoryHint, fx.errorCode || null);

    let result;
    try {
      const raw = await callOpenRouter({
        apiKey: apiKey!,
        model,
        systemPrompt: buildSystemPrompt(refModes),
        userContent: buildUserContent(dataUrl, fx.freeformText, fx.modelField, fx.errorCode),
        maxOutputTokens: 2000
      });
      result = parseDiagnosisResponse(raw.content);
    } catch (e) {
      report += `## ${fx.id}\n\n_ERROR: ${(e as Error).message}_\n\n`;
      continue;
    }

    const categoryOk = !fx.expected.category || result.appliance?.category === fx.expected.category;
    const primaryHits = [fx.expected.primaryCategory, ...(fx.expected.primaryCategoryAlternatives ?? [])];
    const primaryOk = primaryHits.some(c => matches(result.primary.name, c));

    let callProOk: boolean | null = null;
    if (typeof fx.expected.callPro === 'boolean') {
      callProRelevant++;
      callProOk = result.primary.recovery.callPro === fx.expected.callPro;
      if (callProOk) callProMatches++;
    }

    if (categoryOk) categoryMatches++;
    if (primaryOk) primaryMatches++;

    report += `## ${fx.id}\n\n`;
    report += `Appliance: ${result.appliance?.category ?? 'null'} (${categoryOk ? 'OK' : 'MISS'})\n`;
    report += `Primary: ${result.primary.name} @ ${Math.round(result.primary.confidence * 100)}% (${primaryOk ? 'OK' : 'MISS'})\n`;
    report += `callPro: ${result.primary.recovery.callPro}${callProOk === null ? '' : ' (' + (callProOk ? 'OK' : 'MISS') + ')'}\n`;
    report += `Rationale: ${result.primary.rationale}\n\n`;
    if (result.primary.recovery.diy.length > 0) {
      report += `DIY:\n`;
      for (const s of result.primary.recovery.diy) report += `- [${s.difficulty}] ${s.action}\n`;
    }
    if (result.primary.parts.length > 0) {
      report += `\nParts:\n`;
      for (const p of result.primary.parts) report += `- ${p.name}${p.partNumber ? ` (${p.partNumber})` : ''}${p.typicalCostUsd ? ` ${p.typicalCostUsd}` : ''}\n`;
    }
    report += `\n---\n\n`;
  }

  const summary = `Category match: ${categoryMatches}/${total} (${total > 0 ? Math.round(categoryMatches/total*100) : 0}%)\nPrimary match: ${primaryMatches}/${total} (${total > 0 ? Math.round(primaryMatches/total*100) : 0}%)\ncallPro correctness: ${callProMatches}/${callProRelevant} (${callProRelevant > 0 ? Math.round(callProMatches/callProRelevant*100) : 0}%)\n\n`;
  report = report.replace('Model:', summary + 'Model:');

  writeFileSync(reportPath, report);
  console.log(`Report written to ${reportPath}`);
  console.log(summary);
}

run().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 5: Verify the runner compiles** (won't run it — needs API key + fixtures)

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/appliance-photos.manifest.json tests/fixtures/appliance-photos/.gitignore scripts/quality-run.ts
git rm -rf tests/fixtures/plant-photos.manifest.json tests/fixtures/plant-photos/ 2>/dev/null || true
git commit -m "Add appliance quality fixture manifest + runner; remove plant fixtures"
```

---

## Phase 8 — Deploy

### Task 15: KV namespace, wrangler.toml, and secrets setup

**Working dir:** `~/Projects/slop/slop-appliance-doctor/`

- [ ] **Step 1: Verify wrangler auth**

```bash
npx wrangler whoami
```

Expected: your Cloudflare account info. If not logged in, `npx wrangler login`.

- [ ] **Step 2: Create the KV namespace (production + preview)**

```bash
npx wrangler kv namespace create DIAGNOSES
npx wrangler kv namespace create DIAGNOSES --preview
```

Note both returned IDs.

- [ ] **Step 3: Replace `wrangler.toml`**

```toml
name = "slop-appliance-doctor"
compatibility_date = "2026-05-01"

main = ".svelte-kit/cloudflare/_worker.js"

[assets]
directory = ".svelte-kit/cloudflare"
binding = "ASSETS"

[[kv_namespaces]]
binding = "DIAGNOSES"
id = "<production namespace id from Step 2>"
preview_id = "<preview namespace id from Step 2>"

[vars]
OPENROUTER_MODEL = "qwen/qwen-2.5-vl-72b-instruct"
DAILY_BUDGET_CENTS = "1000"
RATE_LIMIT_PER_HOUR = "10"
DAILY_CAP_PER_IP = "50"
MAX_OUTPUT_TOKENS = "2000"
```

- [ ] **Step 4: Get Turnstile keys**

Cloudflare Dashboard → Turnstile → Add site → use domain `slop-appliance-doctor.<your-workers-subdomain>.workers.dev` (or your custom domain if you'll set one). Copy both site key and secret. Save them somewhere accessible for the next steps.

- [ ] **Step 5: Update `.env` with the real Turnstile site key**

```
PUBLIC_TURNSTILE_SITE_KEY=<real Turnstile site key>
```

The build bakes this into the client bundle.

- [ ] **Step 6: Set the two server-side secrets**

```bash
npx wrangler secret put OPENROUTER_API_KEY
# Paste your OpenRouter API key

npx wrangler secret put TURNSTILE_SECRET_KEY
# Paste the Turnstile secret key
```

- [ ] **Step 7: Commit `wrangler.toml`**

```bash
git add wrangler.toml
git commit -m "Configure wrangler.toml for Workers deploy (KV + vars + main path)"
```

---

### Task 16: First deploy + smoke test

**Working dir:** `~/Projects/slop/slop-appliance-doctor/`

- [ ] **Step 1: Build**

```bash
npm run build
```

- [ ] **Step 2: Deploy**

```bash
npx wrangler deploy
```

Output gives you the Worker URL: `https://slop-appliance-doctor.<your-subdomain>.workers.dev`.

- [ ] **Step 3: Verify dashboard config**

Cloudflare dashboard → Workers & Pages → `slop-appliance-doctor` → Settings → Variables and Secrets. Confirm:
- 5 plaintext vars (from `[vars]`)
- 2 secrets (`OPENROUTER_API_KEY`, `TURNSTILE_SECRET_KEY`)
- KV binding `DIAGNOSES` visible under Bindings

- [ ] **Step 4: Smoke test**

Visit the Worker URL.
- Capture page renders with the new fields (model/serial + error code).
- Turnstile widget loads.
- Visit `/example` — appliance diagnosis renders.
- Submit a real diagnosis with a plant photo would test most of the flow, but for a real test: photo of an actual appliance (or a stock photo from r/fixit) + a brief description + maybe an error code. Verify the result page renders correctly.

- [ ] **Step 5: Tail logs (optional but recommended)**

```bash
npx wrangler tail
```

Submit another diagnosis. Watch the logs.

- [ ] **Step 6: Commit any final adjustments**

```bash
git add -A
git commit -m "First production deploy" --allow-empty
```

---

## Phase 9 — Wrap

### Task 17: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`**

```markdown
# Appliance Troubleshooter

Public, free, mobile-first web app: photo of a malfunctioning home appliance + a few words of context → structured diagnosis with appliance ID, ranked failure modes, DIY recovery steps with difficulty levels, "call a pro" recommendation when warranted, parts list, alternatives, and verification checks.

Second instance of the **Vision-LLM as Ambient Domain Expert** pattern (see `docs/superpowers/specs/2026-05-11-appliance-troubleshooter-design.md`). Plant Doctor was the first; the pattern + scaffolding compound across instances.

## Stack

SvelteKit (Svelte 5) + TypeScript on Cloudflare Workers + Static Assets. OpenRouter (default Qwen2.5-VL 72B) for diagnosis. KV for result persistence. Turnstile for abuse protection. Light hand-curated reference data table (~30+ failure modes across 5 categories) injected into the system prompt. No DB, no accounts, no image storage.

## Dev

```bash
cp .dev.vars.example .dev.vars
# Fill in OPENROUTER_API_KEY

cp .env.example .env
# .env contains PUBLIC_TURNSTILE_SITE_KEY (test value works for local dev)

npm install
npm run dev
```

Visit `http://localhost:5173`.

## Tests

```bash
npm run test:unit          # Vitest
npm run test:e2e           # Playwright (auto-builds)
npm test                   # both
npm run quality            # manual quality runner against the fixture set (requires OPENROUTER_API_KEY)
```

## Deploy

See `docs/superpowers/plans/2026-05-11-appliance-troubleshooter.md` Tasks 15–16.

Summary:
1. `wrangler kv namespace create DIAGNOSES` → update `wrangler.toml` with the namespace IDs
2. Get real Turnstile site + secret keys from CF dashboard
3. Put real site key in `.env`
4. `wrangler secret put OPENROUTER_API_KEY` and `TURNSTILE_SECRET_KEY`
5. `npm run build && npx wrangler deploy`

## Cost controls

Layered (env-tunable in `wrangler.toml [vars]` for non-secrets):
- Turnstile captcha
- Per-IP hourly rate limit (default 10/hour, `RATE_LIMIT_PER_HOUR`)
- Per-IP daily cap (default 50/day, `DAILY_CAP_PER_IP`)
- Global daily budget cap (default $10 USD, `DAILY_BUDGET_CENTS=1000`)

When the global cap is hit, the API returns 503 until the next UTC day.

## Reference data

`src/lib/referenceData.ts` is a hand-curated table of top failure modes per appliance category. Add entries as the quality runner reveals misses. See the file's structure for the schema.

## Docs

- Design spec: `docs/superpowers/specs/2026-05-11-appliance-troubleshooter-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-11-appliance-troubleshooter.md`
- Pattern + sibling instances: `../slop-ideas/VETTED.md`
```

- [ ] **Step 2: Commit + push**

```bash
git add README.md
git commit -m "Add README"
```

- [ ] **Step 3: Push to GitHub** (after creating the remote repo)

If the repo doesn't exist on GitHub yet:

```bash
gh repo create slop-appliance-doctor --private --source=. --remote=origin --push
```

If it does:

```bash
git push -u origin main
```

---

### Task 18: Mark Appliance Troubleshooter as shipped in slop-ideas

**Working dir:** `~/Projects/slop/slop-ideas/`

- [ ] **Step 1: Update Appliance Troubleshooter's entry in `VETTED.md`**

Find the Appliance Troubleshooter entry. Replace:
```
**Status:** ready-to-spec
```

With:
```
**Project repo:** `../slop-appliance-doctor/` (initialized 2026-05-11, deployed at https://slop-appliance-doctor.<your-subdomain>.workers.dev/)

**v2 backlog:** i18n (see cross-cutting note); affiliate links on parts list (data model already supports `partNumber` + `typicalCostUsd`); appliance memory / per-appliance history; full iFixit RAG (if curated reference data proves insufficient); multi-photo uploads.

**Status:** shipped
```

(Substitute the real deployed URL from Task 16's output.)

- [ ] **Step 2: Update the pattern entry's active-instances list**

Find `## [Pattern] Vision-LLM as Ambient Domain Expert` → `**Active instances:**` and change:
```
- Appliance Troubleshooter (ready-to-spec)
```

to:
```
- Appliance Troubleshooter (shipped)
```

- [ ] **Step 3: Commit**

```bash
git add VETTED.md
git commit -m "Mark Appliance Troubleshooter as shipped; new repo at ../slop-appliance-doctor/"
```

---

## Self-Review

**Spec coverage check** (every spec section → task):

- Architecture (delta from Plant Doctor) → Tasks 1–2 (bootstrap), 3 (types), 4 (schema), 5 (reference data), 6 (prompt), 7 (diagnose pipeline)
- Data flow (capture flow with two new fields; reference data injection logic) → Tasks 5, 7, 8
- LLM prompt + schema → Tasks 4, 6
- UI (capture page + result page) → Tasks 9, 10, 11, 13 (error page text)
- Reference Data (file, types, selector, seeding) → Task 5
- Cost Controls (inherited verbatim) → Already present from bootstrap; verified in Tasks 7, 8
- Error Handling (inherited + two new validation cases) → Task 8 (two new oversize-field 400s)
- Testing (unit + integration + E2E + quality fixtures) → Tasks 4, 5, 6, 7, 8, 12, 13, 14
- Monetization (deferred, no v1 task by design) → No task needed
- Open Questions → Implementation-time, no task needed

**Placeholder scan:** Searched the plan for "TBD" / "TODO" / "implement later" — none present. The reference-data seeding (Task 5 Step 3) is the only place with extensive content; that content is actually written out in the task, not deferred.

**Type consistency:**
- `DiagnosisResult` type name kept across the codebase (different shape than Plant Doctor's, same name).
- `FailureMode['category']` enum used consistently in `referenceData.ts` (5 categories), distinct from `ApplianceCategory` (5 + `'other'`) in `types.ts`. Selector function signature explicit about this.
- `RecoveryStep` shape: `{ action, difficulty }` (no `when` like Plant Doctor's) — consistent in schema, prompt, types, result page, example page.
- `Recovery` shape: `{ diy: RecoveryStep[], callPro: boolean, proReason?: string }` — consistent across schema, prompt, diagnose pipeline, result page, example page.
- `Part` shape: `{ name, partNumber?, typicalCostUsd? }` — consistent.
- `runDiagnose` signature includes `modelField` and `errorCode` — consistent in diagnose.ts, integration test, api-diagnose endpoint, e2e tests reference the same fields.

**Scope check:** Single coherent subsystem (one app, one repo). One plan is appropriate.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-11-appliance-troubleshooter.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task + two-stage review, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
