/**
 * Client for the serverless /api/lead route. The browser never sees the webhook
 * URL or email key — it only talks to our own same-origin route, which forwards
 * to LEAD_WEBHOOK_URL. Progression must never block on webhook failure, so all
 * calls here swallow errors and resolve.
 */
import type { LeadCapturedEvent, DiagnosticCompletedEvent } from './events';

const ENDPOINT = '/api/lead';

async function postEvent(
  body: LeadCapturedEvent | DiagnosticCompletedEvent,
): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function sendLeadCaptured(event: LeadCapturedEvent): Promise<boolean> {
  return postEvent(event);
}

export function sendDiagnosticCompleted(
  event: DiagnosticCompletedEvent,
): Promise<boolean> {
  return postEvent(event);
}
