import { useQuiz } from '../state/QuizContext';
import { activeMode } from '../config/active';
import { renderAccented } from '../lib/text';
import { track } from '../lib/analytics';

/**
 * Intro screen. No details are collected here, we capture those at the end,
 * once the diagnostic is done, framed as "where shall we send your report?".
 * Clicking start stamps the quiz start time (used for the anti-spam window).
 */
export function Welcome() {
  const { config, start, go } = useQuiz();
  const quick = activeMode === 'quick';

  function begin() {
    start(Date.now());
    track('diagnostic_started');
    go('baseline');
  }

  return (
    <div className="card">
      <p className="eyebrow">The 7-Zone Diagnostic · {config.displayName} Edition</p>
      <h1 className="headline">{renderAccented(config.welcome.headline)}</h1>
      <p className="lede">
        {quick
          ? 'Seven zones of your business, three quick taps each. The math points at your binding constraint: the one bottleneck limiting the whole system. Answer for what is actually happening today.'
          : config.welcome.subhead}
      </p>

      <ul className="welcome-points">
        {quick ? (
          <>
            <li>Seven zones, three quick questions each.</li>
            <li>See the one binding constraint to fix first.</li>
            <li>Get your full report, with a monthly cost estimate.</li>
          </>
        ) : (
          <>
            <li>Score all seven zones across five dimensions.</li>
            <li>See the one binding constraint to fix first.</li>
            <li>Get your full report, with a monthly cost estimate.</li>
          </>
        )}
      </ul>

      <button className="btn btn--primary" type="button" onClick={begin}>
        Start the diagnostic →
      </button>

      <p className="consent">
        {quick
          ? "No details needed to start. We'll ask where to send your report once you're done. About 3 minutes."
          : "No details needed to start. We'll ask where to send your report once you're done. Roughly 10 to 15 minutes."}
      </p>
    </div>
  );
}
