import { describe, it, expect } from 'vitest';
import {
  compressionScore,
  scoreZones,
  volumeTest,
  marginTest,
  partnerTest,
  runDiagnostic,
  constraintMonthlyCost,
} from './engine';
import type { ZoneAnswer } from './types';

/** Build a zone answer with sensible neutral defaults, overridable per test. */
function zone(id: string, o: Partial<ZoneAnswer> = {}): ZoneAnswer {
  return {
    zoneId: id,
    hoursPerWeek: 1,
    repetitiveness: 1,
    aiUsage: 1,
    marginImpact: 1,
    partnerInvolvement: 1,
    ...o,
  };
}

describe('compressionScore', () => {
  it('is hours × repetitiveness × (6 − aiUsage)', () => {
    // 10 × 4 × (6 − 1) = 200
    expect(compressionScore(zone('a', { hoursPerWeek: 10, repetitiveness: 4, aiUsage: 1 }))).toBe(200);
    // 10 × 4 × (6 − 4) = 80
    expect(compressionScore(zone('a', { hoursPerWeek: 10, repetitiveness: 4, aiUsage: 4 }))).toBe(80);
  });

  it('is zero when any factor is zero', () => {
    expect(compressionScore(zone('a', { hoursPerWeek: 0, repetitiveness: 5 }))).toBe(0);
  });

  it('advanced AI usage compresses less than none', () => {
    const none = compressionScore(zone('a', { hoursPerWeek: 5, repetitiveness: 3, aiUsage: 1 }));
    const adv = compressionScore(zone('a', { hoursPerWeek: 5, repetitiveness: 3, aiUsage: 4 }));
    expect(none).toBeGreaterThan(adv);
  });
});

describe('scoreZones', () => {
  it('attaches compression score and preserves input order', () => {
    const scored = scoreZones([
      zone('a', { hoursPerWeek: 2, repetitiveness: 2, aiUsage: 2 }),
      zone('b', { hoursPerWeek: 1, repetitiveness: 1, aiUsage: 1 }),
    ]);
    expect(scored.map((z) => z.zoneId)).toEqual(['a', 'b']);
    expect(scored[0].compressionScore).toBe(2 * 2 * 4);
    expect(scored[1].compressionScore).toBe(1 * 1 * 5);
  });
});

describe('Test 1 — volume (max hours × repetitiveness, tiebreak compression)', () => {
  it('picks the highest hours × repetitiveness', () => {
    const zones = scoreZones([
      zone('a', { hoursPerWeek: 10, repetitiveness: 2 }), // 20
      zone('b', { hoursPerWeek: 3, repetitiveness: 5 }), // 15
      zone('c', { hoursPerWeek: 4, repetitiveness: 6 }), // 24
    ]);
    expect(volumeTest(zones).zoneId).toBe('c');
  });

  it('breaks a hours×rep tie by compression score', () => {
    // Both have hours×rep = 20, but different AI usage → different compression.
    const zones = scoreZones([
      zone('a', { hoursPerWeek: 10, repetitiveness: 2, aiUsage: 4 }), // comp 10*2*2=40
      zone('b', { hoursPerWeek: 5, repetitiveness: 4, aiUsage: 1 }), // comp 5*4*5=100
    ]);
    expect(volumeTest(zones).zoneId).toBe('b');
  });
});

describe('Test 2 — margin (max margin, tiebreak min AI usage, tiebreak compression)', () => {
  it('picks the highest margin impact', () => {
    const zones = scoreZones([
      zone('a', { marginImpact: 2 }),
      zone('b', { marginImpact: 4 }),
      zone('c', { marginImpact: 3 }),
    ]);
    expect(marginTest(zones).zoneId).toBe('b');
  });

  it('breaks a margin tie by the LOWEST AI usage', () => {
    const zones = scoreZones([
      zone('a', { marginImpact: 4, aiUsage: 3 }),
      zone('b', { marginImpact: 4, aiUsage: 1 }), // least AI → most upside
      zone('c', { marginImpact: 4, aiUsage: 4 }),
    ]);
    expect(marginTest(zones).zoneId).toBe('b');
  });

  it('breaks a margin + AI-usage tie by compression', () => {
    const zones = scoreZones([
      zone('a', { marginImpact: 4, aiUsage: 2, hoursPerWeek: 2, repetitiveness: 2 }), // comp 16
      zone('b', { marginImpact: 4, aiUsage: 2, hoursPerWeek: 10, repetitiveness: 3 }), // comp 120
    ]);
    expect(marginTest(zones).zoneId).toBe('b');
  });
});

