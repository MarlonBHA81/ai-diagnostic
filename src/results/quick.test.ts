import { describe, it, expect } from 'vitest';
import {
  computeQuickResults,
  modelFromCompletedEvent,
  quickWhy,
} from './buildResult';
import { genericConfig } from '../config/industries/generic';
import type { QuickZoneAnswer } from '../state/types';
import type { DiagnosticCompletedEvent, ZoneResult } from '../lib/events';

const config = genericConfig;

/** Build a full quick-answer map, defaulting every zone to a low-leverage tap. */
function quickMap(overrides: Record<string, Partial<QuickZoneAnswer>>): Record<string, QuickZoneAnswer> {
  const map: Record<string, QuickZoneAnswer> = {};
  for (const z of config.zones) {
    map[z.id] = { repetitive: 'no', time: 'no', aiUsage: 'yes', ...overrides[z.id] };
  }
  return map;
}

describe('computeQuickResults', () => {
  it('picks the most repetitive, time-heavy, least-AI zone as the constraint', () => {
    // Make "finance" the clear leader: very repetitive, lots of time, no AI.
    const answers = quickMap({
      finance: { repetitive: 'yes', time: 'yes', aiUsage: 'no' },
    });
    const model = computeQuickResults(config, answers, 20, 150);
    expect(model.mode).toBe('quick');
    expect(model.constraint.name).toBe('Finance');
    // Highest compression of all zones.
    const maxScore = Math.max(...model.zones.map((z) => z.compressionScore));
    expect(model.constraint.compressionScore).toBe(maxScore);
  });

  it('uses the banded hours for the cost, not the ranking proxy', () => {
    const answers = quickMap({
      finance: { repetitive: 'yes', time: 'yes', aiUsage: 'no' },
    });
    const model = computeQuickResults(config, answers, 10, 100);
    // 10 hrs/wk × 4.33 × 100 = 4330
    expect(model.monthlyCost).toBeCloseTo(10 * 4.33 * 100, 5);
    expect(model.constraint.hoursPerWeek).toBe(10);
  });

  it('carries the raw taps through for display', () => {
    const answers = quickMap({ sales: { repetitive: 'somewhat', time: 'yes', aiUsage: 'notsure' } });
    const model = computeQuickResults(config, answers, 3, null);
    const sales = model.zones.find((z) => z.name === 'Sales')!;
    expect(sales.tap).toEqual({ repetitive: 'somewhat', time: 'yes', aiUsage: 'notsure' });
    expect(model.monthlyCost).toBeNull(); // no rate supplied
  });

  it('round-trips through a diagnostic_completed event (shared link parity)', () => {
    const answers = quickMap({
      delivery: { repetitive: 'yes', time: 'yes', aiUsage: 'no' },
    });
    const live = computeQuickResults(config, answers, 20, 200);

    // Build the event exactly as Results.tsx does.
    const zones: ZoneResult[] = live.zones.map((z) => ({
      zone: z.name,
      hoursPerWeek: z.hoursPerWeek,
      repetitiveness: z.repetitiveness,
      aiUsage: z.aiLabel as ZoneResult['aiUsage'],
      marginImpact: z.marginLabel as ZoneResult['marginImpact'],
      partnerInvolvement: z.partnerInvolvement,
      compressionScore: z.compressionScore,
      bottleneck: '',
      desiredFix: '',
      ...(z.tap ? { quick: z.tap } : {}),
    }));
    const event: DiagnosticCompletedEvent = {
      event: 'diagnostic_completed',
      completedAt: new Date().toISOString(),
      source: config.sourceTag,
      mode: 'quick',
      lead: { firstName: 'A', lastName: 'B', businessName: 'Acme', email: 'a@b.co', mobile: '+100' },
      baseline: { currency: 'ZAR', monthlyRevenue: null, teamSize: null, chargeOutRate: 200 },
      bindingConstraint: live.constraint.name,
      constraintVotes: live.votes,
      constraintMonthlyCost: live.monthlyCost,
      zones,
    };

    const rebuilt = modelFromCompletedEvent(event, config);
    expect(rebuilt.mode).toBe('quick');
    expect(rebuilt.constraint.name).toBe(live.constraint.name);
    expect(rebuilt.monthlyCost).toBe(live.monthlyCost);
    expect(rebuilt.zones.map((z) => z.compressionScore)).toEqual(
      live.zones.map((z) => z.compressionScore),
    );
  });

  it('quickWhy names the constraint and the business', () => {
    const answers = quickMap({ ops: { repetitive: 'yes', time: 'yes', aiUsage: 'no' } });
    const model = computeQuickResults(config, answers, 10, null);
    const why = quickWhy(model, 'Acme');
    expect(why).toContain('Acme');
    expect(why).toContain(model.constraint.name);
  });
});
