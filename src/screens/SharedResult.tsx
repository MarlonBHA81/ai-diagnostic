import { useEffect, useMemo, useState } from 'react';
import { Shell } from '../components/Shell';
import { ProgressRail } from '../components/ProgressRail';
import { ResultsView } from './ResultsView';
import { activeConfig } from '../config/active';
import { computeResults, stateFromCompletedEvent } from '../results/buildResult';
import type { DiagnosticCompletedEvent } from '../lib/events';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; event: DiagnosticCompletedEvent };

/** Standalone page for a shared/emailed results link: /r/:id. Fetches the
 *  stored diagnostic from /api/result and renders it read-only. */
export function SharedResult({ id }: { id: string }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/result?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { result: DiagnosticCompletedEvent }) => {
        if (!alive) return;
        setLoad({ status: 'ready', event: data.result });
        requestAnimationFrame(() => setAnimate(true));
      })
      .catch(() => alive && setLoad({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [id]);

  const config = activeConfig;
  const model = useMemo(() => {
    if (load.status !== 'ready') return null;
    return computeResults(config, stateFromCompletedEvent(load.event, config));
  }, [load, config]);

  return (
    <Shell stepLabel="RESULTS">
      <ProgressRail zoneCount={config.zones.length} currentZone={null} allDone />
      {load.status === 'loading' && (
        <div className="card">
          <p className="lede">Loading your results…</p>
        </div>
      )}
      {load.status === 'error' && (
        <div className="card">
          <h2>Results not found</h2>
          <p className="lede">
            This results link is invalid or has expired. You can{' '}
            <a href="/">take the diagnostic again</a>.
          </p>
        </div>
      )}
      {load.status === 'ready' && model && (
        <ResultsView
          config={config}
          model={model}
          currency={load.event.baseline.currency}
          chargeOutRate={load.event.baseline.chargeOutRate}
          firstName={load.event.lead.firstName}
          businessName={load.event.lead.businessName}
          animate={animate}
        />
      )}
    </Shell>
  );
}