describe('Test 3 — partner (max partner involvement, tiebreak compression)', () => {
  it('picks the highest partner involvement', () => {
    const zones = scoreZones([
      zone('a', { partnerInvolvement: 2 }),
      zone('b', { partnerInvolvement: 5 }),
      zone('c', { partnerInvolvement: 3 }),
    ]);
    expect(partnerTest(zones).zoneId).toBe('b');
  });

  it('breaks a partner tie by compression', () => {
    const zones = scoreZones([
      zone('a', { partnerInvolvement: 5, hoursPerWeek: 1, repetitiveness: 1 }), // comp 5
      zone('b', { partnerInvolvement: 5, hoursPerWeek: 8, repetitiveness: 4, aiUsage: 1 }), // comp 160
    ]);
    expect(partnerTest(zones).zoneId).toBe('b');
  });
});

describe('runDiagnostic — binding constraint', () => {
  it('takes the mode of the three test winners (2-1 split)', () => {
    // Design zones so 'a' wins volume + partner, 'b' wins margin.
    const zones: ZoneAnswer[] = [
      zone('a', { hoursPerWeek: 10, repetitiveness: 5, partnerInvolvement: 5, marginImpact: 1, aiUsage: 1 }),
      zone('b', { hoursPerWeek: 1, repetitiveness: 1, partnerInvolvement: 1, marginImpact: 4, aiUsage: 1 }),
      zone('c'),
    ];
    const r = runDiagnostic(zones);
    expect(r.testWinners.volume).toBe('a');
    expect(r.testWinners.partner).toBe('a');
    expect(r.testWinners.margin).toBe('b');
    expect(r.bindingConstraintZoneId).toBe('a');
    expect(r.votes).toBe(2);
  });

  it('handles a unanimous 3-0 winner', () => {
    const zones: ZoneAnswer[] = [
      zone('a', { hoursPerWeek: 20, repetitiveness: 5, partnerInvolvement: 5, marginImpact: 4, aiUsage: 1 }),
      zone('b'),
      zone('c'),
    ];
    const r = runDiagnostic(zones);
    expect(r.bindingConstraintZoneId).toBe('a');
    expect(r.votes).toBe(3);
  });

  it('on a 1-1-1 split, the highest compression among the three winners wins (votes = 1)', () => {
    // a wins volume, b wins margin, c wins partner — all distinct.
    // c has the highest compression, so it must win the tiebreak.
    const zones: ZoneAnswer[] = [
      // a: dominates hours×rep but low compression (high AI usage)
      zone('a', { hoursPerWeek: 10, repetitiveness: 5, aiUsage: 4, marginImpact: 1, partnerInvolvement: 1 }), // comp 100
      // b: dominates margin, mid compression
      zone('b', { hoursPerWeek: 6, repetitiveness: 4, aiUsage: 3, marginImpact: 4, partnerInvolvement: 1 }), // comp 72
      // c: dominates partner, highest compression
      zone('c', { hoursPerWeek: 9, repetitiveness: 5, aiUsage: 1, marginImpact: 1, partnerInvolvement: 5 }), // comp 225
    ];
    const r = runDiagnostic(zones);
    expect(r.testWinners.volume).toBe('a');
    expect(r.testWinners.margin).toBe('b');
    expect(r.testWinners.partner).toBe('c');
    // three distinct winners → tiebreak by compression → c (225)
    expect(r.bindingConstraintZoneId).toBe('c');
    expect(r.votes).toBe(1);
  });

  it('records votes for the winning zone', () => {
    const zones: ZoneAnswer[] = [
      zone('a', { hoursPerWeek: 10, repetitiveness: 5, partnerInvolvement: 5, marginImpact: 4, aiUsage: 1 }),
      zone('b', { hoursPerWeek: 9, repetitiveness: 5, marginImpact: 4, aiUsage: 1 }),
    ];
    const r = runDiagnostic(zones);
    expect(r.votes).toBeGreaterThanOrEqual(1);
    expect(r.votes).toBeLessThanOrEqual(3);
  });
});

describe('constraintMonthlyCost', () => {
  it('is hours × 4.33 × rate', () => {
    expect(constraintMonthlyCost(10, 1000)).toBeCloseTo(43300, 5);
  });
  it('returns null when no rate is given', () => {
    expect(constraintMonthlyCost(10, null)).toBeNull();
    expect(constraintMonthlyCost(10, undefined)).toBeNull();
  });
});
