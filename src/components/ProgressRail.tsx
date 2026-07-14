/**
 * Progress rail — 7 zone ticks. A tick is "done" once its zone is passed and
 * "current" for the active zone. Baseline and welcome show no filled ticks;
 * results shows all done.
 */
export function ProgressRail({
  zoneCount,
  currentZone,
  allDone,
}: {
  zoneCount: number;
  /** 0-based index of the active zone, or null when not in a zone. */
  currentZone: number | null;
  allDone?: boolean;
}) {
  return (
    <div className="rail" role="progressbar" aria-label="Progress"
      aria-valuemin={0} aria-valuemax={zoneCount}
      aria-valuenow={allDone ? zoneCount : currentZone == null ? 0 : currentZone}>
      {Array.from({ length: zoneCount }, (_, i) => {
        const done = allDone || (currentZone != null && i < currentZone);
        const current = !allDone && currentZone === i;
        return (
          <span
            key={i}
            className={
              'rail__tick' +
              (done ? ' rail__tick--done' : current ? ' rail__tick--current' : '')
            }
          />
        );
      })}
    </div>
  );
}
