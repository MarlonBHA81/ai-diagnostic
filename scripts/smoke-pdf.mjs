/**
 * Smoke-test the PDF render pipeline locally, without Vercel or Supabase.
 *
 * Serves the built app + a mock /api/result, then drives a local Chrome exactly
 * like /api/pdf does: navigate to /r/:id, wait for the results, and page.pdf().
 * Writes smoke-report.pdf next to the repo.
 *
 * Usage:
 *   npm run build
 *   PUPPETEER_EXECUTABLE_PATH="/path/to/chrome" node scripts/smoke-pdf.mjs
 *   # macOS example path:
 *   #   /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
 */
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = 4780;
const ID = '1a08ad3b-a318-43c9-af4d-761f9c42f8b7';

const EXE = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!EXE) {
  console.error('Set PUPPETEER_EXECUTABLE_PATH to a local Chrome/Chromium binary.');
  process.exit(1);
}
if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const RESULT = {
  event: 'diagnostic_completed', completedAt: '2026-01-01T00:00:00Z', source: 'business-diagnostic',
  lead: { firstName: 'Sam', lastName: 'Lee', businessName: 'Acme Studio', email: 'sam@acme.com', mobile: '+27821234567' },
  baseline: { currency: 'ZAR', monthlyRevenue: 450000, teamSize: 12, chargeOutRate: 950 },
  bindingConstraint: 'Delivery', constraintVotes: 3, constraintMonthlyCost: 139859,
  zones: [
    { zone: 'Lead Generation', hoursPerWeek: 6, repetitiveness: 2, aiUsage: 'Basic', marginImpact: 'Medium', partnerInvolvement: 2, compressionScore: 48, bottleneck: '', desiredFix: '' },
    { zone: 'Sales', hoursPerWeek: 8, repetitiveness: 3, aiUsage: 'Basic', marginImpact: 'Medium', partnerInvolvement: 3, compressionScore: 96, bottleneck: '', desiredFix: '' },
    { zone: 'Delivery', hoursPerWeek: 34, repetitiveness: 5, aiUsage: 'None', marginImpact: 'Critical', partnerInvolvement: 4, compressionScore: 850, bottleneck: 'Manual data entry', desiredFix: 'Auto-extract transactions' },
    { zone: 'Operations', hoursPerWeek: 10, repetitiveness: 4, aiUsage: 'Moderate', marginImpact: 'High', partnerInvolvement: 1, compressionScore: 120, bottleneck: '', desiredFix: '' },
    { zone: 'Finance', hoursPerWeek: 5, repetitiveness: 2, aiUsage: 'Basic', marginImpact: 'High', partnerInvolvement: 2, compressionScore: 40, bottleneck: '', desiredFix: '' },
    { zone: 'Team', hoursPerWeek: 4, repetitiveness: 1, aiUsage: 'None', marginImpact: 'Low', partnerInvolvement: 1, compressionScore: 20, bottleneck: '', desiredFix: '' },
    { zone: 'Owner', hoursPerWeek: 9, repetitiveness: 1, aiUsage: 'Basic', marginImpact: 'High', partnerInvolvement: 3, compressionScore: 36, bottleneck: '', desiredFix: '' },
  ],
};
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (u.pathname.startsWith('/api/result')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ result: RESULT }));
    return;
  }
  const filePath = path.join(DIST, u.pathname);
  if (u.pathname !== '/' && existsSync(filePath)) {
    try {
      const buf = await readFile(filePath);
      res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(buf);
      return;
    } catch { /* fall through to SPA */ }
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(await readFile(path.join(DIST, 'index.html')));
});

await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1400 });
  await page.goto(`http://localhost:${PORT}/r/${ID}`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForSelector('.verdict-zone', { timeout: 15_000 });
  const verdict = await page.$eval('.verdict-zone', (el) => el.textContent);
  await new Promise((r) => setTimeout(r, 700));
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' } });
  await writeFile(path.join(ROOT, 'smoke-report.pdf'), pdf);
  console.log(`OK — constraint "${verdict}", ${pdf.length} bytes → smoke-report.pdf`);
} finally {
  await browser.close();
  server.close();
}
