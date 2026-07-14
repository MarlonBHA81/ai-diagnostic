import { useEffect } from 'react';
import { useQuiz } from './state/QuizContext';
import { Shell } from './components/Shell';
import { ProgressRail } from './components/ProgressRail';
import { WelcomeDetails } from './screens/WelcomeDetails';
import { Baseline } from './screens/Baseline';
import { ZoneScreen } from './screens/ZoneScreen';
import { Results } from './screens/Results';
import { useEmbedHeight } from './lib/embed';

export function App() {
  const { config, state } = useQuiz();
  const step = state.step;
  const zoneCount = config.zones.length;
  const inZone = typeof step === 'number';

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
        : step === 'results'
          ? 'RESULTS'
          : `ZONE ${(step as number) + 1} / ${zoneCount}`;

  return (
    <Shell stepLabel={stepLabel}>
      <ProgressRail
        zoneCount={zoneCount}
        currentZone={inZone ? (step as number) : null}
        allDone={step === 'results'}
      />
      {step === 'welcome' && <WelcomeDetails />}
      {step === 'baseline' && <Baseline />}
      {inZone && <ZoneScreen index={step as number} />}
      {step === 'results' && <Results />}
    </Shell>
  );
}
