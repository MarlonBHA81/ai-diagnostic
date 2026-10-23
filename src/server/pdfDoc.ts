/**
 * Build the hosted PDF report with pdf-lib (pure JS, no headless browser).
 *
 * This replaces the former headless-Chromium renderer, which crashed at launch
 * on Vercel's serverless runtime. pdf-lib has no native dependencies, so it runs
 * reliably on the Hobby plan. The layout is a hand-built, branded one-pager; it
 * is not a pixel copy of the on-screen results page, but it carries the same
 * data: the binding constraint, its monthly cost, the zone summary table, the
 * recommended next step, and the booking call to action.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFString,
  type PDFFont,
  type RGB,
} from 'pdf-lib';
import type { IndustryConfig } from '../config/IndustryConfig';
import type { DiagnosticCompletedEvent } from '../lib/events';
import { modelFromCompletedEvent, whyRuns, quickWhy, tapLabel } from '../results/buildResult';
import { formatMonthlyCost } from '../currency/currency';
import { fmtHours } from '../lib/num';

// SA brand palette.
const NAVY = rgb(0x22 / 255, 0x20 / 255, 0x56 / 255);
const YELLOW = rgb(0xe3 / 255, 0xe4 / 255, 0x25 / 255);
const INK = rgb(0x1a / 255, 0x1a / 255, 0x2e / 255);
const INK_SOFT = rgb(0x58 / 255, 0x59 / 255, 0x5b / 255);
const LINE = rgb(0xe0 / 255, 0xe0 / 255, 0xe6 / 255);
const YELLOW_SOFT = rgb(0xfb / 255, 0xfb / 255, 0xcf / 255);
const WHITE = rgb(1, 1, 1);

const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface Col {
  title: string;
  width: number;
  align: 'left' | 'right';
  get: (z: Row) => string;
}
interface Row {
  name: string;
  isConstraint: boolean;
  hours: number;
  rep: number;
  ai: string;
  margin: string;
  partner: number;
  score: number;
  repTap: string;
  timeTap: string;
  aiTap: string;
}

export async function buildReportPdf(
  event: DiagnosticCompletedEvent,
  config: IndustryConfig,
): Promise<Uint8Array> {
  const model = modelFromCompletedEvent(event, config);
  const quick = model.mode === 'quick';
  const currency = event.baseline.currency;
  const businessName = event.lead.businessName;

  const doc = await PDFDocument.create();
  doc.setTitle('The 7-Zone Diagnostic Report');
  doc.setAuthor('Story Advantage');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const need = (h: number) => {
    if (y - h < MARGIN) newPage();
  };

  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const trial = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(trial, size) > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = trial;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  const drawText = (
    text: string,
    x: number,
    size: number,
    f: PDFFont,
    color: RGB,
  ) => {
    page.drawText(text, { x, y, size, font: f, color });
  };

  const paragraph = (text: string, size: number, f: PDFFont, color: RGB, lead = 1.4) => {
    for (const line of wrap(text, f, size, CONTENT_W)) {
      need(size * lead);
      drawText(line, MARGIN, size, f, color);
      y -= size * lead;
    }
  };

  const sectionTitle = (label: string) => {
    y -= 14;
    need(22);
    drawText(label.toUpperCase(), MARGIN, 11, bold, NAVY);
    y -= 6;
    page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 1.5, color: NAVY });
    y -= 12;
  };

  const linkRect = (x: number, yy: number, w: number, h: number, url: string) => {
    const annot = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, yy, x + w, yy + h],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    });
    page.node.addAnnot(doc.context.register(annot));
  };

  // ---- Header -------------------------------------------------------------
  drawText('STORY ADVANTAGE', MARGIN, 13, bold, NAVY);
  drawText('The 7-Zone Diagnostic', PAGE_W - MARGIN - font.widthOfTextAtSize('The 7-Zone Diagnostic', 10), 10, font, INK_SOFT);
  y -= 12;
  page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 4, color: YELLOW });
  y -= 24;

  // ---- Verdict ------------------------------------------------------------
  drawText('YOUR BINDING CONSTRAINT', MARGIN, 9, bold, INK_SOFT);
  y -= 24;
  drawText(model.constraint.name, MARGIN, 26, bold, NAVY);
  y -= 22;

  const why = quick
    ? quickWhy(model, businessName)
    : whyRuns(model, config, businessName).map((r) => r.t).join('');
  paragraph(why, 11, font, INK_SOFT);

  if (model.monthlyCost != null) {
    y -= 4;
    const costStr = formatMonthlyCost(model.monthlyCost, currency) ?? '';
    const label = 'Rough monthly cost of this zone: ';
    need(14);
    drawText(label, MARGIN, 11, font, INK);
    drawText(
      costStr,
      MARGIN + font.widthOfTextAtSize(label, 11),
      11,
      bold,
      NAVY,
    );
    y -= 14;
  }

  // ---- Summary table ------------------------------------------------------
  sectionTitle('Summary');

  const rows: Row[] = model.zones.map((z) => ({
    name: z.name,
    isConstraint: z.zoneId === model.constraint.zoneId,
    hours: z.hoursPerWeek,
    rep: z.repetitiveness,
    ai: z.aiLabel,
    margin: z.marginLabel,
    partner: z.partnerInvolvement,
    score: z.compressionScore,
    repTap: z.tap ? tapLabel(z.tap.repetitive) : '-',
    timeTap: z.tap ? tapLabel(z.tap.time) : '-',
    aiTap: z.tap ? tapLabel(z.tap.aiUsage) : '-',
  }));

  const cols: Col[] = quick
    ? [
        { title: 'Zone', width: 150, align: 'left', get: (z) => z.name },
        { title: 'Repetitive', width: 95, align: 'left', get: (z) => z.repTap },
        { title: 'Takes time', width: 95, align: 'left', get: (z) => z.timeTap },
        { title: 'Using AI', width: 95, align: 'left', get: (z) => z.aiTap },
        { title: 'Score', width: 60, align: 'right', get: (z) => String(z.score) },
      ]
    : [
        { title: 'Zone', width: 128, align: 'left', get: (z) => z.name },
        { title: 'Hrs/wk', width: 55, align: 'left', get: (z) => String(fmtHours(z.hours)) },
        { title: 'Rep', width: 45, align: 'left', get: (z) => String(z.rep) },
        { title: 'AI', width: 80, align: 'left', get: (z) => z.ai },
        { title: 'Margin', width: 75, align: 'left', get: (z) => z.margin },
        { title: 'Owner', width: 55, align: 'left', get: (z) => String(z.partner) },
        { title: 'Score', width: 60, align: 'right', get: (z) => String(z.score) },
      ];

  const colX = (i: number) => MARGIN + cols.slice(0, i).reduce((s, c) => s + c.width, 0);
  const rowH = 20;

  const drawRow = (get: (c: Col) => string, f: PDFFont, color: RGB, baseline: number) => {
    cols.forEach((c, i) => {
      const txt = get(c);
      const w = f.widthOfTextAtSize(txt, 9.5);
      const x = c.align === 'right' ? colX(i) + c.width - w : colX(i);
      page.drawText(txt, { x, y: baseline, size: 9.5, font: f, color });
    });
  };

  // Header row
  need(rowH + 4);
  drawRow((c) => c.title, bold, INK_SOFT, y - 13);
  y -= rowH;
  page.drawRectangle({ x: MARGIN, y: y + 4, width: CONTENT_W, height: 1, color: NAVY });

  for (const r of rows) {
    need(rowH);
    if (r.isConstraint) {
      page.drawRectangle({
        x: MARGIN - 4,
        y: y - rowH + 6,
        width: CONTENT_W + 8,
        height: rowH,
        color: YELLOW_SOFT,
      });
    }
    drawRow((c) => c.get(r), r.isConstraint ? bold : font, r.isConstraint ? NAVY : INK, y - 13);
    y -= rowH;
    page.drawRectangle({ x: MARGIN, y: y + 5, width: CONTENT_W, height: 0.5, color: LINE });
  }

  // ---- Next step ----------------------------------------------------------
  sectionTitle('Your next step');
  need(16);
  drawText(model.nextStep.heading, MARGIN, 12, bold, NAVY);
  y -= 16;
  paragraph(model.nextStep.body, 11, font, INK, 1.4);
  if (model.nextStep.secondZoneName) {
    y -= 2;
    paragraph(
      `Your next target: ${model.nextStep.secondZoneName} (score ${model.nextStep.secondZoneScore}).`,
      11,
      font,
      INK,
    );
  }
  if (model.nextStep.firmExample) {
    y -= 2;
    paragraph(model.nextStep.firmExample, 10, font, INK_SOFT);
  }

  // ---- Booking CTA --------------------------------------------------------
  if (config.closing.ctaUrl) {
    y -= 18;
    const btnText = `${config.closing.ctaText}  ->`;
    const btnW = bold.widthOfTextAtSize(btnText, 12) + 36;
    const btnH = 34;
    need(btnH + 8);
    const btnY = y - btnH;
    page.drawRectangle({ x: MARGIN, y: btnY, width: btnW, height: btnH, color: NAVY });
    page.drawText(btnText, {
      x: MARGIN + 18,
      y: btnY + 11,
      size: 12,
      font: bold,
      color: WHITE,
    });
    linkRect(MARGIN, btnY, btnW, btnH, config.closing.ctaUrl);
    y = btnY - 10;
  }

  // ---- Footer -------------------------------------------------------------
  y -= 10;
  need(24);
  page.drawRectangle({ x: MARGIN, y: y + 6, width: CONTENT_W, height: 1, color: NAVY });
  y -= 6;
  paragraph(config.closing.reRunNote, 9, font, INK_SOFT);

  return doc.save();
}
