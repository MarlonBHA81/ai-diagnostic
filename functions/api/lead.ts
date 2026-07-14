/**
 * /api/lead — Cloudflare Pages Function (alternate host).
 * Thin adapter over the shared handler; Cloudflare passes env in the context.
 * The primary deployment target is Vercel (see api/lead.ts); this file lets the
 * same code also run on Cloudflare Pages unchanged.
 */
import { handleLead, type LeadEnv } from '../../src/server/handleLead';

export function onRequest(ctx: { request: Request; env: LeadEnv }): Promise<Response> {
  return handleLead(ctx.request, ctx.env);
}
