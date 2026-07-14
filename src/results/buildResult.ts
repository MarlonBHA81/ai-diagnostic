import type { IndustryConfig } from '../config/IndustryConfig';
import {
  runDiagnostic,
  constraintMonthlyCost,
  volumeTest,
  marginTest,
  partnerTest,
  scoreZones,
} from '../scoring/engine';
import type { ZoneAnswer, ScoredZone } from '../scoring/types';
import { fmtHours } from '../lib/num';
import { DEFAULT_CURRENCY } from '../currency/currency';
import { emptyAnswer, type QuizState } from '../state/types';
import type { DiagnosticCompletedEvent } from '../lib/events';
import type { AiUsageLevel, MarginImpactLevel } from '../scoring/types';

export interface ResultZone extends ScoredZone {
  name: string;
  aiLabel: string;
  marginLabel: string;
  bottleneck: string;
  desiredFix: string;
  timeRep: number;
}

export interface NextStep {
  heading: string;
  body: string;
  firmExample: string;
  /** When the constraint is already Advanced, the next zone to target. */
  secondZoneName?: string;
  secondZoneScore?: number;
}

export interface ResultsModel {
  zones: ResultZone[];
  constraint: ResultZone;
  votes: number;
  wonVolume: boolean;
  wonMargin: boolean;
  wonPartner: boolean;
  testWinners: { volume: ResultZone; margin: ResultZone; partner: ResultZone };
  totalHours: number;
  monthlyCost: number | null;
  nextStep: NextStep;
  notes: Array<{ name: string; bottleneck: string; desiredFix: string }>;
}

/** A run of text, optionally bolded — lets the screen and email share wording. */
export interface TextRun {
  t: string;
  b?: boolean;
}

function labelFor<T extends number>(
  options: Array<{ value: T; label: string }>,
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? String(value);
}

/** Compute the full results model from config + captured answers. */
export function computeResults(
  config: IndustryConfig,
  state: QuizState,
): ResultsModel {
  const dims = config.dimensions;

  const zoneAnswers: ZoneAnswer[] = config.zones.map((z) => {
    const a = state.answers[z.id];
    return {
      zoneId: z.id,
      hoursPerWeek: a.hours ?? 0,
      repetitiveness: a.rep ?? 0,
      aiUsage: (a.ai ?? 1) as ZoneAnswer['aiUsage'],
      marginImpact: (a.margin ?? 1) as ZoneAnswer['marginImpact'],
      partnerInvolvement: a.own ?? 0,
    };
  });

  const diag = runDiagnostic(zoneAnswers);
  const scored = scoreZones(zoneAnswers);

  const enrich = (sz: ScoredZone): ResultZone => {
    const cfg = config.zones.find((z) => z.id === sz.zoneId)!;
    const a = state.answers[sz.zoneId];
    return {
      ...sz,
      name: cfg.name,
      aiLabel: labelFor(dims.aiUsageOptions, sz.aiUsage),
      marginLabel: labelFor(dims.marginImpactOptions, sz.marginImpact),
      bottleneck: a.bottleneck.trim(),
      desiredFix: a.desiredFix.trim(),
      timeRep: sz.hoursPerWeek * sz.repetitiveness,
    };
  };

  const zones = scored.map(enrich);
  const byId = (id: string) => zones.find((z) => z.zoneId === id)!;

  const constraint = byId(diag.bindingConstraintZoneId);
  const winners = {
    volume: enrich(volumeTest(scored)),
    margin: enrich(marginTest(scored)),
    partner: enrich(partnerTest(scored)),
  };

  const monthlyCost = constraintMonthlyCost(
    constraint.hoursPerWeek,
    state.baseline.chargeOutRate,
  );

  // Next-step card keyed to the constraint's current AI level.
  const nextByLevel = [
    config.nextSteps.contextLibrary, // ai 1
    config.nextSteps.redesign, // ai 2
    config.nextSteps.integrate, // ai 3
    config.nextSteps.constraintShifted, // ai 4
  ];
  const step = nextByLevel[constraint.aiUsage - 1];
  const nextStep: NextStep = {
    heading: step.heading,
    body: step.body,
    firmExample: step.firmExample,
  };
  if (constraint.aiUsage === 4) {
    const second = [...zones]
      .filter((z) => z.zoneId !== constraint.zoneId)
      .sort((a, b) => b.compressionScore - a.compressionScore)[0];
    if (second) {
      nextStep.secondZoneName = second.name;
      nextStep.secondZoneScore = second.compressionScore;
    }
  }

  const notes = zones
    .filter((z) => z.bottleneck || z.desiredFix)
    .map((z) => ({ name: z.name, bottleneck: z.bottleneck, desiredFix: z.desiredFix }));

  return {
    zones,
    constraint,
    votes: diag.votes,
    wonVolume: winners.volume.zoneId === constraint.zoneId,
    wonMargin: winners.margin.zoneId === constraint.zoneId,
    wonPartner: winners.partner.zoneId === constraint.zoneId,
    testWinners: winners,
    totalHours: zones.reduce((s, z) => s + z.hoursPerWeek, 0),
    monthlyCost,
    nextStep,
    notes,
  };
}

