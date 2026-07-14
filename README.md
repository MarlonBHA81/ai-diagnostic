# The 7-Zone Business Diagnostic — Accounting Firm Edition

A **Story Advantage** lead-generating diagnostic quiz. Accounting-firm partners
enter their details **up front**, score their firm across 7 zones × 5 dimensions,
and get their **binding constraint** — the one bottleneck AI should fix first —
plus a results dashboard and an emailed report. Even an abandoned quiz produces a
usable lead, because contact details are captured before the questions start.

Built from the source-of-truth prototype (`7zonediagnosticquiz`) with two
deliberate changes: **lead capture moved to the start**, and **all money fields
made multi-currency**. Brand styling is Story Advantage's, from the brand manual.

```
Welcome + Details (the gate) → Firm Baseline → Zone 1 … Zone 7 → Results
```

## Stack

- **Frontend:** Vite + React + TypeScript, hand-rolled CSS on a design-token file
  (`src/styles/tokens.css`). Mobile-first, solid down to 360px.
- **Backend:** one serverless route, `POST /api/lead`, as a **Cloudflare Pages
  Function** (`functions/api/lead.ts`). The browser never sees the webhook URL or
  email key.
- **No database, no cookies, no localStorage for answers.** The n8n webhook owns
  persistence. Quiz state is in-memory only.
- **Email:** report to the prospect via **Resend** (skipped silently if unset).

## Develop

```bash
npm install
npm run dev        # Vite dev server
npm test           # unit tests (scoring, currency, phone, email)
npm run build      # tsc + vite build → dist/
npm run typecheck
```

The accounting vertical is served at `/accounting` conceptually; the app mounts
the accounting config by default (`src/main.tsx`). Route: **`/accounting`**.

## Deploy (Cloudflare Pages)

```bash
npm run build
npx wrangler pages deploy dist
```

Set environment variables in **Pages → Settings → Variables & Secrets** (or
`wrangler pages secret put <NAME>`), for both Production and Preview:

