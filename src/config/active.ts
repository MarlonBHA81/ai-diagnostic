/**
 * The active vertical for this deployment. Switching editions is a one-line
 * change here (imported by both the app entry and the /api/lead function so the
 * on-screen results and the report email always use the same copy).
 *
 * Available verticals:
 *   - genericConfig     (Generic Business Edition — the base prototype)
 *   - accountingConfig  (Accounting Firm Edition)
 */
export { genericConfig as activeConfig } from './industries/generic';