function valueForLabel<T extends number>(
  options: Array<{ value: T; label: string }>,
  label: string,
  fallback: T,
): T {
  return options.find((o) => o.label === label)?.value ?? fallback;
}

/**
 * Reconstruct a minimal QuizState from a diagnostic_completed event, so the
 * server-side email can reuse computeResults()/whyRuns() and stay identical to
 * the on-screen results. Zone rows are matched to config by display name.
 */
export function stateFromCompletedEvent(
  event: DiagnosticCompletedEvent,
  config: IndustryConfig,
): QuizState {
  const answers: Record<string, ReturnType<typeof emptyAnswer>> = {};
  for (const z of config.zones) answers[z.id] = emptyAnswer();

  for (const row of event.zones) {
    const cfg = config.zones.find((z) => z.name === row.zone);
    if (!cfg) continue;
    answers[cfg.id] = {
      hours: row.hoursPerWeek,
      rep: row.repetitiveness,
      ai: valueForLabel(config.dimensions.aiUsageOptions, row.aiUsage, 1 as AiUsageLevel),
      margin: valueForLabel(config.dimensions.marginImpactOptions, row.marginImpact, 1 as MarginImpactLevel),
      own: row.partnerInvolvement,
      bottleneck: row.bottleneck,
      desiredFix: row.desiredFix,
    };
  }

  return {
    step: 'results',
    lead: {
      firstName: event.lead.firstName,
      lastName: event.lead.lastName,
      businessName: event.lead.businessName,
      email: event.lead.email,
      mobileCountry: 'ZA',
      mobileNational: '',
      mobileE164: event.lead.mobile,
    },
    baseline: {
      currency: event.baseline.currency ?? DEFAULT_CURRENCY,
      monthlyRevenue: event.baseline.monthlyRevenue,
      teamSize: event.baseline.teamSize,
      chargeOutRate: event.baseline.chargeOutRate,
    },
    answers,
    startedAt: null,
    leadCaptured: true,
  };
}

/**
 * Build the "why this is your constraint" sentence as text runs, so the results
 * screen (JSX) and the email (HTML) render identical wording with their own
 * bolding/escaping.
 */
export function whyRuns(
  model: ResultsModel,
  config: IndustryConfig,
  businessName: string,
): TextRun[] {
  const c = model.constraint;
  const partnerLabel = config.dimensions.partnerInvolvementLabel.toLowerCase();
  const bits: TextRun[][] = [];

  if (model.wonVolume) {
    bits.push([
      { t: 'it carries the heaviest time-x-repetitiveness load (' },
      { t: `${fmtHours(c.hoursPerWeek)} hrs/week`, b: true },
      { t: ' at repetitiveness ' },
      { t: `${c.repetitiveness}/5`, b: true },
      { t: ')' },
    ]);
  }
  if (model.wonMargin) {
    bits.push([
      { t: "it's your biggest untapped opportunity — " },
      { t: `${c.marginLabel}`, b: true },
      { t: ' margin impact with only ' },
      { t: `${c.aiLabel}`, b: true },
      { t: ' AI usage' },
    ]);
  }
  if (model.wonPartner) {
    bits.push([
      { t: `a partner is the bottleneck here (${partnerLabel} ` },
      { t: `${c.partnerInvolvement}/5`, b: true },
      { t: ')' },
    ]);
  }
  if (bits.length === 0) {
    bits.push([{ t: 'it carries the highest untapped compression score of all seven zones' }]);
  }

  const runs: TextRun[] = [];
  runs.push({ t: businessName ? `${businessName}'s ` : 'Your ' });
  runs.push({ t: 'binding constraint won ' });
  runs.push({ t: `${model.votes} of 3`, b: true });
  runs.push({ t: ' synthesis tests: ' });
  bits.forEach((bit, i) => {
    runs.push(...bit);
    runs.push({ t: i < bits.length - 1 ? '; ' : '. ' });
  });
  runs.push({ t: 'Fix this one thing first — everything else waits.' });
  return runs;
}
