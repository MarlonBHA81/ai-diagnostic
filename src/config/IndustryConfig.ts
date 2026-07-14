/**
 * IndustryConfig — the single place all vertical copy lives.
 *
 * The scoring engine (src/scoring) and the brand tokens (src/styles/tokens.css)
 * are industry-agnostic. To add a vertical you author one file implementing this
 * interface; nothing else changes. Accounting is vertical #1 (route: /accounting).
 *
 * NOTE: the prose in src/config/industries/accounting.ts must be ported VERBATIM
 * from the prototype worksheet `7-zone-diagnostic-accounting-firm.html`. Until the
 * prototype is supplied, that file carries clearly-marked PLACEHOLDER copy so the
 * app compiles and renders — it is not the final wording.
 */

import type { AiUsageLevel, MarginImpactLevel } from '../scoring/types';

/** A selectable option with the numeric value fed to the scoring engine. */
export interface ScoredOption<V extends number = number> {
  value: V;
  label: string;
  /** Optional longer description shown under the option (e.g. AI-usage detail). */
  description?: string;
}

/** One zone's full content and question set. */
export interface ZoneConfig {
  /** Stable id used by the scoring engine and webhook payload. */
  id: string;
  /** Display name, e.g. "Client Delivery". */
  name: string;
  /** One or two sentence description of the zone. */
  description: string;
  /** The "Think:" example line. */
  thinkExample: string;
  /** Placeholders for the two optional free-text questions, in order. */
  freeTextPlaceholders: [bottleneck: string, desiredFix: string];
}

/** Labels for the five scored dimensions and their option scales. */
export interface DimensionConfig {
  /** Repetitiveness scale endpoints, e.g. ["Bespoke", "Process-driven"] (1..5). */
  repetitivenessScale: [low: string, high: string];
  /** AI usage options (None/Basic/Moderate/Advanced) with industry descriptions. */
  aiUsageOptions: ScoredOption<AiUsageLevel>[];
  /** Margin impact options (Low/Medium/High/Critical). */
  marginImpactOptions: ScoredOption<MarginImpactLevel>[];
  /** Partner-involvement scale endpoints, e.g. ["Never", "I'm the bottleneck"] (1..5). */
  partnerInvolvementScale: [low: string, high: string];
  /** Label for the partner-involvement dimension, e.g. "Partner involvement". */
  partnerInvolvementLabel: string;
}

/** Next-step guidance keyed to the constraint zone's current AI level. */
export interface NextStepConfig {
  /** aiUsage 1 (None) → build a context library. */
  contextLibrary: NextStepCard;
  /** aiUsage 2 (Basic) → redesign, don't retrofit. */
  redesign: NextStepCard;
  /** aiUsage 3 (Moderate) → integrate. */
  integrate: NextStepCard;
  /** aiUsage 4 (Advanced) → the constraint has shifted. */
  constraintShifted: NextStepCard;
}

export interface NextStepCard {
  heading: string;
  body: string;
  /** "What this looks like in a firm" example. */
  firmExample: string;
}

export interface IndustryConfig {
  /** Route slug, e.g. "accounting". */
  slug: string;
  /** Source tag in webhook payloads, e.g. "accounting-diagnostic". */
  sourceTag: string;
  /** Human name, e.g. "Accounting Firm". */
  displayName: string;

  /** Welcome/gate screen copy. */
  welcome: {
    headline: string;
    subhead: string;
  };

  /** Firm-baseline screen copy. */
  baseline: {
    revenueLabel: string;
    teamSizeLabel: string;
    /** Blended charge-out rate label (industry term). */
    chargeOutRateLabel: string;
    chargeOutRateNote: string;
    /** Verbatim busy-season note from the prototype. */
    busySeasonNote: string;
  };

  /** Shared dimension labels/scales. */
  dimensions: DimensionConfig;

  /** The 7 zones, in display order. */
  zones: ZoneConfig[];

  /** Next-step cards keyed to constraint AI level. */
  nextSteps: NextStepConfig;

  /** Closing content on the results screen. */
  closing: {
    /** Simkin quote shown on results. */
    quote: string;
    quoteAttribution: string;
    /** Re-run reminder line. */
    reRunNote: string;
    ctaText: string;
    ctaUrl: string;
  };
}
