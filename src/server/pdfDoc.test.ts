import { describe, it, expect } from 'vitest';
import { buildReportPdf } from './pdfDoc';
import { genericConfig } from '../config/industries/generic';
import type { DiagnosticCompletedEvent } from '../lib/events';

function quickEvent(): DiagnosticCompletedEvent {
  return {
    event: 'diagnostic_completed',
    completedAt: new Date().toISOString(),
    source: 'business-diagnostic',
    mode: 'quick',
    lead: {
      firstName: 'Marlon',
      lastName: 'Test',
      businessName: 'Story Advantage',
      email: 'marlon@example.com',
      mobile: '+27821234567',
    },
    baseline: { currency: 'ZAR', monthlyRevenue: 120000, teamSize: 8, chargeOutRate: 150 },
    bindingConstraint: 'Finance',
    constraintVotes: 0,
    constraintMonthlyCost: 10 * 4.33 * 150,
    zones: [
      { zone: 'Lead Generation', hoursPerWeek: 3, repetitiveness: 1, aiUsage: 'Moderate', marginImpact: 'Medium', partnerInvolvement: 3, compressionScore: 9, bottleneck: '', desiredFix: '', quick: { repetitive: 'no', time: 'no', aiUsage: 'yes' } },
      { zone: 'Sales', hoursPerWeek: 3, repetitiveness: 1, aiUsage: 'Moderate', marginImpact: 'Medium', partnerInvolvement: 3, compressionScore: 9, bottleneck: '', desiredFix: '', quick: { repetitive: 'no', time: 'no', aiUsage: 'yes' } },
      { zone: 'Delivery', hoursPerWeek: 3, repetitiveness: 1, aiUsage: 'Moderate', marginImpact: 'Medium', partnerInvolvement: 3, compressionScore: 9, bottleneck: '', desiredFix: '', quick: { repetitive: 'no', time: 'no', aiUsage: 'yes' } },
      { zone: 'Operations', hoursPerWeek: 3, repetitiveness: 1, aiUsage: 'Moderate', marginImpact: 'Medium', partnerInvolvement: 3, compressionScore: 9, bottleneck: '', desiredFix: '', quick: { repetitive: 'no', time: 'no', aiUsage: 'yes' } },
      { zone: 'Finance', hoursPerWeek: 10, repetitiveness: 5, aiUsage: 'None', marginImpact: 'Medium', partnerInvolvement: 3, compressionScore: 450, bottleneck: '', desiredFix: '', quick: { repetitive: 'yes', time: 'yes', aiUsage: 'no' } },
      { zone: 'Team', hoursPerWeek: 3, repetitiveness: 1, aiUsage: 'Moderate', marginImpact: 'Medium', partnerInvolvement: 3, compressionScore: 9, bottleneck: '', desiredFix: '', quick: { repetitive: 'no', time: 'no', aiUsage: 'yes' } },
      { zone: 'Owner', hoursPerWeek: 3, repetitiveness: 1, aiUsage: 'Moderate', marginImpact: 'Medium', partnerInvolvement: 3, compressionScore: 9, bottleneck: '', desiredFix: '', quick: { repetitive: 'no', time: 'no', aiUsage: 'yes' } },
    ],
    resultUrl: 'https://diagnostic.storyadvantage.agency/r/00000000-0000-0000-0000-000000000000',
    pdfUrl: 'https://diagnostic.storyadvantage.agency/api/pdf?id=00000000-0000-0000-0000-000000000000',
  };
}

describe('buildReportPdf', () => {
  it('produces a valid, non-trivial PDF (quick mode)', async () => {
    const bytes = await buildReportPdf(quickEvent(), genericConfig);
    expect(bytes.length).toBeGreaterThan(1500);
    // PDF magic header "%PDF".
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it('produces a valid PDF for the full mode too', async () => {
    const ev = quickEvent();
    ev.mode = 'full';
    for (const z of ev.zones) delete z.quick;
    const bytes = await buildReportPdf(ev, genericConfig);
    expect(bytes.length).toBeGreaterThan(1500);
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});
