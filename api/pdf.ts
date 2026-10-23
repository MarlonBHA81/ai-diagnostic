/**
 * GET /api/pdf?id=<uuid>, Vercel Node function.
 *
 * Thin adapter over the framework-agnostic handlePdf(): builds a Web Request
 * from the Node request, delegates, and relays the Web Response (a redirect to
 * the hosted PDF). Runs on the Node runtime; pdf-lib is pure JS so there is no
 * headless browser and no size limit to worry about.
 */
import { handlePdf } from '../src/server/handlePdf';

export const config = { maxDuration: 15 };

declare const process: { env: Record<string, string | undefined> };

interface NodeReq {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface NodeRes {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: Buffer | string): void;
}

function header(h: string | string[] | undefined): string | undefined {
  return Array.isArray(h) ? h[0] : h;
}

export default async function handler(req: NodeReq, res: NodeRes): Promise<void> {
  const host = header(req.headers['x-forwarded-host']) ?? header(req.headers.host) ?? 'localhost';
  const proto = header(req.headers['x-forwarded-proto']) ?? 'https';
  const url = `${proto}://${host}${req.url ?? '/'}`;

  const response = await handlePdf(new Request(url, { method: req.method ?? 'GET' }), {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const body = Buffer.from(await response.arrayBuffer());
  res.end(body.length ? body : undefined);
}
