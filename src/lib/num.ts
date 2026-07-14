/** Parse a numeric input value to a finite number, or null when blank/invalid. */
export function parseNum(value: string): number | null {
  const t = value.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Format hours: whole number when integer, else one decimal (matches prototype). */
export function fmtHours(n: number): string {
  return Number.isInteger(n) ? n.toString() : (Math.round(n * 10) / 10).toString();
}
