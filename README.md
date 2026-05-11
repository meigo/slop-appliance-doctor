# Appliance Troubleshooter

Public, free, mobile-first web app: photo of a malfunctioning home appliance + a few words of context → structured diagnosis with appliance ID, ranked failure modes, DIY recovery steps with difficulty levels, "call a pro" recommendation when warranted, parts list, alternatives, and verification checks.

Second instance of the **Vision-LLM as Ambient Domain Expert** pattern (see `docs/superpowers/specs/2026-05-11-appliance-troubleshooter-design.md`). Plant Doctor was the first; the pattern + scaffolding compound across instances.

## Stack

SvelteKit (Svelte 5) + TypeScript on Cloudflare Workers + Static Assets. OpenRouter (default Qwen2.5-VL 72B) for diagnosis. KV for result persistence. Turnstile for abuse protection. Light hand-curated reference data table (~34 failure modes across 5 categories) injected into the system prompt. Tailwind v4 + Lucide + IBM Plex Mono with dark-default theme via the shared style system (see `../slop-ideas/STYLE.md`). No DB, no accounts, no image storage.

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
1. `wrangler kv namespace create slop-appliance-doctor-DIAGNOSES` → update `wrangler.toml` with the namespace IDs
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

`src/lib/referenceData.ts` is a hand-curated table of top failure modes per appliance category (dishwasher / washer / dryer / refrigerator / oven). Add entries as the quality runner reveals misses. See the file's structure for the schema.

## Style system

This repo follows the shared style system documented in `../slop-ideas/STYLE.md`. Full design spec: `../slop-ideas/docs/superpowers/specs/2026-05-11-shared-style-system-design.md`.

## Docs

- Design spec: `docs/superpowers/specs/2026-05-11-appliance-troubleshooter-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-11-appliance-troubleshooter.md`
- Pattern + sibling instances: `../slop-ideas/VETTED.md`
