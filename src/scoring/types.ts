/**
 * Types for the 7-Zone diagnostic scoring engine.
 *
 * These are industry-agnostic: the engine works on numeric dimensions only.
 * Industry-specific labels (zone names, AI-usage descriptions, etc.) live in
 * the IndustryConfig; the engine never sees prose.
 */

/** AI usage level, encoded 1..4 so that `6 - aiUsage` yields the compression multiplier. */
export type AiUsageLevel = 1 | 2 | 3 | 4; // None | Basic | Moderate | Advanced

/** Margin impact, encoded 1..4 (Low | Medium | High | Critical). */
export type MarginImpactLevel = 1 | 2 | 3 | 4;

/** The five scored dimensions captured for a single zone. */
export interface ZoneAnswer {
  /** Stable zone id (e.g. "client-delivery"). */
  zoneId: string;
  /** Hours/week spent in this zone (>= 0). */
  hoursPerWeek: number;
  /** Repetitiveness, 1 (Bespoke) .. 5 (Process-driven). */
  repetitiveness: number;
  /** Current AI usage, 1 (None) .. 4 (Advanced). */
  aiUsage: AiUsageLevel;
  /** Margin impact, 1 (Low) .. 4 (Critical). */
  marginImpact: MarginImpactLevel;
  /** Partner/owner involvement, 1 (Never) .. 5 (I'm the bottleneck). */
  partnerInvolvement: number;
}

/** A zone answer plus its derived compression score. */
export interface ScoredZone extends ZoneAnswer {
  compressionScore: number;
}

/** Which of the three synthesis tests a zone won. */
export type TestId = 'volume' | 'margin' | 'partner';

export interface DiagnosticResult {
  /** All zones with their compression scores, in input order. */
  zones: ScoredZone[];
  /** The winning zone id for each of the three tests. */
  testWinners: Record<TestId, string>;
  /** The binding-constraint zone id (mode of the three winners, tiebroken by compression). */
  bindingConstraintZoneId: string;
  /** How many of the three tests the binding constraint won (1..3). */
  votes: number;
}
