# The 7-Zone Business Diagnostic — Accounting Firm Edition

A Story Advantage lead-generating diagnostic quiz. Prospects (accounting-firm
partners/owners) enter their details **up front**, score their firm across
7 zones × 5 dimensions, and receive their **binding constraint** — the one
bottleneck AI should fix first — plus a results dashboard and an emailed report.

> **Status: foundation in place, blocked on two source inputs.**
> The industry-agnostic core (scoring engine, multi-currency formatting, typed
> industry-config interface) is built and unit-tested. The remaining screens,
> API route, and report email are pending the two inputs listed below.

## Stack

- **Frontend:** Vite + React + TypeScript, hand-rolled CSS on a design-token file.
- **Backend:** one serverless route `POST /api/lead` (host TBD — Vercel/Cloudflare).
- No database, no cookies, no localStorage for answers. The n8n webhook owns
  persistence.

## What's built and verified

- `src/scoring/` — compression score + the three synthesis tests (volume,
  margin, partner) with exact tiebreaks, binding-constraint selection (mode of
  the three winners, 1-1-1 tiebroken by compression), and monthly-cost math.
- `src/currency/` — `Intl.NumberFormat`-based formatting for ZAR/USD/EUR/GBP,
  default ZAR. Changing currency reformats, never converts.
- `src/config/IndustryConfig.ts` — the typed interface all vertical copy
  implements. Scoring and brand tokens stay industry-agnostic.
- `src/scoring/engine.test.ts`, `src/currency/currency.test.ts` — 26 passing
  tests (compression math, all three tests + tiebreaks, the 1-1-1 case,
  cost formatting in all four currencies).

Run the tests:

```bash
npm install
npm test
```

## Blocked on (needed to continue)

1. **The prototype** `7-zone-diagnostic-accounting-firm.html` — the verbatim
   source for zone descriptions, "Think:" lines, question wording, AI-usage
   descriptions, next-step examples, free-text placeholders, and the Simkin
   quote. Not present in this environment.
2. **Story Advantage brand tokens** — from the `storybrand-landing-page` skill
   (`references/voice-and-brand-system.md`, `assets/template.html`). Needed to
   author `src/styles/tokens.css` without inventing colours.

Plus the unfilled spec placeholders (logo, privacy URL, CTA text/URL, host
choice, email provider, default country, WordPress domain).

## Environment variables (for the serverless route, once built)

```
LEAD_WEBHOOK_URL=   # n8n webhook, receives lead_captured + diagnostic_completed
EMAIL_API_KEY=      # optional; report email skipped silently if unset
EMAIL_FROM=         # e.g. diagnostics@<domain>
NOTIFY_EMAIL=       # optional internal "new lead" alert
ALLOWED_ORIGIN=     # CORS lock for /api/lead
```
