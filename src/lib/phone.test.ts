import { describe, it, expect } from 'vitest';
import { validateMobile, callingCodeFor, DEFAULT_COUNTRY, COUNTRIES } from './phone';

describe('phone — defaults and country list', () => {
  it('defaults to ZA (+27) and lists ZA first', () => {
    expect(DEFAULT_COUNTRY).toBe('ZA');
    expect(callingCodeFor('ZA')).toBe('27');
    expect(COUNTRIES[0].code).toBe('ZA');
  });
});

describe('validateMobile — ZA (+27) formats', () => {
  it('accepts a national ZA mobile with leading 0', () => {
    const r = validateMobile('082 123 4567', 'ZA');
    expect(r.valid).toBe(true);
    expect(r.e164).toBe('+27821234567');
  });
  it('accepts ZA mobile without spaces', () => {
    expect(validateMobile('0721234567', 'ZA').e164).toBe('+27721234567');
  });
  it('accepts ZA number already in +27 form', () => {
    expect(validateMobile('+27 82 123 4567', 'ZA').e164).toBe('+27821234567');
  });
  it('rejects an implausible ZA number', () => {
    expect(validateMobile('12345', 'ZA').valid).toBe(false);
  });
  it('rejects empty input', () => {
    expect(validateMobile('', 'ZA')).toEqual({ valid: false, e164: null });
  });
});

describe('validateMobile — other countries', () => {
  it('validates a US number', () => {
    const r = validateMobile('(202) 555-0182', 'US');
    expect(r.valid).toBe(true);
    expect(r.e164).toBe('+12025550182');
  });
  it('validates a GB mobile', () => {
    expect(validateMobile('07400 123456', 'GB').e164).toBe('+447400123456');
  });
  it('rejects a too-short GB number', () => {
    expect(validateMobile('123', 'GB').valid).toBe(false);
  });
});
