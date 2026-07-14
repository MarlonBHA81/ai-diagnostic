/**
 * GET /api/result — Vercel Edge Function. Thin adapter over the shared handler.
 */
import { handleResult } from '../src/server/handleResult';

export const config = { runtime: 'edge' };

declare const process: { env: Record<string, string | undefined> };

export default function handler(request: Request): Promise<Response> {
  return handleResult(request, {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
