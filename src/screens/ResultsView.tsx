import { Fragment } from 'react';
import type { IndustryConfig } from '../config/IndustryConfig';
import type { ResultsModel } from '../results/buildResult';
import { whyRuns } from '../results/buildResult';
import type { CurrencyCode } from '../currency/currency';
import { formatMoney, formatMonthlyCost } from '../currency/currency';
import { fmtHours } from '../lib/num';

interface ResultsViewProps {
  config: IndustryConfig;
  model: ResultsModel;
  currency: CurrencyCode;
  chargeOutRate: number | null;
  firstName: string;
  businessName: string;
  /** Animate the bars in (false renders them at full width immediately). */
  animate: boolean;
  /** Optional retake handler; when omitted the Retake control is hidden. */
  onRetake?: () => void;
}

/** Pure presentation of the results — reused by the live quiz and the shared
 *  (/r/:id) page. No side effects, no context. */
export function ResultsView({
  config,
  model,
  currency,
  chargeOutRate,
  firstName,
  businessName,
  animate,
  onRetake,
}: ResultsViewProps) {
  const maxC = Math.max(...model.zones.map((z) => z.compressionScore), 1);
  const barsSorted = [...model.zones].sort((a, b) => b.compressionScore - a.compressionScore);
  const why = whyRuns(model, config, businessName);
  const partnerShort = config.dimensions.partnerInvolvementLabel.split(' ')[0];
  const bookingUrl = config.closing.ctaUrl;

  return (
    <div className="results">
      {/* Print-only header (shows in the saved PDF, hidden on screen) */}
      <div className="print-only print-header">
        <strong>STORY ADVANTAGE</strong> — The 7-Zone Diagnostic Report
        <div className="print-header__meta">
          {businessName ? `${businessName} · ` : ''}Binding constraint: {model.constraint.name}
        </div>
      </div>

      {/* Actions (screen only) */}
      <div className="results-actions no-print">
        <button className="btn btn--ghost" type="button" onClick={() => window.print()}>
          ⤓ Download PDF
        </button>
        {onRetake && (
          <button className="btn btn--ghost" type="button" onClick={onRetake}>
            ↺ Retake
          </button>
        )}
      </div>

      <div className="stamp">Diagnostic Complete</div>

      {/* Verdict */}
      <div className="verdict-card">
        <div className="verdict-eyebrow">Your binding constraint</div>
        <div className="verdict-zone">{model.constraint.name}</div>
        <p className="verdict-why" style={{ marginBottom: 0 }}>
          {why.map((run, i) => (
            <Fragment key={i}>{run.b ? <b>{run.t}</b> : run.t}</Fragment>
          ))}
        </p>
        <p className="cost-line" style={{ marginBottom: 0 }}>
          {model.monthlyCost != null ? (
            <>
              Rough monthly cost of this zone: {fmtHours(model.constraint.hoursPerWeek)} hrs/wk ×
              4.33 × {formatMoney(chargeOutRate ?? 0, currency)} ={' '}
              <b>{formatMonthlyCost(model.monthlyCost, currency)}</b>
            </>
          ) : (
            <>Tip: add your charge-out rate on the baseline screen to see what this constraint costs per month.</>
          )}
        </p>
      </div>

      {/* Congratulations + booking */}
      {bookingUrl && (
        <div className="booking-card">
          <div className="booking-card__badge">Congratulations{firstName ? `, ${firstName}` : ''} 🎉</div>
          <h2 className="booking-card__title">You've found where AI goes first.</h2>
          <p className="booking-card__lead">
            The fastest way to act on it is a free, no-pressure <b>AI Automations Debrief</b> with
            Story Advantage. We'll map exactly how to compress{' '}
            <b>{model.constraint.name}</b> with AI — and what to do this quarter.
          </p>
          <a className="cta-btn cta-btn--lg no-print" href={bookingUrl} target="_blank" rel="noreferrer">
            {config.closing.ctaText} →
          </a>
          <iframe
            className="booking-embed no-print"
            src={bookingUrl}
            title={config.closing.ctaText}
            loading="lazy"
            scrolling="no"
          />
          <p className="hint no-print" style={{ textAlign: 'center' }}>
            Can't see the calendar?{' '}
            <a href={bookingUrl} target="_blank" rel="noreferrer">
              Open the booking page →
            </a>
          </p>
        </div>
      )}

      {/* Compression bars */}
      <div className="sec-title">Compression score by zone</div>
      <p className="qblock__hint" style={{ marginBottom: 'var(--sa-space-4)' }}>
        Compression Score = hours/week × repetitiveness × AI-usage gap. It measures how much of
        each zone AI could compress that it currently isn't. Higher = more untapped leverage.
      </p>
      <div className="bars">
        {barsSorted.map((z) => {
          const isC = z.zoneId === model.constraint.zoneId;
          const target = Math.max(4, (z.compressionScore / maxC) * 100);
          return (
            <div key={z.zoneId} className={'bars__row' + (isC ? ' bars__row--constraint' : '')}>
              <div className="bars__name">{z.name}</div>
              <div className="bars__track">
                <div className="bars__fill" style={{ width: `${animate ? target : 0}%` }} />
              </div>
              <div className="bars__score">{z.compressionScore}</div>
            </div>
          );
        })}
      </div>

      {/* Summary table */}
      <div className="sec-title">Summary table</div>
      <div className="table-scroll">
        <table className="rtable">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Hrs/wk</th>
              <th>Repet.</th>
              <th>AI usage</th>
              <th>Margin</th>
              <th>{partnerShort}</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {model.zones.map((z) => (
              <tr key={z.zoneId} className={z.zoneId === model.constraint.zoneId ? 'constraint' : ''}>
                <td>{z.name}</td>
                <td>{fmtHours(z.hoursPerWeek)}</td>
                <td>{z.repetitiveness}</td>
                <td>{z.aiLabel}</td>
                <td>{z.marginLabel}</td>
                <td>{z.partnerInvolvement}</td>
                <td><b>{z.compressionScore}</b></td>
              </tr>
            ))}
            <tr>
              <td><b>Total</b></td>
              <td><b>{fmtHours(model.totalHours)}</b></td>
              <td colSpan={5} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* How the constraint was identified */}
      <div className="sec-title">How the constraint was identified</div>
      <div className="syn">
        <SynItem
          k="Test 1 — Heaviest time + repetitiveness"
          zone={model.testWinners.volume.name}
          r={`${fmtHours(model.testWinners.volume.hoursPerWeek)} hrs/week × repetitiveness ${model.testWinners.volume.repetitiveness} = ${model.testWinners.volume.timeRep}. This is where AI saves the most raw hours.`}
        />
        <SynItem
          k="Test 2 — Highest margin impact, lowest AI usage"
          zone={model.testWinners.margin.name}
          r={`${model.testWinners.margin.marginLabel} margin impact with ${model.testWinners.margin.aiLabel} AI usage. Your biggest untapped opportunity.`}
        />
        <SynItem
          k={`Test 3 — Highest ${config.dimensions.partnerInvolvementLabel.toLowerCase()}`}
          zone={model.testWinners.partner.name}
          r={`${config.dimensions.partnerInvolvementLabel} ${model.testWinners.partner.partnerInvolvement}/5. Solving this frees your scarcest resource: leadership attention.`}
        />
      </div>

      {/* Next step */}
      <div className="sec-title">Your next step</div>
      <div className="next-card">
        <div className="next-card__k">{model.nextStep.heading}</div>
        <p>{model.nextStep.body}</p>
        {model.nextStep.secondZoneName && (
          <p>
            Your next target: <b>{model.nextStep.secondZoneName}</b> (compression score{' '}
            {model.nextStep.secondZoneScore}).
          </p>
        )}
        {model.nextStep.firmExample && <p className="firm-eg">{model.nextStep.firmExample}</p>}
        {bookingUrl && (
          <a className="cta-btn no-print" href={bookingUrl} target="_blank" rel="noreferrer">
            {config.closing.ctaText} →
          </a>
        )}
      </div>

      {/* Free-text echo */}
      {model.notes.length > 0 && (
        <>
          <div className="sec-title">Bottlenecks you named</div>
          <div className="notes">
            {model.notes.map((n) => (
              <div className="notes__item" key={n.name}>
                <span className="notes__zone">{n.name}</span>
                {n.bottleneck}
                {n.desiredFix && <span className="notes__fix"> → {n.desiredFix}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Quote */}
      <p className="quote">
        “{config.closing.quote}”
        <span className="quote__who">— {config.closing.quoteAttribution}</span>
      </p>

      {onRetake && (
        <div className="nav no-print">
          <span className="nav-note">{config.closing.reRunNote}</span>
        </div>
      )}
    </div>
  );
}

function SynItem({ k, zone, r }: { k: string; zone: string; r: string }) {
  return (
    <div className="syn__item">
      <div className="syn__k">{k}</div>
      <div className="syn__v">
        <span className="zn">{zone}</span>
      </div>
      <div className="syn__r">{r}</div>
    </div>
  );
}
