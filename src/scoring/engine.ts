import type {
  ZoneAnswer,
  ScoredZone,
  DiagnosticResult,
  TestId,
} from './types';

/**
 * Compression Score = hours × repetitiveness × (6 − aiUsage).
 *
 * With aiUsage encoded 1..4, the multiplier (6 − aiUsage) runs 5..2:
 * no AI usage compresses the most, advanced usage the least.
 */
export function compressionScore(a: ZoneAnswer): number {
  return a.hoursPerWeek * a.repetitiveness * (6 - a.aiUsage);
}

/** Attach the compression score to each zone answer, preserving input order. */
export function scoreZones(answers: ZoneAnswer[]): ScoredZone[] {
  return answers.map((a) => ({ ...a, compressionScore: compressionScore(a) }));
}

/**
 * Pick the single winner by comparing an ordered list of numeric keys,
 * each with a direction. Earlier keys dominate; later keys only break ties.
 * Iteration order (input order) is the final, deterministic tiebreak so the
 * result never depends on object identity.
 */
type Key = { value: (z: ScoredZone) => number; dir: 'max' | 'min' };

function selectWinner(zones: ScoredZone[], keys: Key[]): ScoredZone {
  if (zones.length === 0) {
    throw new Error('selectWinner requires at least one zone');
  }
  return zones.reduce((best, cur) => {
    for (const { value, dir } of keys) {
      const b = value(best);
      const c = value(cur);
      if (c === b) continue;
      const curWins = dir === 'max' ? c > b : c < b;
      return curWins ? cur : best;
    }
    // Fully tied across all keys: keep the earlier zone (input order).
    return best;
  });
}

/** Test 1 — Volume: max (hours × repetitiveness), tiebreak by compression. */
export function volumeTest(zones: ScoredZone[]): ScoredZone {
  return selectWinner(zones, [
    { value: (z) => z.hoursPerWeek * z.repetitiveness, dir: 'max' },
    { value: (z) => z.compressionScore, dir: 'max' },
  ]);
}

/** Test 2 — Margin: max margin impact, tiebreak min AI usage, tiebreak compression. */
export function marginTest(zones: ScoredZone[]): ScoredZone {
  return selectWinner(zones, [
    { value: (z) => z.marginImpact, dir: 'max' },
    { value: (z) => z.aiUsage, dir: 'min' },
    { value: (z) => z.compressionScore, dir: 'max' },
  ]);
}

/** Test 3 — Partner: max partner involvement, tiebreak by compression. */
export function partnerTest(zones: ScoredZone[]): ScoredZone {
  return selectWinner(zones, [
    { value: (z) => z.partnerInvolvement, dir: 'max' },
    { value: (z) => z.compressionScore, dir: 'max' },
  ]);
}

/**
 * Run the full diagnostic:
 *  - score every zone,
 *  - run the three synthesis tests,
 *  - the binding constraint is the mode of the three winners.
 *
 * On a 1-1-1 split (all three winners distinct) the zone with the highest
 * compression score among the three wins; its vote count is 1.
 */
export function runDiagnostic(answers: ZoneAnswer[]): DiagnosticResult {
  const zones = scoreZones(answers);
  if (zones.length === 0) {
    throw new Error('runDiagnostic requires at least one zone');
  }

  const winners: Record<TestId, ScoredZone> = {
    volume: volumeTest(zones),
    margin: marginTest(zones),
    partner: partnerTest(zones),
  };

  const testWinners: Record<TestId, string> = {
    volume: winners.volume.zoneId,
    margin: winners.margin.zoneId,
    partner: winners.partner.zoneId,
  };

  // Tally votes per winning zone.
  const winnerList = [winners.volume, winners.margin, winners.partner];
  const voteCount = new Map<string, number>();
  for (const w of winnerList) {
    voteCount.set(w.zoneId, (voteCount.get(w.zoneId) ?? 0) + 1);
  }

  const maxVotes = Math.max(...voteCount.values());

  // Candidates that achieved the modal vote count.
  const topZoneIds = new Set(
    [...voteCount.entries()].filter(([, n]) => n === maxVotes).map(([id]) => id),
  );

  // Among the modal candidates, prefer the highest compression score.
  // (For a clean 2- or 3-vote majority there is exactly one candidate; for a
  // 1-1-1 split all three tie at one vote and compression decides.)
  const candidateZones = winnerList.filter((z) => topZoneIds.has(z.zoneId));
  const bindingConstraint = selectWinner(candidateZones, [
    { value: (z) => z.compressionScore, dir: 'max' },
  ]);

  return {
    zones,
    testWinners,
    bindingConstraintZoneId: bindingConstraint.zoneId,
    votes: voteCount.get(bindingConstraint.zoneId) ?? 1,
  };
}

/**
 * Monthly cost of the binding constraint, in the firm's own money terms:
 * hours/week × 4.33 weeks/month × blended charge-out rate.
 * Returns null when no rate was supplied (the field is optional).
 */
export function constraintMonthlyCost(
  hoursPerWeek: number,
  chargeOutRate: number | null | undefined,
): number | null {
  if (chargeOutRate == null || !Number.isFinite(chargeOutRate)) return null;
  return hoursPerWeek * 4.33 * chargeOutRate;
}
