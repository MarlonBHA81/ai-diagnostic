import { describe, it, expect } from 'vitest';
import { constraintMonthlyCost } from './engine';
import { formatMonthlyCost } from '../currency/currency';
import type { CurrencyCode } from '../currency/currency';

// Separator (space vs comma) is ICU-dependent; strip it and check symbol+digits.
const stripSep = (s: string) => s.replace(/[\s,  ]/g, '');

describe('constraint monthly cost — formatted in all four currencies', () => {
  // hours 20/wk × 4.33 × rate 1000 = 86,600
  const cost = constraintMonthlyCost(20, 1000);

  const cases: Array<[CurrencyCode, string]> = [
    ['ZAR', 'R86600/month'],
    ['USD', '$86600/month'],
    ['EUR', '€86600/month'],
    ['GBP', '£86600/month'],
  ];

  it.each(cases)('%s formats correctly', (code, expected) => {
    expect(cost).toBeCloseTo(86600, 5);
    expect(stripSep(formatMonthlyCost(cost, code)!)).toBe(expected);
  });

  it('is null when no charge-out rate is given', () => {
    expect(formatMonthlyCost(constraintMonthlyCost(20, null), 'ZAR')).toBeNull();
  });
});
