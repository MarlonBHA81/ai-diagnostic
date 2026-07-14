import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatMonthlyCost,
  currencySymbol,
  DEFAULT_CURRENCY,
  CURRENCY_ORDER,
} from './currency';

/**
 * The exact group separator (space vs comma) is ICU-version dependent per
 * locale, so assertions strip all separators and check the symbol + digits +
 * that grouping happened, rather than a specific separator character.
 */
const SEP = /[\s,  ]/g;
const stripSep = (s: string) => s.replace(SEP, '');
/** True if a separator sits between the numeric digits (i.e. thousands grouped). */
const isGrouped = (s: string) => /\d[\s,  ]\d/.test(s);

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

describe('formatMoney — symbol + grouped digits in all four currencies', () => {
  it('ZAR shows R and grouped 84000', () => {
    const s = formatMoney(84000, 'ZAR');
    expect(s.startsWith('R')).toBe(true);
    expect(stripSep(s)).toBe('R84000');
    expect(isGrouped(s)).toBe(true);
  });
  it('USD shows $ and grouped 9700', () => {
    const s = formatMoney(9700, 'USD');
    expect(stripSep(s)).toBe('$9700');
    expect(isGrouped(s)).toBe(true);
  });
  it('EUR shows € and grouped 84000', () => {
    const s = formatMoney(84000, 'EUR');
    expect(stripSep(s)).toBe('€84000');
    expect(isGrouped(s)).toBe(true);
  });
  it('GBP shows £ and grouped 84000', () => {
    const s = formatMoney(84000, 'GBP');
    expect(stripSep(s)).toBe('£84000');
    expect(isGrouped(s)).toBe(true);
  });

  it('rounds to whole units by default (no decimals)', () => {
    expect(stripSep(formatMoney(9699.6, 'USD'))).toBe('$9700');
  });
});

describe('formatMonthlyCost', () => {
  it('appends /month in the selected currency', () => {
    expect(stripSep(formatMonthlyCost(84000, 'ZAR')!)).toBe('R84000/month');
    expect(stripSep(formatMonthlyCost(9700, 'USD')!)).toBe('$9700/month');
  });
  it('returns null when amount is null', () => {
    expect(formatMonthlyCost(null, 'ZAR')).toBeNull();
  });
});
