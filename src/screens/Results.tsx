import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useQuiz } from '../state/QuizContext';
import { computeResults, whyRuns } from '../results/buildResult';
import { formatMoney, formatMonthlyCost } from '../currency/currency';
import { fmtHours } from '../lib/num';
import { track } from '../lib/analytics';
import { sendDiagnosticCompleted } from '../lib/leadClient';
import type { DiagnosticCompletedEvent, ZoneResult } from '../lib/events';

export function Results() {
  const { config, state, restart } = useQuiz();
  const model = useMemo(() => computeResults(config, state), [config, state]);
  const currency = state.baseline.currency;
  const lead = state.lead;
  const sentRef = useRef(false);
  const [animate, setAnimate] = useState(false);

  // Fire diagnostic_completed once; results must render even if this fails.
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    track('results_viewed');

    const zones: ZoneResult[] = model.zones.map((z) => ({
      zone: z.name,
      hoursPerWeek: z.hoursPerWeek,
      repetitiveness: z.repetitiveness,
      aiUsage: z.aiLabel as ZoneResult['aiUsage'],
      marginImpact: z.marginLabel as ZoneResult['marginImpact'],
      partnerInvolvement: z.partnerInvolvement,
      compressionScore: z.compressionScore,
      bottleneck: z.bottleneck,
      desiredFix: z.desiredFix,
    }));

    const event: DiagnosticCompletedEvent = {
      event: 'diagnostic_completed',
      completedAt: new Date().toISOString(),
      source: config.sourceTag,
      lead: {
        firstName: lead?.firstName ?? '',
        lastName: lead?.lastName ?? '',
        businessName: lead?.businessName ?? '',
        email: lead?.email ?? '',
        mobile: lead?.mobileE164 ?? '',
      },
      baseline: {
        currency,
        monthlyRevenue: state.baseline.monthlyRevenue,
        teamSize: state.baseline.teamSize,
        chargeOutRate: state.baseline.chargeOutRate,
      },
      bindingConstraint: model.constraint.name,
      constraintVotes: model.votes,
      constraintMonthlyCost: model.monthlyCost,
      zones,
      antiSpam: { honeypot: '', startedAt: state.startedAt ?? 0 },
    };
    void sendDiagnosticCompleted(event);
  }, [config, state, model, lead, currency]);

  // Kick the bar animation after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const maxC = Math.max(...model.zones.map((z) => z.compressionScore), 1);
  const barsSorted = [...model.zones].sort((a, b) => b.compressionScore - a.compressionScore);
  const why = whyRuns(model, config, lead?.businessName ?? '');

  return (
    <div>
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
              4.33 × {formatMoney(state.baseline.chargeOutRate ?? 0, currency)} ={' '}
              <b>{formatMonthlyCost(model.monthlyCost, currency)}</b>
            </>
          ) : (
            <>Tip: add your charge-out rate on the baseline screen to see what this constraint costs per month.</>
          )}
        </p>
      </div>

      {/* Compression bars */}
      <div className="sec-title">Compression score by zone</div>
      <p className="qblock__hint" style={{ marginBottom: 'var(--sa-space-4)' }}>
        Compression Score = hours/week × repetitiveness × AI-usage gap. It measures how much of
        each zone AI could compress that it currently isn't. Higher = more untapped leverage.
      </p>
      <div className="bars">
        {barsSorted.map((z) => {
          const isC = z.zoneId === model.constraint.zoneId;
          const width = animate ? Math.max(4, (z.compressionScore / maxC) * 100) : 0;
          return (
            <div key={z.zoneId} className={'bars__row' + (isC ? ' bars__row--constraint' : '')}>
              <div className="bars__name">{z.name}</div>
              <div className="bars__track">
                <div className="bars__fill" style={{ width: `${width}%` }} />
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
              <th>{config.dimensions.partnerInvolvementLabel.split(' ')[0]}</th>
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
        {model.nextStep.firmExample && (
          <p className="firm-eg">{model.nextStep.firmExample}</p>
        )}
        {config.closing.ctaUrl && (
          <a className="cta-btn" href={config.closing.ctaUrl} target="_blank" rel="noreferrer">
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

      <div className="nav">
        <button className="btn btn--ghost" type="button" onClick={restart}>
          ↺ Retake
        </button>
        <span className="nav-note">{config.closing.reRunNote}</span>
      </div>
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
