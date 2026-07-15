/**
 * Supabase Storage helpers for the hosted PDF report. The PDF lives in a public
 * bucket named `reports` at `reports/<id>.pdf`. Plain fetch — no SDK.
 */
import type { LeadEnv } from './handleLead';

const BUCKET = 'reports';

function base(env: LeadEnv): string {
  return (env.SUPABASE_URL ?? '').replace(/\/+$/, '');
}

/** Public URL of a stored report (bucket must be public). */
export function reportPublicUrl(env: LeadEnv, id: string): string {
  return `${base(env)}/storage/v1/object/public/${BUCKET}/${id}.pdf`;
}

/** True if the report already exists in storage (so we can skip regenerating). */
export async function reportExists(env: LeadEnv, id: string): Promise<boolean> {
  try {
    const r = await fetch(reportPublicUrl(env, id), { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

/** Upload (upsert) the PDF bytes to storage. Returns true on success. */
export async function uploadReport(
  env: LeadEnv,
  id: string,
  bytes: Uint8Array,
): Promise<boolean> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const url = `${base(env)}/storage/v1/object/${BUCKET}/${id}.pdf`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/pdf',
      'x-upsert': 'true',
    },
    // Node/undici fetch accepts a Uint8Array body; DOM's BodyInit type is stricter.
    body: bytes as unknown as BodyInit,
  });
  return r.ok;
}
