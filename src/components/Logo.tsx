/**
 * Story Advantage logo (masthead slot).
 *
 * Inline SVG rendition of the SA brain-lightbulb mark in brand colours
 * (navy #222056 + yellow #e3e425) plus the wordmark. This is a lightweight,
 * self-contained placeholder for the official logo asset — drop the real
 * {{LOGO_URL_OR_FILE}} in here (an <img>) when supplied; nothing else changes.
 */
export function Logo() {
  return (
    <div className="masthead__logo" aria-label="Story Advantage">
      <svg
        className="masthead__logo-mark"
        viewBox="0 0 48 48"
        role="img"
        aria-hidden="true"
        width="34"
        height="34"
      >
        {/* bulb glow rays */}
        <g stroke="var(--sa-yellow)" strokeWidth="2.4" strokeLinecap="round">
          <line x1="24" y1="3" x2="24" y2="8" />
          <line x1="9" y1="9" x2="12.5" y2="12.5" />
          <line x1="39" y1="9" x2="35.5" y2="12.5" />
          <line x1="4" y1="24" x2="9" y2="24" />
          <line x1="44" y1="24" x2="39" y2="24" />
        </g>
        {/* bulb outline */}
        <circle cx="24" cy="24" r="12.5" fill="none" stroke="var(--sa-yellow)" strokeWidth="2.6" />
        {/* right brain hemisphere in navy */}
        <path
          d="M24 15c3.6 0 6.4 2 6.4 5.2 0 1-.4 1.8-1 2.5.8.7 1.2 1.6 1.2 2.7 0 2.9-2.7 5-6.6 5V15z"
          fill="var(--sa-navy)"
        />
        {/* left hemisphere hint in yellow */}
        <path
          d="M24 15c-3.6 0-6.4 2-6.4 5.2 0 1 .4 1.8 1 2.5-.8.7-1.2 1.6-1.2 2.7 0 2.9 2.7 5 6.6 5V15z"
          fill="none"
          stroke="var(--sa-yellow)"
          strokeWidth="1.6"
        />
        {/* bulb base */}
        <rect x="20.5" y="37" width="7" height="3" rx="1.2" fill="var(--sa-navy)" />
      </svg>
      <span className="masthead__wordmark">
        STORY<span className="masthead__wordmark-accent"> ADVANTAGE</span>
      </span>
    </div>
  );
}
