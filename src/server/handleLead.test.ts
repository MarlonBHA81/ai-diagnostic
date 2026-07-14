import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleLead } from './handleLead';
import type { LeadCapturedEvent, DiagnosticCompletedEvent } from '../lib/events';

function req(body: unknown, origin?: string, method = 'POST'): Request {
  return new Request('https://app.example/api/lead', {
    method,
    headers: { 'content-type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: method === 'GET' || method === 'OPTIONS' ? undefined : JSON.stringify(body),
  });
}

const validLead: LeadCapturedEvent = {
  event: 'lead_captured',
  capturedAt: '2026-07-14T09:00:00.000Z',
  source: 'business-diagnostic',
  lead: {
    firstName: 'Sam',
    lastName: 'Lee',
    businessName: 'Acme Studio',
    email: 'sam@acme.com',
    mobile: '+27821234567',
  },
  antiSpam: { honeypot: '', startedAt: Date.now() },
};

describe('handleLead (shared /api/lead handler)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('answers an OPTIONS preflight with CORS headers', async () => {
    const res = await handleLead(req(null, 'https://app.example', 'OPTIONS'), {});
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('accepts a valid lead_captured and forwards it (without antiSpam)', async () => {
    const res = await handleLead(req(validLead), { LEAD_WEBHOOK_URL: 'https://n8n.example/hook' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, forwarded: true });
    const forwarded = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(forwarded.antiSpam).toBeUndefined();
    expect(forwarded.event).toBe('lead_captured');
  });

  it('rejects an invalid email', async () => {
    const bad = { ...validLead, lead: { ...validLead.lead, email: 'not-an-email' } };
    const res = await handleLead(req(bad), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_email');
  });

  it('rejects a filled honeypot', async () => {
    const bot = { ...validLead, antiSpam: { honeypot: 'http://spam', startedAt: Date.now() } };
    const res = await handleLead(req(bot), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('rejected');
  });

  it('rejects a diagnostic completed under 60 seconds', async () => {
    const fast: DiagnosticCompletedEvent = {
      event: 'diagnostic_completed',
      completedAt: '2026-07-14T09:00:30.000Z',
      source: 'business-diagnostic',
      lead: validLead.lead,
      baseline: { currency: 'ZAR', monthlyRevenue: null, teamSize: null, chargeOutRate: null },
      bindingConstraint: 'Delivery',
      constraintVotes: 3,
      constraintMonthlyCost: null,
      zones: [],
      antiSpam: { honeypot: '', startedAt: Date.now() - 10_000 },
    };
    const res = await handleLead(req(fast), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('too_fast');
  });

  it('blocks a cross-origin POST when ALLOWED_ORIGIN is set and mismatched', async () => {
    const res = await handleLead(req(validLead, 'https://evil.example'), { ALLOWED_ORIGIN: 'https://app.example' });
    expect(res.status).toBe(403);
  });

  it('still returns 200 when the webhook fails (never blocks the client)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const res = await handleLead(req(validLead), { LEAD_WEBHOOK_URL: 'https://n8n.example/hook' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, forwarded: false });
  });
});
