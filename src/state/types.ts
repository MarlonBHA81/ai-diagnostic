import type { CurrencyCode } from '../currency/currency';
import type { CountryCode } from 'libphonenumber-js/min';
import type { AiUsageLevel, MarginImpactLevel } from '../scoring/types';

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

/** welcome → baseline → 0..6 (zone index) → results */
export type Step = 'welcome' | 'baseline' | 'results' | number;

export interface QuizState {
  step: Step;
  lead: LeadDetails | null;
  baseline: Baseline;
  answers: Record<string, ZoneAnswerState>;
  /** Timestamp (ms) when the quiz gate was passed — anti-spam min-duration. */
  startedAt: number | null;
  /** Whether the lead_captured event has been fired (fire-once). */
  leadCaptured: boolean;
}

export function emptyAnswer(): ZoneAnswerState {
  return { hours: null, rep: null, ai: null, margin: null, own: null, bottleneck: '', desiredFix: '' };
}
