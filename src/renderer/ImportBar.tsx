import { ImportProgress, type ImportSnapshot } from '@core/library/ImportProgress';

export function ImportBar(props: { snapshot: ImportSnapshot }) {
  const { snapshot } = props;
  const fraction = ImportProgress.fraction(snapshot);
  const count = ImportProgress.countLabel(snapshot);
  const phase = ImportProgress.phaseLabel(snapshot.phase);
  const line = ImportProgress.statusLine(snapshot.line);
  const current = snapshot.done >= snapshot.total ? snapshot.total : snapshot.done + 1;

  return (
    <div className="import-bar" role="status" aria-live="polite">
      <div className="import-bar-top">
        <strong>{phase}</strong>
        <span className="import-count">{count}</span>
      </div>
      <div
        className="import-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={snapshot.total}
        aria-valuenow={current}
        aria-valuetext={`${phase}, ${count}. ${line}`}
      >
        <div className="import-fill" style={{ width: `${Math.round(fraction * 1000) / 10}%` }} />
      </div>
      <p className="import-line">{line}</p>
    </div>
  );
}
