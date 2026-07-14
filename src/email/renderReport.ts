import type { IndustryConfig } from '../config/IndustryConfig';
import type { DiagnosticCompletedEvent } from '../lib/events';
import { computeResults, whyRuns, stateFromCompletedEvent } from '../results/buildResult';
import { formatMonthlyCost } from '../currency/currency';
import { fmtHours } from '../lib/num';
import { escapeHtml } from '../lib/html';

// SA brand hex, inlined for email clients (which strip <style>/classes).
const NAVY = '#222056';
const YELLOW = '#e3e425';
const INK_SOFT = '#58595b';
const LINE = '#e5e5ea';
const YELLOW_SOFT = '#fbfbcf';

export interface RenderedReport {
  subject: string;
  html: string;
  text: string;
}

/** Render the prospect's report email from a diagnostic_completed event. */
export function renderReport(
  event: DiagnosticCompletedEvent,
  config: IndustryConfig,
): RenderedReport {
  const state = stateFromCompletedEvent(event, config);
  const model = computeResults(config, state);
  const currency = state.baseline.currency;
  const firstName = event.lead.firstName || 'there';
  const businessName = event.lead.businessName;

  const subject = `${firstName}, your binding constraint is ${model.constraint.name}`;

  const whyText = whyRuns(model, config, businessName)
    .map((r) => r.t)
    .join('');
  const whyHtml = whyRuns(model, config, businessName)
    .map((r) => (r.b ? `<b>${escapeHtml(r.t)}</b>` : escapeHtml(r.t)))
    .join('');

  const costHtml =
    model.monthlyCost != null
      ? `Rough monthly cost of this zone: <b style="color:${NAVY}">${escapeHtml(
          formatMonthlyCost(model.monthlyCost, currency)!,
        )}</b>`
      : '';
  const costText =
    model.monthlyCost != null
      ? `Rough monthly cost of this zone: ${formatMonthlyCost(model.monthlyCost, currency)}`
      : '';

  // Summary table rows.
  const rowsHtml = model.zones
    .map((z) => {
      const isC = z.zoneId === model.constraint.zoneId;
      const bg = isC ? ` background:${YELLOW_SOFT};` : '';
      const nameCell = isC ? `<b style="color:${NAVY}">${escapeHtml(z.name)}</b>` : escapeHtml(z.name);
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid ${LINE};${bg}">${nameCell}</td>
        <td style="padding:8px;border-bottom:1px solid ${LINE};${bg}">${fmtHours(z.hoursPerWeek)}</td>
        <td style="padding:8px;border-bottom:1px solid ${LINE};${bg}">${z.repetitiveness}</td>
        <td style="padding:8px;border-bottom:1px solid ${LINE};${bg}">${escapeHtml(z.aiLabel)}</td>
        <td style="padding:8px;border-bottom:1px solid ${LINE};${bg}">${escapeHtml(z.marginLabel)}</td>
        <td style="padding:8px;border-bottom:1px solid ${LINE};${bg}">${z.partnerInvolvement}</td>
        <td style="padding:8px;border-bottom:1px solid ${LINE};${bg}"><b>${z.compressionScore}</b></td>
      </tr>`;
    })
    .join('');

  const secondHtml =
    model.nextStep.secondZoneName != null
      ? `<p style="margin:0 0 12px">Your next target: <b>${escapeHtml(
          model.nextStep.secondZoneName,
        )}</b> (compression score ${model.nextStep.secondZoneScore}).</p>`
      : '';

  const notesHtml =
    model.notes.length > 0
      ? `<h3 style="color:${NAVY};margin:24px 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.08em">Bottlenecks you named</h3>` +
        model.notes
          .map(
            (n) =>
              `<div style="font-size:14px;padding:8px 0;border-bottom:1px solid ${LINE}"><span style="color:${INK_SOFT};text-transform:uppercase;font-size:11px;letter-spacing:0.06em;display:block">${escapeHtml(
                n.name,
              )}</span>${escapeHtml(n.bottleneck)}${
                n.desiredFix ? ` <span style="color:${INK_SOFT}">→ ${escapeHtml(n.desiredFix)}</span>` : ''
              }</div>`,
          )
          .join('')
      : '';

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f7f8fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${NAVY}">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="font-weight:700;letter-spacing:0.04em;color:${NAVY};margin-bottom:16px">STORY ADVANTAGE</div>

    <div style="background:#fff;border:2px solid ${NAVY};border-radius:14px;padding:24px;position:relative">
      <div style="height:6px;background:${YELLOW};border-radius:3px;margin:-24px -24px 20px;border-radius:12px 12px 0 0"></div>
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${INK_SOFT};margin-bottom:6px">Your binding constraint</div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-0.02em;margin-bottom:10px">${escapeHtml(
        model.constraint.name,
      )}</div>
      <p style="font-size:15px;line-height:1.6;color:${INK_SOFT};margin:0">${whyHtml}</p>
      ${costHtml ? `<p style="font-size:14px;margin:14px 0 0">${costHtml}</p>` : ''}
    </div>

    <h3 style="color:${NAVY};margin:28px 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.08em">Summary</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr>
        <th style="text-align:left;padding:8px;border-bottom:2px solid ${NAVY};font-size:11px;text-transform:uppercase;color:${INK_SOFT}">Zone</th>
        <th style="text-align:left;padding:8px;border-bottom:2px solid ${NAVY};font-size:11px;text-transform:uppercase;color:${INK_SOFT}">Hrs</th>
        <th style="text-align:left;padding:8px;border-bottom:2px solid ${NAVY};font-size:11px;text-transform:uppercase;color:${INK_SOFT}">Rep</th>
        <th style="text-align:left;padding:8px;border-bottom:2px solid ${NAVY};font-size:11px;text-transform:uppercase;color:${INK_SOFT}">AI</th>
        <th style="text-align:left;padding:8px;border-bottom:2px solid ${NAVY};font-size:11px;text-transform:uppercase;color:${INK_SOFT}">Margin</th>
        <th style="text-align:left;padding:8px;border-bottom:2px solid ${NAVY};font-size:11px;text-transform:uppercase;color:${INK_SOFT}">Partner</th>
        <th style="text-align:left;padding:8px;border-bottom:2px solid ${NAVY};font-size:11px;text-transform:uppercase;color:${INK_SOFT}">Score</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <h3 style="color:${NAVY};margin:28px 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.08em">Your next step</h3>
    <div style="border:2px solid ${NAVY};border-radius:14px;padding:20px;background:#ecedf6">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${NAVY};margin-bottom:6px">${escapeHtml(
        model.nextStep.heading,
      )}</div>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${escapeHtml(model.nextStep.body)}</p>
      ${secondHtml}
      <p style="font-size:14px;color:${INK_SOFT};margin:0 0 16px">${escapeHtml(model.nextStep.firmExample)}</p>
      <a href="${escapeHtml(config.closing.ctaUrl)}" style="display:inline-block;background:${NAVY};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${escapeHtml(
        config.closing.ctaText,
      )} →</a>
    </div>

    ${notesHtml}

    <p style="margin-top:28px;padding-top:16px;border-top:2px solid ${NAVY};font-size:14px;font-style:italic;color:${INK_SOFT};line-height:1.6">
      “${escapeHtml(config.closing.quote)}”<br>
      <span style="font-style:normal;font-weight:600;color:${NAVY}">— ${escapeHtml(
        config.closing.quoteAttribution,
      )}</span>
    </p>
    <p style="font-size:13px;color:${INK_SOFT}">${escapeHtml(config.closing.reRunNote)}</p>
  </div>
</body></html>`;

  const text = [
    `Your binding constraint: ${model.constraint.name}`,
    '',
    whyText,
    costText,
    '',
    'Summary:',
    ...model.zones.map(
      (z) =>
        `  ${z.zoneId === model.constraint.zoneId ? '* ' : '  '}${z.name}: ${fmtHours(
          z.hoursPerWeek,
        )} hrs, rep ${z.repetitiveness}, AI ${z.aiLabel}, margin ${z.marginLabel}, partner ${z.partnerInvolvement}/5, score ${z.compressionScore}`,
    ),
    '',
    `Your next step — ${model.nextStep.heading}:`,
    model.nextStep.body,
    model.nextStep.secondZoneName
      ? `Next target: ${model.nextStep.secondZoneName} (score ${model.nextStep.secondZoneScore}).`
      : '',
    model.nextStep.firmExample,
    '',
    `${config.closing.ctaText}: ${config.closing.ctaUrl}`,
    '',
    `"${config.closing.quote}" — ${config.closing.quoteAttribution}`,
    config.closing.reRunNote,
  ]
    .filter((l) => l !== '')
    .join('\n');

  return { subject, html, text };
}
