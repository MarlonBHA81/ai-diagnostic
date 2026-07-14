import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatMonthlyCost,
  currencySymbol,
  DEFAULT_CURRENCY,
  CURRENCY_ORDER,
} from './currency';

/** Normalise NBSP / narrow-NBSP that Intl inserts, so assertions are legible. */
const norm = (s: string) => s.replace(/ /g, ' ').replace(/ /g, ' ');

describe('currency config', () => {
  it('defaults to ZAR, first in the control order', () => {
    expect(DEFAULT_CURRENCY).toBe('ZAR');
    expect(CURRENCY_ORDER[0]).toBe('ZAR');
    expect(CURRENCY_ORDER).toEqual(['ZAR', 'USD', 'EUR', 'GBP']);
  });

  it('exposes the right symbols', () => {
    expect(currencySymbol('ZAR')).toBe('R');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('GBP')).toBe('£');
  });
});

describe('formatMoney — constraint cost in all four currencies', () => {
  it('ZAR uses R with space grouping', () => {
    expect(norm(formatMoney(84000, 'ZAR'))).toBe('R 84 000');
  });
  it('USD uses $ with comma grouping', () => {
    expect(norm(formatMoney(9700, 'USD'))).toBe('$9,700');
  });
  it('EUR uses € (en-IE grouping)', () => {
    expect(norm(formatMoney(84000, 'EUR'))).toBe('€84,000');
  });
  it('GBP uses £ with comma grouping', () => {
    expect(norm(formatMoney(84000, 'GBP'))).toBe('£84,000');
  });

  it('rounds to whole units by default', () => {
    expect(norm(formatMoney(9699.6, 'USD'))).toBe('$9,700');
  });
});

describe('formatMonthlyCost', () => {
  it('appends /month', () => {
    expect(norm(formatMonthlyCost(84000, 'ZAR')!)).toBe('R 84 000/month');
    expect(norm(formatMonthlyCost(9700, 'USD')!)).toBe('$9,700/month');
  });
  it('returns null when amount is null', () => {
    expect(formatMonthlyCost(null, 'ZAR')).toBeNull();
  });
});
