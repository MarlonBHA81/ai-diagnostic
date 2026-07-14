/**
 * POST /api/lead — Vercel Edge Function.
 * Thin adapter: reads env from process.env and delegates to the shared handler.
 */
import { handleLead } from '../src/server/handleLead';

export const config = { runtime: 'edge' };

// Vercel exposes configured env vars on process.env in the Edge runtime.
declare const process: { env: Record<string, string | undefined> };

export default function handler(request: Request): Promise<Response> {
  return handleLead(request, {
    LEAD_WEBHOOK_URL: process.env.LEAD_WEBHOOK_URL,
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NOTIFY_EMAIL: process.env.NOTIFY_EMAIL,
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
  });
}
