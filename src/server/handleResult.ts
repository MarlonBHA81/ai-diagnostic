/**
 * GET /api/result?id=<uuid> — returns a stored diagnostic_completed payload from
 * Supabase so the shareable results page (/r/:id) can render it. Read-only,
 * public (results are shared by link); the service key stays server-side.
 */
import type { LeadEnv } from './handleLead';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export async function handleResult(request: Request, env: LeadEnv): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID_RE.test(id)) return json({ error: 'bad_id' }, 400);

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'not_configured' }, 404);
  }

  const url =
    `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/diagnostics` +
    `?id=eq.${encodeURIComponent(id)}&select=payload&limit=1`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  } catch {
    return json({ error: 'upstream' }, 502);
  }
  if (!res.ok) return json({ error: 'upstream' }, 502);

  const rows = (await res.json()) as Array<{ payload: unknown }>;
  if (!rows.length) return json({ error: 'not_found' }, 404);

  return json({ result: rows[0].payload }, 200);
}
