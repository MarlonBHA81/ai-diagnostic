import { Fragment, type ReactNode } from 'react';

/**
 * Render a string with **bold-accent** segments as <em> (styled as the brand
 * accent, not italic). Used for headlines like "Where should AI go **first**".
 */
export function renderAccented(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>,
  );
}
