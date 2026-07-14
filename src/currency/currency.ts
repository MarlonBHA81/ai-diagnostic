/**
 * Multi-currency formatting.
 *
 * The chosen currency drives every monetary display in the app and the report
 * email. Changing currency reformats displays; it never converts values.
 * Thousands separators and grouping come from Intl.NumberFormat with the
 * matching locale — never hand-rolled.
 */

export type CurrencyCode = 'ZAR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyDef {
  code: CurrencyCode;
  /** Display symbol for the segmented control and input prefix. */
  symbol: string;
  /** BCP-47 locale that produces the right grouping/spacing for this currency. */
  locale: string;
  /** Short label for the segmented control. */
  label: string;
}

/** ZAR is the default (first). Order drives the segmented control. */
export const CURRENCIES: Record<CurrencyCode, CurrencyDef> = {
  ZAR: { code: 'ZAR', symbol: 'R', locale: 'en-ZA', label: 'South African Rand' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', label: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', locale: 'en-IE', label: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'British Pound' },
};

export const CURRENCY_ORDER: CurrencyCode[] = ['ZAR', 'USD', 'EUR', 'GBP'];

export const DEFAULT_CURRENCY: CurrencyCode = 'ZAR';

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES[code].symbol;
}

/**
 * Format a money amount in the given currency, e.g. `R 84 000` / `$9,700`.
 * Defaults to whole units (no minor units) which matches the report copy;
 * pass fractionDigits for cases that need cents.
 */
export function formatMoney(
  amount: number,
  code: CurrencyCode,
  fractionDigits = 0,
): string {
  const { locale } = CURRENCIES[code];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

/** Format a monthly cost as `<money>/month`, or null when no amount is given. */
export function formatMonthlyCost(
  amount: number | null,
  code: CurrencyCode,
): string | null {
  if (amount == null) return null;
  return `${formatMoney(amount, code)}/month`;
}

/** Format a plain number with locale grouping (no currency symbol). */
export function formatNumber(amount: number, code: CurrencyCode): string {
  return new Intl.NumberFormat(CURRENCIES[code].locale).format(amount);
}
