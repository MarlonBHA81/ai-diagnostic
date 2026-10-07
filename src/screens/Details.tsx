import { useRef, useState } from 'react';
import type { CountryCode } from 'libphonenumber-js/min';
import { useQuiz } from '../state/QuizContext';
import { appConfig } from '../config/app';
import { COUNTRIES, DEFAULT_COUNTRY, callingCodeFor, validateMobile } from '../lib/phone';
import { validateLead, type LeadErrors } from '../lib/validation';
import { track } from '../lib/analytics';
import type { LeadDetails } from '../state/types';

interface FormState {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  mobileCountry: CountryCode;
  mobileNational: string;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  businessName: '',
  email: '',
  mobileCountry: DEFAULT_COUNTRY,
  mobileNational: '',
};

/**
 * Details capture, shown after the diagnostic is complete and before the
 * results. Framed as "where shall we send your report?". On submit it stores
 * the lead and advances to the results, which fire the single
 * diagnostic_completed event (carrying these details). No lead event fires
 * before the quiz is finished.
 */
export function Details() {
  const { state, go, setLead } = useQuiz();
  const [form, setForm] = useState<FormState>(() => {
    if (state.lead) {
      return {
        firstName: state.lead.firstName,
        lastName: state.lead.lastName,
        businessName: state.lead.businessName,
        email: state.lead.email,
        mobileCountry: state.lead.mobileCountry,
        mobileNational: state.lead.mobileNational,
      };
    }
    return EMPTY;
  });
  const [errors, setErrors] = useState<LeadErrors>({});
  const honeypotRef = useRef<HTMLInputElement>(null);
  const firstInvalidRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof LeadErrors]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const mobile = validateMobile(form.mobileNational, form.mobileCountry);
    const nextErrors = validateLead({
      firstName: form.firstName,
      lastName: form.lastName,
      businessName: form.businessName,
      email: form.email,
      mobile: mobile.e164 ?? '',
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('.field .input--invalid');
        el?.closest('.field')?.classList.remove('shake');
        void el?.offsetWidth; // reflow to restart animation
        el?.closest('.field')?.classList.add('shake');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
      });
      return;
    }

    const lead: LeadDetails = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      businessName: form.businessName.trim(),
      email: form.email.trim(),
      mobileCountry: form.mobileCountry,
      mobileNational: form.mobileNational.trim(),
      mobileE164: mobile.e164 as string,
    };

    setLead(lead, honeypotRef.current?.value ?? '');
    track('lead_submitted');
    go('results');
  }

  const errId = (k: keyof LeadErrors) => (errors[k] ? `err-${k}` : undefined);

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <p className="eyebrow">Diagnostic complete</p>
      <h1 className="headline">Where shall we send your report?</h1>
      <p className="lede">
        Your 7-zone breakdown is ready. Tell us where to send it and we'll email
        your full report, with the one constraint to fix first.
      </p>

      <div className="grid-2">
        <Field
          label="First name"
          id="firstName"
          value={form.firstName}
          onChange={(v) => set('firstName', v)}
          error={errors.firstName}
          errId={errId('firstName')}
          autoComplete="given-name"
          firstInvalidRef={firstInvalidRef}
        />
        <Field
          label="Last name"
          id="lastName"
          value={form.lastName}
          onChange={(v) => set('lastName', v)}
          error={errors.lastName}
          errId={errId('lastName')}
          autoComplete="family-name"
        />
      </div>

      <Field
        label="Business name"
        id="businessName"
        value={form.businessName}
        onChange={(v) => set('businessName', v)}
        error={errors.businessName}
        errId={errId('businessName')}
        autoComplete="organization"
      />

      <Field
        label="Email"
        id="email"
        type="email"
        inputMode="email"
        value={form.email}
        onChange={(v) => set('email', v)}
        error={errors.email}
        errId={errId('email')}
        autoComplete="email"
        placeholder="you@company.com"
      />

      {/* Mobile: country selector + national number */}
      <div className="field">
        <label className="field__label" htmlFor="mobileNational">
          Mobile number<span className="field__req" aria-hidden="true">*</span>
        </label>
        <div className="phone">
          <select
            className="select"
            aria-label="Country code"
            value={form.mobileCountry}
            onChange={(e) => set('mobileCountry', e.target.value as CountryCode)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} +{c.callingCode}
              </option>
            ))}
          </select>
          <input
            className={'input' + (errors.mobile ? ' input--invalid' : '')}
            id="mobileNational"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="82 123 4567"
            value={form.mobileNational}
            aria-invalid={!!errors.mobile}
            aria-describedby={errId('mobile')}
            onChange={(e) => set('mobileNational', e.target.value)}
          />
        </div>
        <p className="hint" style={{ marginTop: 'var(--sa-space-2)' }}>
          We'll dial +{callingCodeFor(form.mobileCountry)}. International format.
          Pick your country on the left.
        </p>
        <div className="field__error" id={errId('mobile')} aria-live="polite">
          {errors.mobile ?? ''}
        </div>
      </div>

      {/* Honeypot, hidden from real users; bots that fill it are rejected server-side. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="company_website">Company website</label>
        <input
          ref={honeypotRef}
          id="company_website"
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button className="btn btn--primary" type="submit">
        Show my report →
      </button>

      <p className="consent">
        You'll get your diagnostic report by email, plus a 90-day re-test
        reminder. No spam. See our{' '}
        <a href={appConfig.privacyPolicyUrl} target="_blank" rel="noreferrer">
          privacy policy
        </a>
        . By continuing you consent to us contacting you about your results
        (POPIA / GDPR compliant).
      </p>
    </form>
  );
}

function Field(props: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  errId?: string;
  type?: string;
  inputMode?: 'email' | 'tel' | 'text';
  autoComplete?: string;
  placeholder?: string;
  firstInvalidRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={props.id}>
        {props.label}
        <span className="field__req" aria-hidden="true">*</span>
      </label>
      <input
        className={'input' + (props.error ? ' input--invalid' : '')}
        id={props.id}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={props.value}
        aria-invalid={!!props.error}
        aria-describedby={props.errId}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <div className="field__error" id={props.errId} aria-live="polite">
        {props.error ?? ''}
      </div>
    </div>
  );
}
