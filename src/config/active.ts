/**
 * The active vertical for this deployment. Switching editions is a one-line
 * change here (imported by both the app entry and the /api/lead function so the
 * on-screen results and the report email always use the same copy).
 *
 * Available verticals:
 *   - genericConfig     (Generic Business Edition, the base prototype)
 *   - accountingConfig  (Accounting Firm Edition)
 */
export { genericConfig as activeConfig } from './industries/generic';

/**
 * Which questionnaire this deployment serves:
 *   - 'full'  the original 7-zone × 5-dimension diagnostic
 *   - 'quick' the fast 3-tap-per-zone version (Yes / Somewhat / No / Not sure)
 *
 * Both share the same results, PDF, email and webhook. Switching is a one-line
 * change here; the chosen vertical must provide a `quick` block when 'quick'.
 */
export const activeMode: 'full' | 'quick' = 'quick';
