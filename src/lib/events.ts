/**
 * Webhook event payload shapes, shared by the client and the serverless route.
 * These match the two-event design the n8n workflow expects:
 *  - lead_captured        (fired when details are submitted, up front)
 *  - diagnostic_completed (fired on results render)
 */
import type { CurrencyCode } from '../currency/currency';

export interface LeadBlock {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  mobile: string; // E.164
}

export interface LeadCapturedEvent {
  event: 'lead_captured';
  capturedAt: string; // ISO-8601
  source: string; // e.g. "accounting-diagnostic"
  lead: LeadBlock;
  /** Honeypot + timing, checked server-side; never persisted downstream. */
  antiSpam?: { honeypot: string; startedAt: number };
}

export interface ZoneResult {
  zone: string;
  hoursPerWeek: number;
  repetitiveness: number;
  aiUsage: 'None' | 'Basic' | 'Moderate' | 'Advanced';
  marginImpact: 'Low' | 'Medium' | 'High' | 'Critical';
  partnerInvolvement: number;
  compressionScore: number;
  bottleneck: string;
  desiredFix: string;
}

export interface DiagnosticCompletedEvent {
  event: 'diagnostic_completed';
  completedAt: string; // ISO-8601
  source: string;
  lead: LeadBlock;
  baseline: {
    currency: CurrencyCode;
    monthlyRevenue: number | null;
    teamSize: number | null;
    chargeOutRate: number | null;
  };
  bindingConstraint: string;
  constraintVotes: number;
  constraintMonthlyCost: number | null;
  zones: ZoneResult[];
  /** Set server-side after the row is stored in Supabase. */
  resultId?: string;
  /** Shareable link to view the stored results (added server-side). */
  resultUrl?: string;
  /** Hosted PDF report link (generated on first click, cached in storage). */
  pdfUrl?: string;
  /** Honeypot + timing, checked server-side. */
  antiSpam?: { honeypot: string; startedAt: number };
}
