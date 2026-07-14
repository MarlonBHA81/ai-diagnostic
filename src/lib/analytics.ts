/**
 * dataLayer analytics — no-op when no dataLayer is present (e.g. standalone).
 * Events: diagnostic_started, lead_submitted, zone_completed, results_viewed.
 */
type DataLayerEvent = Record<string, unknown> & { event: string };

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

export function track(event: string, payload: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...payload });
  }
}
