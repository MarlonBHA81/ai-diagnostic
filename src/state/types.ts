import type { CurrencyCode } from '../currency/currency';
import type { CountryCode } from 'libphonenumber-js/min';
import type { AiUsageLevel, MarginImpactLevel } from '../scoring/types';
import type { TapValue } from '../lib/events';

export type { TapValue };

export interface LeadDetails {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  /** Selected country for the mobile field. */
  mobileCountry: CountryCode;
  /** What the user typed (national format). */
  mobileNational: string;
  /** Normalised E.164, set on valid submit. */
  mobileE164: string;
}

export interface Baseline {
  currency: CurrencyCode;
  monthlyRevenue: number | null;
  teamSize: number | null;
  chargeOutRate: number | null;
}

export interface ZoneAnswerState {
  hours: number | null;
  rep: number | null;
  ai: AiUsageLevel | null;
  margin: MarginImpactLevel | null;
  own: number | null;
  bottleneck: string;
  desiredFix: string;
}

/** Quick Mode: one zone's three taps (repetitive / time / AI usage). */
export interface QuickZoneAnswer {
  repetitive: TapValue | null;
  time: TapValue | null;
  aiUsage: TapValue | null;
}

/**
 * Full flow:  welcome → baseline → 0..6 (zone index) → details → results
 * Quick flow: welcome → baseline → 0..6 (zone index) → quickHours → details → results
 */
export type Step = 'welcome' | 'baseline' | 'quickHours' | 'details' | 'results' | number;

export interface QuizState {
  step: Step;
  lead: LeadDetails | null;
  baseline: Baseline;
  answers: Record<string, ZoneAnswerState>;
  /** Quick Mode taps, keyed by zone id (parallel to `answers`). */
  quick: Record<string, QuickZoneAnswer>;
  /** Quick Mode: banded weekly hours for the winning zone (3 / 10 / 20). */
  quickHours: number | null;
  /** Timestamp (ms) when the quiz was started, for the anti-spam min-duration. */
  startedAt: number | null;
  /** Honeypot value captured on the details form; empty for real users. */
  honeypot: string;
}

export function emptyAnswer(): ZoneAnswerState {
  return { hours: null, rep: null, ai: null, margin: null, own: null, bottleneck: '', desiredFix: '' };
}

export function emptyQuick(): QuickZoneAnswer {
  return { repetitive: null, time: null, aiUsage: null };
}
