/**
 * GET /api/pdf?id=<uuid>
 *
 * Returns the hosted PDF report. Lazy + cached: if the PDF already exists in
 * Supabase Storage it redirects straight to it; otherwise it fetches the stored
 * diagnostic, renders a branded PDF with pdf-lib (no headless browser), uploads
 * it to the public `reports` bucket, and redirects to the file.
 *
 * Framework-agnostic: takes a Web Request and returns a Web Response, so the
 * Vercel adapter (api/pdf.ts) is a thin wrapper.
 */
import type { LeadEnv } from './handleLead';
import { fetchResult, UUID_RE } from './handleResult';
import { reportExists, reportPublicUrl, uploadReport } from './pdfStorage';
import { buildReportPdf } from './pdfDoc';
import { activeConfig } from '../config/active';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function handlePdf(request: Request, env: LeadEnv): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID_RE.test(id)) return json({ error: 'bad_id' }, 400);

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'not_configured' }, 404);
  }

  const publicUrl = reportPublicUrl(env, id);

  // Serve the cached file if it already exists.
  if (await reportExists(env, id)) {
    return Response.redirect(publicUrl, 302);
  }

  const event = await fetchResult(env, id);
  if (!event) return json({ error: 'not_found' }, 404);

  let bytes: Uint8Array;
  try {
    bytes = await buildReportPdf(event, activeConfig);
  } catch {
    return json({ error: 'render_failed' }, 500);
  }

  const ok = await uploadReport(env, id, bytes);
  if (!ok) return json({ error: 'upload_failed' }, 502);

  return Response.redirect(publicUrl, 302);
}
