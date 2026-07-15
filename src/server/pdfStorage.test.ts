import { describe, it, expect, vi, afterEach } from 'vitest';
import { reportPublicUrl, reportExists, uploadReport } from './pdfStorage';
import type { LeadEnv } from './handleLead';

const env: LeadEnv = {
  SUPABASE_URL: 'https://proj.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
};

const ID = '1a08ad3b-a318-43c9-af4d-761f9c42f8b7';

describe('pdfStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the public URL for the reports bucket', () => {
    expect(reportPublicUrl(env, ID)).toBe(
      `https://proj.supabase.co/storage/v1/object/public/reports/${ID}.pdf`,
    );
  });

  it('strips a trailing slash on SUPABASE_URL', () => {
    expect(reportPublicUrl({ ...env, SUPABASE_URL: 'https://proj.supabase.co/' }, ID)).toBe(
      `https://proj.supabase.co/storage/v1/object/public/reports/${ID}.pdf`,
    );
  });

  describe('reportExists', () => {
    it('is true when the HEAD request is ok', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })));
      expect(await reportExists(env, ID)).toBe(true);
      const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [string, RequestInit];
      expect(call[0]).toContain(`/public/reports/${ID}.pdf`);
      expect(call[1].method).toBe('HEAD');
    });

    it('is false on a 404', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
      expect(await reportExists(env, ID)).toBe(false);
    });

    it('is false when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
      expect(await reportExists(env, ID)).toBe(false);
    });
  });

  describe('uploadReport', () => {
    it('POSTs the bytes with upsert + auth headers and returns true', async () => {
      const spy = vi.fn(async () => new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', spy);

      const bytes = new Uint8Array([1, 2, 3]);
      expect(await uploadReport(env, ID, bytes)).toBe(true);

      const call = spy.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
      const [url, opts] = call;
      expect(url).toBe(`https://proj.supabase.co/storage/v1/object/reports/${ID}.pdf`);
      expect(opts.method).toBe('POST');
      expect(opts.headers['content-type']).toBe('application/pdf');
      expect(opts.headers['x-upsert']).toBe('true');
      expect(opts.headers.Authorization).toBe('Bearer service-key');
      expect(opts.headers.apikey).toBe('service-key');
      expect(opts.body).toBe(bytes);
    });

    it('returns false on upload error', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 400 })));
      expect(await uploadReport(env, ID, new Uint8Array([1]))).toBe(false);
    });

    it('skips (false) when Supabase env is missing', async () => {
      const spy = vi.fn();
      vi.stubGlobal('fetch', spy);
      expect(await uploadReport({}, ID, new Uint8Array([1]))).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
