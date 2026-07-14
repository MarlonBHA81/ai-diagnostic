import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestPost } from './lead';
import type { LeadCapturedEvent, DiagnosticCompletedEvent } from '../../src/lib/events';

function req(body: unknown, origin?: string): Request {
  return new Request('https://app.example/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(body),
  });
}

const validLead: LeadCapturedEvent = {
  event: 'lead_captured',
  capturedAt: '2026-07-14T09:00:00.000Z',
  source: 'accounting-diagnostic',
  lead: {
    firstName: 'Thabo',
    lastName: 'Nkosi',
    businessName: 'Nkosi & Partners',
    email: 'thabo@nkosi.co.za',
    mobile: '+27821234567',
  },
  antiSpam: { honeypot: '', startedAt: Date.now() },
};

describe('POST /api/lead', () => {
  beforeEach(() => {
    // Stub outbound fetch (webhook forward) so no real network is hit.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('accepts a valid lead_captured and forwards it', async () => {
    const res = await onRequestPost({ request: req(validLead), env: { LEAD_WEBHOOK_URL: 'https://n8n.example/hook' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, forwarded: true });
    // The forwarded payload must NOT include antiSpam internals.
    const forwarded = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(forwarded.antiSpam).toBeUndefined();
    expect(forwarded.event).toBe('lead_captured');
  });

  it('rejects an invalid email', async () => {
    const bad = { ...validLead, lead: { ...validLead.lead, email: 'not-an-email' } };
    const res = await onRequestPost({ request: req(bad), env: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_email');
  });

  it('rejects a filled honeypot', async () => {
    const bot = { ...validLead, antiSpam: { honeypot: 'http://spam', startedAt: Date.now() } };
    const res = await onRequestPost({ request: req(bot), env: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('rejected');
  });

  it('rejects a diagnostic completed under 60 seconds', async () => {
    const fast: DiagnosticCompletedEvent = {
      event: 'diagnostic_completed',
      completedAt: '2026-07-14T09:00:30.000Z',
      source: 'accounting-diagnostic',
      lead: validLead.lead,
      baseline: { currency: 'ZAR', monthlyRevenue: null, teamSize: null, chargeOutRate: null },
      bindingConstraint: 'Client Delivery',
      constraintVotes: 3,
      constraintMonthlyCost: null,
      zones: [],
      antiSpam: { honeypot: '', startedAt: Date.now() - 10_000 }, // 10s ago
    };
    const res = await onRequestPost({ request: req(fast), env: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('too_fast');
  });

  it('blocks a cross-origin POST when ALLOWED_ORIGIN is set and mismatched', async () => {
    const res = await onRequestPost({
      request: req(validLead, 'https://evil.example'),
      env: { ALLOWED_ORIGIN: 'https://app.example' },
    });
    expect(res.status).toBe(403);
  });

  it('still returns 200 when the webhook fails (never blocks the client)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const res = await onRequestPost({ request: req(validLead), env: { LEAD_WEBHOOK_URL: 'https://n8n.example/hook' } });
    expect(res.status).toBe(200);
    expect((await res.json())).toMatchObject({ ok: true, forwarded: false });
  });
});
