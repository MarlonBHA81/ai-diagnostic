import { useQuiz } from '../state/QuizContext';
import { renderAccented } from '../lib/text';
import { track } from '../lib/analytics';

/**
 * Intro screen. No details are collected here, we capture those at the end,
 * once the diagnostic is done, framed as "where shall we send your report?".
 * Clicking start stamps the quiz start time (used for the anti-spam window).
 */
export function Welcome() {
  const { config, start, go } = useQuiz();

  function begin() {
    start(Date.now());
    track('diagnostic_started');
    go('baseline');
  }

  return (
    <div className="card">
      <p className="eyebrow">The 7-Zone Diagnostic · {config.displayName} Edition</p>
      <h1 className="headline">{renderAccented(config.welcome.headline)}</h1>
      <p className="lede">{config.welcome.subhead}</p>

      <ul className="welcome-points">
        <li>Score all seven zones across five dimensions.</li>
        <li>See the one binding constraint to fix first.</li>
        <li>Get your full report, with a monthly cost estimate.</li>
      </ul>

      <button className="btn btn--primary" type="button" onClick={begin}>
        Start the diagnostic →
      </button>

      <p className="consent">
        No details needed to start. We'll ask where to send your report once
        you're done. Roughly 10 to 15 minutes.
      </p>
    </div>
  );
}
