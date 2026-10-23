/**
 * Core logic for GET /api/pdf?id=<uuid>.
 *
 * Lazy + cached: if the PDF already exists in Supabase Storage it points
 * straight at it; otherwise it fetches the stored diagnostic, renders a branded
 * PDF with pdf-lib (no headless browser), uploads it to the public `reports`
 * bucket, and points at the file.
 *
 * Framework-neutral: takes a plain id + env and returns a plain result, so the
 * platform adapter (api/pdf.ts) stays tiny and uses no Web/Node-specific globals
 * beyond fetch.
 */
import type { LeadEnv } from './handleLead';
import { fetchResult } from './handleResult';
import { reportExists, reportPublicUrl, uploadReport } from './pdfStorage';
import { buildReportPdf } from './pdfDoc';
import { activeConfig } from '../config/active';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PdfResult {
  /** A 302 redirect target when the PDF is ready. */
  location?: string;
  /** HTTP status for an error response (ignored when `location` is set). */
  status: number;
  /** JSON error body. */
  error?: string;
}

export async function handlePdf(id: string, env: LeadEnv): Promise<PdfResult> {
  if (!UUID_RE.test(id)) return { status: 400, error: 'bad_id' };

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 404, error: 'not_configured' };
  }

  const publicUrl = reportPublicUrl(env, id);

  // Serve the cached file if it already exists.
  if (await reportExists(env, id)) return { status: 302, location: publicUrl };

  const event = await fetchResult(env, id);
  if (!event) return { status: 404, error: 'not_found' };

  let bytes: Uint8Array;
  try {
    bytes = await buildReportPdf(event, activeConfig);
  } catch {
    return { status: 500, error: 'render_failed' };
  }

  const ok = await uploadReport(env, id, bytes);
  if (!ok) return { status: 502, error: 'upload_failed' };

  return { status: 302, location: publicUrl };
}
