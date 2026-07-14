import { useQuiz } from './state/QuizContext';
import { Masthead } from './components/Masthead';
import { ProgressRail } from './components/ProgressRail';
import { WelcomeDetails } from './screens/WelcomeDetails';
import { appConfig } from './config/app';

export function App() {
  const { config, state } = useQuiz();
  const step = state.step;
  const zoneCount = config.zones.length;

  const inZone = typeof step === 'number';
  const stepLabel =
    step === 'welcome'
      ? ''
      : step === 'baseline'
        ? 'FIRM BASELINE'
        : step === 'results'
          ? 'RESULTS'
          : `ZONE ${(step as number) + 1} / ${zoneCount}`;

  return (
    <div className="app-shell">
      <Masthead stepLabel={stepLabel} />
      <main className="main">
        <ProgressRail
          zoneCount={zoneCount}
          currentZone={inZone ? (step as number) : null}
          allDone={step === 'results'}
        />
        {step === 'welcome' && <WelcomeDetails />}
        {step === 'baseline' && <Stub title="Firm Baseline" />}
        {inZone && <Stub title={config.zones[step as number].name} />}
        {step === 'results' && <Stub title="Results" />}
      </main>
      <footer className="footer">
        {appConfig.footerLine} ·{' '}
        <a href={appConfig.privacyPolicyUrl} target="_blank" rel="noreferrer">
          Privacy
        </a>
      </footer>
    </div>
  );
}

/** Temporary placeholder for screens not yet built (baseline, zones, results). */
function Stub({ title }: { title: string }) {
  return (
    <div className="card">
      <p className="eyebrow">Coming next</p>
      <h2>{title}</h2>
      <p className="lede">This screen is under construction.</p>
    </div>
  );
}
