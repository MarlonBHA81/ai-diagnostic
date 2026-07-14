import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

/** Default country for the mobile field (spec: ZA +27). */
export const DEFAULT_COUNTRY: CountryCode = 'ZA';

export interface CountryOption {
  code: CountryCode;
  name: string;
  callingCode: string; // digits only, e.g. "27"
}

/** Curated country list for the selector, ZA first. Validation still accepts
 *  any real number for these countries via libphonenumber-js. */
const COUNTRY_NAMES: Array<[CountryCode, string]> = [
  ['ZA', 'South Africa'],
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['IE', 'Ireland'],
  ['AU', 'Australia'],
  ['NZ', 'New Zealand'],
  ['CA', 'Canada'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['NL', 'Netherlands'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['AE', 'United Arab Emirates'],
  ['IN', 'India'],
  ['SG', 'Singapore'],
  ['KE', 'Kenya'],
  ['NG', 'Nigeria'],
  ['NA', 'Namibia'],
  ['BW', 'Botswana'],
  ['ZW', 'Zimbabwe'],
];

export const COUNTRIES: CountryOption[] = COUNTRY_NAMES.map(([code, name]) => ({
  code,
  name,
  callingCode: getCountryCallingCode(code),
}));

export function callingCodeFor(country: CountryCode): string {
  return getCountryCallingCode(country);
}

export interface PhoneValidation {
  valid: boolean;
  /** E.164 form (e.g. "+27821234567") when valid, else null. */
  e164: string | null;
}

/**
 * Validate a national number entered for a given country. Returns the E.164
 * form when the number is a plausible, valid mobile/number for that country.
 * Empty input is invalid (the field is required).
 */
export function validateMobile(
  nationalNumber: string,
  country: CountryCode,
): PhoneValidation {
  const trimmed = nationalNumber.trim();
  if (!trimmed) return { valid: false, e164: null };
  const parsed = parsePhoneNumberFromString(trimmed, country);
  if (!parsed || !parsed.isValid()) return { valid: false, e164: null };
  return { valid: true, e164: parsed.number };
}
