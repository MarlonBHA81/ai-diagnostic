import { useMemo } from 'react';
import { useQuiz } from '../state/QuizContext';
import { computeQuickResults } from '../results/buildResult';

/** Banded weekly hours for the winning zone: label → hours used for costing. */
const BAND_HOURS = [3, 10, 20];

/**
 * Quick Mode: the single hours-band question, asked once for the zone that
 * came out as the constraint. Its answer drives the monthly-cost estimate on
 * the results screen. Shown after all seven zones are tapped.
 */
export function QuickHours() {
  const { config, state, setQuickHours, go } = useQuiz();
  const quick = config.quick!;

  // Provisional constraint from the taps so far, just to name the zone here.
  const constraintName = useMemo(
    () =>
      computeQuickResults(config, state.quick, null, state.baseline.chargeOutRate)
        .constraint.name,
    [config, state.quick, state.baseline.chargeOutRate],
  );

  const prompt = quick.hoursPrompt.replace(/\{zone\}/g, constraintName);

  function choose(hours: number) {
    setQuickHours(hours);
    go('details');
  }

  return (
    <div className="card">
      <p className="eyebrow">One last thing</p>
      <h1 className="headline" style={{ fontSize: 'var(--sa-text-2xl)' }}>
        {prompt}
      </h1>
      <p className="lede">
        A rough band is fine. We use it to estimate what this constraint is
        costing you each month.
      </p>

      <div className="tap-col" role="radiogroup" aria-label={prompt}>
        {quick.hoursBands.map((label, i) => {
          const sel = state.quickHours === BAND_HOURS[i];
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={sel}
              className={'tap tap--block' + (sel ? ' tap--sel' : '')}
              onClick={() => choose(BAND_HOURS[i])}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="nav">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => go(config.zones.length - 1)}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
