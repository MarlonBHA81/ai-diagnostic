import { useState } from 'react';
import { useQuiz } from '../state/QuizContext';
import { track } from '../lib/analytics';
import type { TapValue } from '../state/types';

type QKey = 'repetitive' | 'time' | 'aiUsage';

const TAPS: { value: TapValue; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'somewhat', label: 'Somewhat' },
  { value: 'no', label: 'No' },
  { value: 'notsure', label: 'Not sure' },
];

/**
 * Quick Mode zone screen: three taps on the Yes / Somewhat / No / Not sure
 * scale. Fast, low-friction alternative to the full 5-dimension ZoneScreen.
 * The last zone advances to the single hours-band question (quickHours).
 */
export function QuickZone({ index }: { index: number }) {
  const { config, state, setQuick, go } = useQuiz();
  const zone = config.zones[index];
  const quick = config.quick!;
  const a = state.quick[zone.id];
  const isLast = index === config.zones.length - 1;
  const [missing, setMissing] = useState<Set<QKey>>(new Set());

  const zoneName = zone.name.toLowerCase();
  const ask = (q: string) => q.replace(/\{zone\}/g, zoneName);

  function clearMissing(key: QKey) {
    if (missing.has(key)) {
      const next = new Set(missing);
      next.delete(key);
      setMissing(next);
    }
  }

  function handleNext() {
    const gaps = new Set<QKey>();
    if (!a.repetitive) gaps.add('repetitive');
    if (!a.time) gaps.add('time');
    if (!a.aiUsage) gaps.add('aiUsage');

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
    if (isLast) go('quickHours');
    else go(index + 1);
  }

  const cls = (key: QKey) =>
    'qblock' + (missing.has(key) ? ' qblock--unanswered shake' : '');

  const questions: { key: QKey; text: string }[] = [
    { key: 'repetitive', text: ask(quick.questions.repetitive) },
    { key: 'time', text: ask(quick.questions.time) },
    { key: 'aiUsage', text: ask(quick.questions.aiUsage) },
  ];

  return (
    <div className="card">
      <p className="zone-eyebrow">
        Zone {index + 1} of {config.zones.length}
      </p>
      <h1 className="zone-title">{zone.name}</h1>
      <p className="zone-desc">{zone.description}</p>
      <p className="think">{quick.instruction}</p>

      {questions.map((q) => (
        <div className={cls(q.key)} data-q={q.key} key={q.key}>
          <div className="qblock__label">{q.text}</div>
          <div className="tap-row" role="radiogroup" aria-label={q.text}>
            {TAPS.map((t) => {
              const sel = a[q.key] === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  className={'tap' + (sel ? ' tap--sel' : '')}
                  onClick={() => {
                    setQuick(zone.id, { [q.key]: t.value });
                    clearMissing(q.key);
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
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
          {isLast ? 'Almost done →' : 'Next zone →'}
        </button>
      </div>
    </div>
  );
}
