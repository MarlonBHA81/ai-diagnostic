import { useEffect } from 'react';
import { useQuiz } from './state/QuizContext';
import { activeMode } from './config/active';
import { Shell } from './components/Shell';
import { ProgressRail } from './components/ProgressRail';
import { Welcome } from './screens/Welcome';
import { Details } from './screens/Details';
import { Baseline } from './screens/Baseline';
import { ZoneScreen } from './screens/ZoneScreen';
import { QuickZone } from './screens/QuickZone';
import { QuickHours } from './screens/QuickHours';
import { Results } from './screens/Results';
import { useEmbedHeight } from './lib/embed';

export function App() {
  const { config, state } = useQuiz();
  const step = state.step;
  const zoneCount = config.zones.length;
  const inZone = typeof step === 'number';
  const quick = activeMode === 'quick';
  const pastZones = step === 'quickHours' || step === 'details' || step === 'results';

  useEmbedHeight();

  // Scroll to top on step change (and notify embedder via height hook).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const stepLabel =
    step === 'welcome'
      ? ''
      : step === 'baseline'
        ? 'BASELINE'
        : step === 'quickHours'
          ? 'YOUR TIME'
          : step === 'details'
            ? 'YOUR REPORT'
            : step === 'results'
              ? 'RESULTS'
              : `ZONE ${(step as number) + 1} / ${zoneCount}`;

  return (
    <Shell stepLabel={stepLabel}>
      <ProgressRail
        zoneCount={zoneCount}
        currentZone={inZone ? (step as number) : null}
        allDone={pastZones}
      />
      {step === 'welcome' && <Welcome />}
      {step === 'baseline' && <Baseline />}
      {inZone && (quick ? <QuickZone index={step as number} /> : <ZoneScreen index={step as number} />)}
      {step === 'quickHours' && <QuickHours />}
      {step === 'details' && <Details />}
      {step === 'results' && <Results />}
    </Shell>
  );
}
