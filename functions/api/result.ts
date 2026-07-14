/**
 * GET /api/result — Cloudflare Pages Function (alternate host).
 */
import { handleResult } from '../../src/server/handleResult';
import type { LeadEnv } from '../../src/server/handleLead';

export function onRequest(ctx: { request: Request; env: LeadEnv }): Promise<Response> {
  return handleResult(ctx.request, ctx.env);
}
