/**
 * GET /api/pdf?id=<uuid> — Vercel Node function.
 *
 * Renders the shared results page (/r/:id) to a real PDF with headless Chromium,
 * stores it in Supabase Storage (bucket `reports`), and redirects to the hosted
 * file. Lazy + cached: if the PDF already exists it redirects immediately, so it
 * only generates on the first request per result.
 *
 * Node runtime (not Edge) — Chromium needs Node APIs.
 */
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { reportExists, reportPublicUrl, uploadReport } from '../src/server/pdfStorage';

export const config = { maxDuration: 60 };

declare const process: { env: Record<string, string | undefined> };

interface VReq {
  query: Record<string, string | string[] | undefined>;
}
interface VRes {
  status(code: number): VRes;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
  redirect(code: number, url: string): void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VReq, res: VRes): Promise<void> {
  const raw = req.query.id;
  const id = Array.isArray(raw) ? raw[0] : raw ?? '';
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'bad_id' });
    return;
  }

  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: process.env.APP_URL,
  };
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.APP_URL) {
    res.status(404).json({ error: 'not_configured' });
    return;
  }

  const publicUrl = reportPublicUrl(env, id);

  // Serve the cached file if it's already been generated.
  if (await reportExists(env, id)) {
    res.redirect(302, publicUrl);
    return;
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    defaultViewport: { width: 1000, height: 1400 },
  });
  try {
    const page = await browser.newPage();
    const target = `${env.APP_URL.replace(/\/+$/, '')}/r/${id}`;
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 30_000 });
    await page.waitForSelector('.verdict-zone', { timeout: 15_000 });
    // Let the bars settle at full width before capturing.
    await new Promise((r) => setTimeout(r, 700));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    });

    const ok = await uploadReport(env, id, pdf);
    if (!ok) {
      res.status(502).json({ error: 'upload_failed' });
      return;
    }
    res.redirect(302, publicUrl);
  } catch {
    res.status(500).json({ error: 'render_failed' });
  } finally {
    await browser.close();
  }
}
