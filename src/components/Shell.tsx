import type { ReactNode } from 'react';
import { Masthead } from './Masthead';
import { appConfig } from '../config/app';

/** App frame: masthead + centered main + footer. Shared by the quiz and the
 *  standalone shared-results page. */
export function Shell({ stepLabel, children }: { stepLabel: string; children: ReactNode }) {
  return (
    <div className="app-shell">
      <Masthead stepLabel={stepLabel} />
      <main className="main">{children}</main>
      <footer className="footer no-print">
        {appConfig.footerLine} ·{' '}
        <a href={appConfig.privacyPolicyUrl} target="_blank" rel="noreferrer">
          Privacy
        </a>
      </footer>
    </div>
  );
}
