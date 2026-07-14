/**
 * Framework-agnostic handler for POST /api/lead.
 *
 * Takes a standard Web `Request` and returns a `Response`, so it runs
 * unchanged on Vercel (Edge) and Cloudflare Pages Functions — the platform
 * files are thin adapters that just pass `request` and the env object here.
 *
 * The browser only ever talks to this same-origin route; the webhook URL and
 * email key never reach the client. Responsibilities:
 *   - CORS lock to ALLOWED_ORIGIN (if set).
 *   - Server-side email validation.
 *   - Anti-spam: reject a filled honeypot; reject a diagnostic completed < 60s
 *     after the gate was passed.
 *   - Forward the (cleaned) event to LEAD_WEBHOOK_URL, retrying once.
 *   - On diagnostic_completed, email the prospect their report via Resend
 *     (skipped silently if EMAIL_API_KEY / EMAIL_FROM are unset).
 * Progression is never blocked on webhook/email failure — this returns 200 as
 * long as the request itself is well-formed and not spam.
 */
import { isValidEmail } from '../lib/validation';
import { renderReport } from '../email/renderReport';
import { activeConfig } from '../config/active';
import type { LeadCapturedEvent, DiagnosticCompletedEvent } from '../lib/events';

export interface LeadEnv {
  LEAD_WEBHOOK_URL?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  NOTIFY_EMAIL?: string;
  ALLOWED_ORIGIN?: string;
}

type LeadEvent = LeadCapturedEvent | DiagnosticCompletedEvent;

const MIN_QUIZ_MS = 60_000;

function corsHeaders(env: LeadEnv, origin: string | null): Record<string, string> {
  // When a lock is configured, advertise it; otherwise reflect the caller
  // (same-origin embeds) or fall back to '*'.
  const value = env.ALLOWED_ORIGIN ?? origin ?? '*';
  return {
    'Access-Control-Allow-Origin': value,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  });
}

/** Handle any method on /api/lead (OPTIONS preflight, POST, else 405). */
export async function handleLead(request: Request, env: LeadEnv): Promise<Response> {
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(env, origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, cors);
  }

  // Origin lock: reject cross-origin POSTs when a lock is set and mismatched.
  if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
    return json({ ok: false, error: 'origin_not_allowed' }, 403, cors);
  }

  let event: LeadEvent;
  try {
    event = (await request.json()) as LeadEvent;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400, cors);
  }

  if (!event || (event.event !== 'lead_captured' && event.event !== 'diagnostic_completed')) {
    return json({ ok: false, error: 'unknown_event' }, 400, cors);
  }

  // Server-side email validation (mirrors the client).
  if (!event.lead || !isValidEmail(event.lead.email)) {
    return json({ ok: false, error: 'invalid_email' }, 400, cors);
  }

  // Anti-spam: honeypot must be empty.
  const anti = event.antiSpam;
  if (anti?.honeypot && anti.honeypot.trim() !== '') {
    return json({ ok: false, error: 'rejected' }, 400, cors);
  }

  // Anti-spam: a completed diagnostic under 60s from the gate is a bot.
  if (event.event === 'diagnostic_completed' && anti?.startedAt) {
    const elapsed = Date.now() - anti.startedAt;
    if (elapsed >= 0 && elapsed < MIN_QUIZ_MS) {
      return json({ ok: false, error: 'too_fast' }, 400, cors);
    }
  }

  // Clean payload for downstream (drop anti-spam internals).
  const { antiSpam: _drop, ...clean } = event as LeadEvent & { antiSpam?: unknown };
  void _drop;

  const forwarded = await forwardWebhook(env.LEAD_WEBHOOK_URL, clean);

  // Email the report on completion (best-effort; never blocks the response).
  if (event.event === 'diagnostic_completed') {
    await sendReportEmail(env, event).catch(() => undefined);
  }

  return json({ ok: true, forwarded }, 200, cors);
}

/** POST the event to the n8n webhook, retrying once on failure. */
async function forwardWebhook(url: string | undefined, payload: unknown): Promise<boolean> {
  if (!url) return false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
    } catch {
      // fall through to retry
    }
  }
  return false;
}

/** Send the prospect's report (and optional internal alert) via Resend. */
async function sendReportEmail(env: LeadEnv, event: DiagnosticCompletedEvent): Promise<void> {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) return; // skip silently if unconfigured

  const report = renderReport(event, activeConfig);

  await resendSend(env.EMAIL_API_KEY, {
    from: env.EMAIL_FROM,
    to: event.lead.email,
    subject: report.subject,
    html: report.html,
    text: report.text,
  });

  if (env.NOTIFY_EMAIL) {
    await resendSend(env.EMAIL_API_KEY, {
      from: env.EMAIL_FROM,
      to: env.NOTIFY_EMAIL,
      subject: `New diagnostic: ${event.lead.businessName || event.lead.email} → ${event.bindingConstraint}`,
      text: `${event.lead.firstName} ${event.lead.lastName} (${event.lead.businessName})\n${event.lead.email} · ${event.lead.mobile}\nBinding constraint: ${event.bindingConstraint} (${event.constraintVotes}/3)`,
    }).catch(() => undefined);
  }
}

interface ResendMessage {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text: string;
}

async function resendSend(apiKey: string, msg: ResendMessage): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(msg),
  });
}
