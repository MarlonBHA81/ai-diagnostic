/**
 * Minimal ambient declarations for the PDF function's runtime-only deps, so the
 * project typechecks without installing them in this environment. Vercel
 * installs the real `puppeteer-core` and `@sparticuz/chromium` (which ship their
 * own full types) at deploy time.
 */
declare module 'puppeteer-core' {
  export interface Page {
    goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
    waitForSelector(selector: string, opts?: { timeout?: number }): Promise<unknown>;
    pdf(opts?: Record<string, unknown>): Promise<Uint8Array>;
  }
  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }
  const puppeteer: { launch(opts: Record<string, unknown>): Promise<Browser> };
  export default puppeteer;
}

declare module '@sparticuz/chromium' {
  const chromium: {
    args: string[];
    defaultViewport: { width: number; height: number } | null;
    headless: boolean | 'shell';
    executablePath(input?: string): Promise<string>;
  };
  export default chromium;
}
