import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuiz } from '../state/QuizContext';
import { activeMode } from '../config/active';
import { computeResults, computeQuickResults } from '../results/buildResult';
import { track } from '../lib/analytics';
import { sendDiagnosticCompleted } from '../lib/leadClient';
import type { DiagnosticCompletedEvent, ZoneResult } from '../lib/events';
import { ResultsView } from './ResultsView';

export function Results() {
  const { config, state, restart } = useQuiz();
  const quick = activeMode === 'quick';
  const model = useMemo(
    () =>
      quick
        ? computeQuickResults(config, state.quick, state.quickHours, state.baseline.chargeOutRate)
        : computeResults(config, state),
    [quick, config, state],
  );
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
      ...(z.tap ? { quick: z.tap } : {}),
    }));

    const event: DiagnosticCompletedEvent = {
      event: 'diagnostic_completed',
      completedAt: new Date().toISOString(),
      source: config.sourceTag,
      mode: quick ? 'quick' : 'full',
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
      antiSpam: { honeypot: state.honeypot, startedAt: state.startedAt ?? 0 },
    };
    void sendDiagnosticCompleted(event);
  }, [quick, config, state, model, lead, currency]);

  // Kick the bar animation after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ResultsView
      config={config}
      model={model}
      currency={currency}
      chargeOutRate={state.baseline.chargeOutRate}
      firstName={lead?.firstName ?? ''}
      businessName={lead?.businessName ?? ''}
      animate={animate}
      onRetake={restart}
    />
  );
}
