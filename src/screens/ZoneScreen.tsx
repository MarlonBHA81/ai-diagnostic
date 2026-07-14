import { useState } from 'react';
import { useQuiz } from '../state/QuizContext';
import { parseNum } from '../lib/num';
import { track } from '../lib/analytics';
import type { AiUsageLevel, MarginImpactLevel } from '../scoring/types';

type ScoredKey = 'hours' | 'rep' | 'ai' | 'margin' | 'own';

export function ZoneScreen({ index }: { index: number }) {
  const { config, state, setAnswer, go } = useQuiz();
  const zone = config.zones[index];
  const dims = config.dimensions;
  const a = state.answers[zone.id];
  const isLast = index === config.zones.length - 1;
  const [missing, setMissing] = useState<Set<ScoredKey>>(new Set());

  function clearMissing(key: ScoredKey) {
    if (missing.has(key)) {
      const next = new Set(missing);
      next.delete(key);
      setMissing(next);
    }
  }

  function handleNext() {
    const gaps = new Set<ScoredKey>();
    if (a.hours === null || a.hours < 0) gaps.add('hours');
    if (!a.rep) gaps.add('rep');
    if (!a.ai) gaps.add('ai');
    if (!a.margin) gaps.add('margin');
    if (!a.own) gaps.add('own');

    if (gaps.size > 0) {
      setMissing(gaps);
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('.qblock--unanswered');
        if (first) {
          first.classList.remove('shake');
          void first.offsetWidth; // reflow to restart animation
          first.classList.add('shake');
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return;
    }

    track('zone_completed', { zone: zone.id });
    if (isLast) go('results');
    else go(index + 1);
  }

  const cls = (key: ScoredKey) =>
    'qblock' + (missing.has(key) ? ' qblock--unanswered shake' : '');

  return (
    <div className="card">
      <p className="zone-eyebrow">
        Zone {index + 1} of {config.zones.length}
      </p>
      <h1 className="zone-title">{zone.name}</h1>
      <p className="zone-desc">{zone.description}</p>
      <p className="think">{zone.thinkExample}</p>

      {/* 1 — Hours */}
      <div className={cls('hours')} data-q="hours">
        <div className="qblock__label">{dims.hoursLabel}</div>
        <div className="qblock__hint">{dims.hoursHint}</div>
        <div className="num-wrap">
          <input
            className="input num-input"
            type="number"
            min={0}
            max={500}
            step={0.5}
            inputMode="decimal"
            placeholder="0"
            value={a.hours ?? ''}
            onChange={(e) => {
              setAnswer(zone.id, { hours: parseNum(e.target.value) });
              if (parseNum(e.target.value) !== null) clearMissing('hours');
            }}
          />
          <span className="unit">hours / week</span>
        </div>
      </div>

      {/* 2 — Repetitiveness */}
      <div className={cls('rep')} data-q="rep">
        <div className="qblock__label">{dims.repetitivenessLabel}</div>
        <div className="qblock__hint">{dims.repetitivenessHint}</div>
        <ScaleSeg
          name={`${zone.id}-rep`}
          caps={dims.repetitivenessCaps}
          value={a.rep}
          onSelect={(v) => {
            setAnswer(zone.id, { rep: v });
            clearMissing('rep');
          }}
        />
      </div>

      {/* 3 — AI usage */}
      <div className={cls('ai')} data-q="ai">
        <div className="qblock__label">{dims.aiUsageLabel}</div>
        <div className="qblock__hint">{dims.aiUsageHint}</div>
        <div className="opt-col" role="radiogroup" aria-label={dims.aiUsageLabel}>
          {dims.aiUsageOptions.map((o) => (
            <OptButton
              key={o.value}
              selected={a.ai === o.value}
              label={o.label}
              sub={o.description}
              onClick={() => {
                setAnswer(zone.id, { ai: o.value as AiUsageLevel });
                clearMissing('ai');
              }}
            />
          ))}
        </div>
      </div>

      {/* 4 — Margin impact */}
      <div className={cls('margin')} data-q="margin">
        <div className="qblock__label">{dims.marginImpactLabel}</div>
        <div className="qblock__hint">{dims.marginImpactHint}</div>
        <div className="opt-col" role="radiogroup" aria-label={dims.marginImpactLabel}>
          {dims.marginImpactOptions.map((o) => (
            <OptButton
              key={o.value}
              selected={a.margin === o.value}
              label={o.label}
              sub={o.description}
              onClick={() => {
                setAnswer(zone.id, { margin: o.value as MarginImpactLevel });
                clearMissing('margin');
              }}
            />
          ))}
        </div>
      </div>

      {/* 5 — Partner involvement */}
      <div className={cls('own')} data-q="own">
        <div className="qblock__label">{dims.partnerInvolvementLabel}</div>
        <div className="qblock__hint">{dims.partnerInvolvementHint}</div>
        <ScaleSeg
          name={`${zone.id}-own`}
          caps={dims.partnerInvolvementCaps}
          value={a.own}
          onSelect={(v) => {
            setAnswer(zone.id, { own: v });
            clearMissing('own');
          }}
        />
      </div>

      {/* Free-text (optional) */}
      {zone.freeText.map((q) => (
        <div className="qblock" key={q.key}>
          <div className="qblock__label">
            {q.label} <span className="qblock__opt">(optional)</span>
          </div>
          <textarea
            className="textarea"
            placeholder={q.placeholder}
            value={q.key === 'bottleneck' ? a.bottleneck : a.desiredFix}
            onChange={(e) =>
              setAnswer(zone.id, { [q.key]: e.target.value } as never)
            }
          />
        </div>
      ))}

      <div className="nav">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => go(index === 0 ? 'baseline' : index - 1)}
        >
          ← Back
        </button>
        <button className="btn btn--primary" type="button" onClick={handleNext}>
          {isLast ? 'See my results →' : 'Next zone →'}
        </button>
      </div>
    </div>
  );
}

function ScaleSeg({
  name,
  caps,
  value,
  onSelect,
}: {
  name: string;
  caps: readonly string[];
  value: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={name}>
      {[1, 2, 3, 4, 5].map((v) => {
        const sel = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={sel}
            className={'seg__opt' + (sel ? ' seg__opt--sel' : '')}
            onClick={() => onSelect(v)}
          >
            {v}
            {caps[v - 1] ? <span className="seg__cap">{caps[v - 1]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function OptButton({
  selected,
  label,
  sub,
  onClick,
}: {
  selected: boolean;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={'opt-col__opt' + (selected ? ' opt-col__opt--sel' : '')}
      onClick={onClick}
    >
      <b>{label}</b>
      {sub ? <span className="sub">{sub}</span> : null}
    </button>
  );
}
