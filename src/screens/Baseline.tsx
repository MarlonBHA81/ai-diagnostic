import { useQuiz } from '../state/QuizContext';
import {
  CURRENCY_ORDER,
  CURRENCIES,
  currencySymbol,
} from '../currency/currency';
import { parseNum } from '../lib/num';

/** Screen 2 — Firm Baseline, with the multi-currency selector that drives every
 *  later money display and the webhook payload. Changing currency reformats; it
 *  does not convert values. */
export function Baseline() {
  const { config, state, setBaseline, go } = useQuiz();
  const { baseline } = state;
  const sym = currencySymbol(baseline.currency);

  return (
    <div className="card">
      <p className="eyebrow">Baseline</p>
      <h1 className="headline" style={{ fontSize: 'var(--sa-text-2xl)' }}>
        A few quick numbers
      </h1>
      <p className="lede">
        These calibrate your results and let us price your constraint. Rough
        figures are fine.
      </p>

      {/* Currency selector */}
      <div className="field">
        <span className="field__label">Currency</span>
        <div
          className="currency-seg"
          role="radiogroup"
          aria-label="Currency"
        >
          {CURRENCY_ORDER.map((code) => {
            const c = CURRENCIES[code];
            const sel = baseline.currency === code;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={sel}
                className={'currency-seg__opt' + (sel ? ' currency-seg__opt--sel' : '')}
                onClick={() => setBaseline({ currency: code })}
              >
                <span className="currency-seg__sym">{c.symbol}</span>
                <span className="currency-seg__code">{c.code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly fee revenue */}
      <div className="field">
        <label className="field__label" htmlFor="b-rev">
          {config.baseline.revenueLabel}
        </label>
        <div className="num-prefixed">
          <span className="num-prefixed__sym">{sym}</span>
          <input
            className="input"
            id="b-rev"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="120000"
            value={baseline.monthlyRevenue ?? ''}
            onChange={(e) => setBaseline({ monthlyRevenue: parseNum(e.target.value) })}
          />
        </div>
      </div>

      {/* Team size */}
      <div className="field">
        <label className="field__label" htmlFor="b-team">
          {config.baseline.teamSizeLabel}
        </label>
        <input
          className="input num-input"
          id="b-team"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="8"
          value={baseline.teamSize ?? ''}
          onChange={(e) => setBaseline({ teamSize: parseNum(e.target.value) })}
        />
      </div>

      {/* Charge-out rate (optional) */}
      <div className="field">
        <label className="field__label" htmlFor="b-rate">
          {config.baseline.chargeOutRateLabel}{' '}
          <span className="qblock__opt">(optional)</span>
        </label>
        <div className="num-prefixed">
          <span className="num-prefixed__sym">{sym}</span>
          <input
            className="input"
            id="b-rate"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="150"
            value={baseline.chargeOutRate ?? ''}
            onChange={(e) => setBaseline({ chargeOutRate: parseNum(e.target.value) })}
          />
        </div>
        <p className="hint" style={{ marginTop: 'var(--sa-space-2)' }}>
          {config.baseline.chargeOutRateNote}
        </p>
      </div>

      {config.baseline.busySeasonNote && (
        <p className="think" style={{ marginBottom: 0 }}>
          {config.baseline.busySeasonNote}
        </p>
      )}

      <div className="nav">
        <button className="btn btn--ghost" type="button" onClick={() => go('welcome')}>
          ← Back
        </button>
        <button className="btn btn--primary" type="button" onClick={() => go(0)}>
          Start zone 1 →
        </button>
      </div>
    </div>
  );
}
