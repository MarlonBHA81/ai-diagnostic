import { describe, it, expect } from 'vitest';
import { renderReport } from './renderReport';
import { accountingConfig } from '../config/industries/accounting';
import type { DiagnosticCompletedEvent, ZoneResult } from '../lib/events';

function zoneRow(zone: string, o: Partial<ZoneResult> = {}): ZoneResult {
  return {
    zone,
    hoursPerWeek: 1,
    repetitiveness: 1,
    aiUsage: 'None',
    marginImpact: 'Low',
    partnerInvolvement: 1,
    compressionScore: 0,
    bottleneck: '',
    desiredFix: '',
    ...o,
  };
}

function baseEvent(overrides: Partial<DiagnosticCompletedEvent> = {}): DiagnosticCompletedEvent {
  return {
    event: 'diagnostic_completed',
    completedAt: '2026-07-14T00:00:00.000Z',
    source: 'accounting-diagnostic',
    lead: {
      firstName: 'Thabo',
      lastName: 'Nkosi',
      businessName: 'Nkosi & Partners',
      email: 'thabo@nkosi.co.za',
      mobile: '+27821234567',
    },
    baseline: { currency: 'ZAR', monthlyRevenue: 500000, teamSize: 12, chargeOutRate: 1000 },
    bindingConstraint: 'Client Delivery',
    constraintVotes: 3,
    constraintMonthlyCost: null,
    zones: [
      zoneRow('Lead Generation'),
      zoneRow('Sales & Onboarding'),
      // Client Delivery dominates all three tests.
      zoneRow('Client Delivery', {
        hoursPerWeek: 30,
        repetitiveness: 5,
        aiUsage: 'None',
        marginImpact: 'Critical',
        partnerInvolvement: 5,
        compressionScore: 750,
        bottleneck: 'Manual data entry',
        desiredFix: 'Auto-extract transactions',
      }),
      zoneRow('Operations'),
      zoneRow('Firm Finance'),
      zoneRow('Team'),
      zoneRow('Partner/Owner'),
    ],
    ...overrides,
  };
}

describe('renderReport', () => {
  it('subjects on the binding constraint with the first name', () => {
    const r = renderReport(baseEvent(), accountingConfig);
    expect(r.subject).toBe('Thabo, your binding constraint is Client Delivery');
  });

  it('prices the constraint in the selected currency (ZAR)', () => {
    const r = renderReport(baseEvent(), accountingConfig);
    // 30 hrs × 4.33 × R1000 = 129,900. Separator is ICU-dependent; strip it.
    expect(r.html.replace(/[\s,  ]/g, '')).toContain('R129900/month');
    expect(r.text.replace(/[\s,  ]/g, '')).toContain('R129900/month');
  });

  it('prices in USD when the baseline currency is USD', () => {
    const ev = baseEvent({ baseline: { currency: 'USD', monthlyRevenue: null, teamSize: null, chargeOutRate: 1000 } });
    const r = renderReport(ev, accountingConfig);
    expect(r.html.replace(/[\s,  ]/g, '')).toContain('$129900/month');
  });

  it('escapes free-text to prevent XSS', () => {
    const ev = baseEvent();
    ev.zones[2].bottleneck = '<script>alert(1)</script>';
    ev.zones[2].desiredFix = '"><img src=x onerror=alert(1)>';
    const r = renderReport(ev, accountingConfig);
    expect(r.html).not.toContain('<script>alert(1)</script>');
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html).not.toContain('<img src=x');
  });

  it('omits the cost line when no charge-out rate is given', () => {
    const ev = baseEvent({ baseline: { currency: 'ZAR', monthlyRevenue: null, teamSize: null, chargeOutRate: null } });
    const r = renderReport(ev, accountingConfig);
    expect(r.html).not.toContain('/month');
  });
});
