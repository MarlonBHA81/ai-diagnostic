/**
 * GET /api/pdf?id=<uuid>, Vercel Node function.
 *
 * Thin adapter over the framework-neutral handlePdf(): reads the id and env,
 * and either redirects to the hosted PDF or returns a JSON error. pdf-lib is
 * pure JS (no headless browser), so this is small, fast, and reliable on Hobby.
 */
import { handlePdf } from '../src/server/handlePdf';

export const config = { maxDuration: 15 };

declare const process: { env: Record<string, string | undefined> };

interface VReq {
  query: Record<string, string | string[] | undefined>;
}
interface VRes {
  status(code: number): VRes;
  json(body: unknown): void;
  redirect(code: number, url: string): void;
}

export default async function handler(req: VReq, res: VRes): Promise<void> {
  const raw = req.query.id;
  const id = Array.isArray(raw) ? raw[0] : raw ?? '';

  const result = await handlePdf(id, {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (result.location) {
    res.redirect(302, result.location);
    return;
  }
  res.status(result.status).json({ error: result.error ?? 'error' });
}
