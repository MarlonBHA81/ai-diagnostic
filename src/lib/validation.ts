/**
 * Shared validation used on the client and mirrored on the server.
 * Keep this dependency-light so it can run in both a browser and a
 * serverless runtime.
 */

/**
 * Pragmatic email check: one @, a dotted domain, no spaces. Deliberately not a
 * full RFC 5322 parser — that rejects almost nothing and accepts garbage. The
 * server re-runs this exact function so the client can't bypass it.
 */
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 3 || v.length > 254) return false;
  // No whitespace, exactly one @, non-empty local part, dotted domain.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isNonEmpty(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

export interface LeadInput {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  mobile: string; // expected E.164
}

export type LeadErrors = Partial<Record<keyof LeadInput, string>>;

/** Validate the five required lead fields. Mobile is expected pre-normalised to E.164. */
export function validateLead(lead: LeadInput): LeadErrors {
  const errors: LeadErrors = {};
  if (!isNonEmpty(lead.firstName)) errors.firstName = 'Please enter your first name.';
  if (!isNonEmpty(lead.lastName)) errors.lastName = 'Please enter your last name.';
  if (!isNonEmpty(lead.businessName)) errors.businessName = 'Please enter your business name.';
  if (!isValidEmail(lead.email)) errors.email = 'Please enter a valid email address.';
  // E.164: leading + then 8–15 digits.
  if (!/^\+[1-9]\d{7,14}$/.test(lead.mobile)) {
    errors.mobile = 'Please enter a valid mobile number.';
  }
  return errors;
}

export function hasErrors(errors: LeadErrors): boolean {
  return Object.keys(errors).length > 0;
}