| Variable | Required | Purpose |
|---|---|---|
| `LEAD_WEBHOOK_URL` | yes | n8n webhook; receives both events. |
| `EMAIL_API_KEY` | no | Resend API key. Report email skipped if unset. |
| `EMAIL_FROM` | no | e.g. `diagnostics@storyadvantage.co`. Required to send email. |
| `NOTIFY_EMAIL` | no | Internal "new lead" alert address. |
| `ALLOWED_ORIGIN` | no | CORS lock for `/api/lead` (the app's exact origin). |

For local function testing: copy `.env.example` → `.dev.vars`, then
`npx wrangler pages dev dist`.

## Webhook events (n8n setup)

Both events are forwarded by `/api/lead` to `LEAD_WEBHOOK_URL`. The two-event
design lets you tag **abandoners** (got event 1, never got event 2) for a
"finish your diagnostic" follow-up.

**Event 1 — `lead_captured`** (fired when details are submitted, before Zone 1):

```json
{
  "event": "lead_captured",
  "capturedAt": "2026-07-14T09:00:00.000Z",
  "source": "accounting-diagnostic",
  "lead": { "firstName": "", "lastName": "", "businessName": "", "email": "", "mobile": "+27…" }
}
```

**Event 2 — `diagnostic_completed`** (fired on results render):

```json
{
  "event": "diagnostic_completed",
  "completedAt": "2026-07-14T09:12:00.000Z",
  "source": "accounting-diagnostic",
  "lead": { "firstName": "", "lastName": "", "businessName": "", "email": "", "mobile": "" },
  "baseline": { "currency": "ZAR", "monthlyRevenue": null, "teamSize": null, "chargeOutRate": null },
  "bindingConstraint": "Client Delivery",
  "constraintVotes": 2,
  "constraintMonthlyCost": null,
  "zones": [
    { "zone": "", "hoursPerWeek": 0, "repetitiveness": 0, "aiUsage": "None", "marginImpact": "Low", "partnerInvolvement": 0, "compressionScore": 0, "bottleneck": "", "desiredFix": "" }
  ]
}
```

**n8n:** create a Webhook node (POST), point `LEAD_WEBHOOK_URL` at its URL, and
branch on `{{$json.event}}`. Match a completed diagnostic to its lead by `email`
(the `lead` block repeats in both events). To catch abandoners, wait ~24h after a
`lead_captured` and check whether a `diagnostic_completed` with the same email
arrived.

The `/api/lead` route drops the internal `antiSpam` field before forwarding, so
n8n never sees the honeypot/timing data.

## Anti-spam

- **Honeypot** — a hidden `company_website` field. If filled, the request is
  rejected server-side.
- **Timing** — a `diagnostic_completed` arriving under **60 seconds** after the
  gate was passed is rejected as a bot.
- **Email** is validated on the client *and* re-validated server-side.

## Currency behaviour

The baseline screen has a segmented selector: **R ZAR (default)**, **$ USD**,
**€ EUR**, **£ GBP**. The chosen currency drives every money display and the
report email — symbol, and thousands grouping via `Intl.NumberFormat` with the
matching locale (`en-ZA`, `en-US`, `en-IE`, `en-GB`). It's included in the
`diagnostic_completed` payload. **Changing currency reformats displays; it never
converts values.**

> Note: the exact group separator (space vs comma) for a locale is decided by the
> runtime's ICU/CLDR data, so `R 84 000` vs `R 84,000` can differ between the
> browser and the email server. Both are correct locale output.

## Scoring (identical to the prototype)

- **Compression Score** = `hours × repetitiveness × (6 − aiUsage)`.
- **Test 1 (volume):** max `hours × repetitiveness`; tiebreak compression.
- **Test 2 (margin):** max margin impact → tiebreak min AI usage → tiebreak compression.
- **Test 3 (partner):** max partner involvement; tiebreak compression.
- **Binding constraint** = mode of the three winners; on a 1-1-1 split, the
  highest compression among them wins. `votes` is recorded.
- If a charge-out rate is given, monthly cost = `hours × 4.33 × rate`, formatted
  in the selected currency.

Unit tests cover the compression math, all three tests and their tiebreaks, the
1-1-1 case, cost formatting in all four currencies, ZA (+27) mobile validation,
and report-email rendering (including XSS escaping of free-text).

## Embedding (WordPress / Divi)

The app reports its height to the parent frame (`postMessage`) so the iframe can
auto-resize. Paste this where you want the diagnostic:

```html
<iframe
  id="sa-diagnostic"
  src="https://YOUR-PAGES-DOMAIN/"
  title="The 7-Zone Business Diagnostic"
  style="width:100%;border:0;min-height:900px"
  loading="lazy"></iframe>
<script>
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.type === 'sa-diagnostic:height' && typeof d.height === 'number') {
      var f = document.getElementById('sa-diagnostic');
      if (f) f.style.height = d.height + 'px';
    }
  });
</script>
```

Embedding is allowed only from origins listed in `public/_headers`
(`Content-Security-Policy: frame-ancestors`). Add your WordPress domain there.

## Analytics

If a `window.dataLayer` is present (GTM), the app pushes: `diagnostic_started`,
`lead_submitted`, `zone_completed` (with `zone` id), `results_viewed`. No-op
otherwise.

## Industry templating

All accounting copy lives in `src/config/industries/accounting.ts`, typed against
`src/config/IndustryConfig.ts`. The scoring engine and brand tokens are
industry-agnostic — add a vertical by writing one config file.

## Ship checklist

- [ ] `LEAD_WEBHOOK_URL` set; n8n workflow live and handling both events.
- [ ] `EMAIL_API_KEY` + `EMAIL_FROM` set (or intentionally left off).
- [ ] `ALLOWED_ORIGIN` set to the app's origin.
- [ ] Real **CTA text + URL** and **privacy policy URL** filled in
      (`src/config/industries/accounting.ts`, `src/config/app.ts`).
- [ ] Real **logo** dropped into `src/components/Logo.tsx` (currently an inline
      SVG placeholder in brand colours).
- [ ] WordPress domain added to `public/_headers` `frame-ancestors`.
- [ ] Verified the embed on the target WordPress/Divi page.
```
