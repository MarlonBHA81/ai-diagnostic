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
import { emptyAnswer, emptyQuick, type QuizState, type QuickZoneAnswer } from '../state/types';
import type { DiagnosticCompletedEvent, QuickTaps, TapValue } from '../lib/events';
import type { AiUsageLevel, MarginImpactLevel } from '../scoring/types';

export interface ResultZone extends ScoredZone {
  name: string;
  aiLabel: string;
  marginLabel: string;
  bottleneck: string;
  desiredFix: string;
  timeRep: number;
  /** Present only for Quick Mode: the three raw taps, for simple display. */
  tap?: QuickTaps;
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
  /** Which questionnaire built this model; drives the simplified Quick view. */
  mode: 'full' | 'quick';
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

/** A run of text, optionally bolded, lets the screen and email share wording. */
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
    mode: 'full',
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
  const quick: Record<string, ReturnType<typeof emptyQuick>> = {};
  for (const z of config.zones) {
    answers[z.id] = emptyAnswer();
    quick[z.id] = emptyQuick();
  }

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
    quick,
    quickHours: null,
    startedAt: null,
    honeypot: '',
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
      { t: "it's your biggest untapped opportunity: " },
      { t: `${c.marginLabel}`, b: true },
      { t: ' margin impact with only ' },
      { t: `${c.aiLabel}`, b: true },
      { t: ' AI usage' },
    ]);
  }
  if (model.wonPartner) {
    bits.push([
      { t: `you're personally the bottleneck here (${partnerLabel} ` },
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
  runs.push({ t: 'Fix this one thing first. Everything else waits.' });
  return runs;
}

/* ------------------------------------------------------------------ *
 * Quick Mode
 *
 * The fast 3-tap-per-zone questionnaire. Each zone is answered on the
 * Yes / Somewhat / No / Not sure scale for three questions (repetitive,
 * time, AI usage). Taps map to the same numeric dimensions the engine
 * already understands, so the constraint is still a compression score and
 * every downstream surface (results view, PDF, email, webhook) is reused.
 * ------------------------------------------------------------------ */

/** Repetitiveness (1..5) by tap: more "yes" = more repetitive = more compressible. */
const REP_BY_TAP: Record<TapValue, number> = { yes: 5, somewhat: 3, no: 1, notsure: 2 };
/** Current AI usage level (1..4) by tap: "yes, already using AI" lowers the gap. */
const AI_LEVEL_BY_TAP: Record<TapValue, AiUsageLevel> = { yes: 3, somewhat: 2, no: 1, notsure: 1 };
/** Proxy weekly hours by the "time" tap, used only to rank zones. */
const HOURS_BY_TAP: Record<TapValue, number> = { yes: 18, somewhat: 9, no: 3, notsure: 6 };

/** Neutral stand-ins for the dimensions Quick Mode doesn't ask about. */
const QUICK_MARGIN = 2 as MarginImpactLevel;
const QUICK_PARTNER = 3;

/** Human label for a tap value (for tables and the email). */
export function tapLabel(tap: TapValue): string {
  switch (tap) {
    case 'yes':
      return 'Yes';
    case 'somewhat':
      return 'Somewhat';
    case 'no':
      return 'No';
    case 'notsure':
      return 'Not sure';
  }
}

function fillTaps(q: QuickZoneAnswer): QuickTaps {
  return {
    repetitive: q.repetitive ?? 'notsure',
    time: q.time ?? 'notsure',
    aiUsage: q.aiUsage ?? 'notsure',
  };
}

/**
 * Build the results model from Quick Mode taps. `quickHours` is the banded
 * weekly hours the user picked for the winning zone (used for the cost line);
 * zone ranking uses the per-zone "time" tap, not this band.
 */
export function computeQuickResults(
  config: IndustryConfig,
  quickAnswers: Record<string, QuickZoneAnswer>,
  quickHours: number | null,
  chargeOutRate: number | null,
): ResultsModel {
  const dims = config.dimensions;

  const zoneAnswers: ZoneAnswer[] = config.zones.map((z) => {
    const taps = fillTaps(quickAnswers[z.id] ?? emptyQuick());
    return {
      zoneId: z.id,
      hoursPerWeek: HOURS_BY_TAP[taps.time],
      repetitiveness: REP_BY_TAP[taps.repetitive],
      aiUsage: AI_LEVEL_BY_TAP[taps.aiUsage],
      marginImpact: QUICK_MARGIN,
      partnerInvolvement: QUICK_PARTNER,
    };
  });

  const scored = scoreZones(zoneAnswers);

  // Binding constraint: highest compression, tiebreak by more time, then a
  // bigger AI gap (lower current usage), then input order.
  const constraintScored = scored.reduce((best, cur) => {
    if (cur.compressionScore !== best.compressionScore)
      return cur.compressionScore > best.compressionScore ? cur : best;
    if (cur.hoursPerWeek !== best.hoursPerWeek)
      return cur.hoursPerWeek > best.hoursPerWeek ? cur : best;
    if (cur.aiUsage !== best.aiUsage) return cur.aiUsage < best.aiUsage ? cur : best;
    return best;
  });

  const enrich = (sz: ScoredZone): ResultZone => {
    const cfg = config.zones.find((z) => z.id === sz.zoneId)!;
    return {
      ...sz,
      name: cfg.name,
      aiLabel: labelFor(dims.aiUsageOptions, sz.aiUsage),
      marginLabel: labelFor(dims.marginImpactOptions, sz.marginImpact),
      bottleneck: '',
      desiredFix: '',
      timeRep: sz.hoursPerWeek * sz.repetitiveness,
      tap: fillTaps(quickAnswers[sz.zoneId] ?? emptyQuick()),
    };
  };

  const zones = scored.map(enrich);
  const constraint = zones.find((z) => z.zoneId === constraintScored.zoneId)!;

  // The winning zone's displayed hours and its monthly cost come from the
  // banded hours question, not the ranking proxy.
  const bandHours = quickHours ?? constraint.hoursPerWeek;
  constraint.hoursPerWeek = bandHours;
  const monthlyCost = constraintMonthlyCost(bandHours, chargeOutRate);

  const nextByLevel = [
    config.nextSteps.contextLibrary,
    config.nextSteps.redesign,
    config.nextSteps.integrate,
    config.nextSteps.constraintShifted,
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

  return {
    mode: 'quick',
    zones,
    constraint,
    votes: 0,
    wonVolume: false,
    wonMargin: false,
    wonPartner: false,
    testWinners: { volume: constraint, margin: constraint, partner: constraint },
    totalHours: zones.reduce((s, z) => s + z.hoursPerWeek, 0),
    monthlyCost,
    nextStep,
    notes: [],
  };
}

/**
 * Reconstruct Quick Mode taps + the banded hours from a stored
 * diagnostic_completed event, so the shared (/r/:id) page and the report email
 * recompute the exact same model the live screen showed.
 */
export function quickAnswersFromEvent(
  event: DiagnosticCompletedEvent,
  config: IndustryConfig,
): { quickAnswers: Record<string, QuickZoneAnswer>; quickHours: number | null } {
  const quickAnswers: Record<string, QuickZoneAnswer> = {};
  for (const z of config.zones) quickAnswers[z.id] = emptyQuick();

  let quickHours: number | null = null;
  for (const row of event.zones) {
    const cfg = config.zones.find((z) => z.name === row.zone);
    if (!cfg) continue;
    if (row.quick) quickAnswers[cfg.id] = { ...row.quick };
    if (row.zone === event.bindingConstraint) quickHours = row.hoursPerWeek;
  }
  return { quickAnswers, quickHours };
}

/** Build the ResultsModel for a stored event, honouring its mode. */
export function modelFromCompletedEvent(
  event: DiagnosticCompletedEvent,
  config: IndustryConfig,
): ResultsModel {
  if (event.mode === 'quick') {
    const { quickAnswers, quickHours } = quickAnswersFromEvent(event, config);
    return computeQuickResults(
      config,
      quickAnswers,
      quickHours,
      event.baseline.chargeOutRate,
    );
  }
  return computeResults(config, stateFromCompletedEvent(event, config));
}

/**
 * The plain-language "why this is your constraint" sentence for Quick Mode,
 * which has no synthesis tests to cite.
 */
export function quickWhy(model: ResultsModel, businessName: string): string {
  const owner = businessName ? `${businessName}’s` : 'Your';
  return (
    `${owner} binding constraint is ${model.constraint.name}: the most repetitive, ` +
    `time-heavy work with the least AI in use today. Fix this one first, then re-run.`
  );
}
