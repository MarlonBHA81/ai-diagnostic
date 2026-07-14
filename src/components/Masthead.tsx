import { Logo } from './Logo';

/** Masthead: SA logo top-left, step indicator top-right (ZONE n / 7 → RESULTS). */
export function Masthead({ stepLabel }: { stepLabel: string }) {
  return (
    <header className="masthead">
      <Logo />
      <div className="masthead__step" aria-live="polite">
        {stepLabel}
      </div>
    </header>
  );
}
