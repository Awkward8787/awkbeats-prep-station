import { useEffect, useRef, useState } from 'react';
import { ImportProgress, type ImportSnapshot } from '@core/library/ImportProgress';

export function ImportBar(props: { snapshot: ImportSnapshot; onStop: () => void }) {
  const { snapshot } = props;
  const started = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Date.now() - started.current), 250);
    return () => window.clearInterval(timer);
  }, []);

  const fraction = ImportProgress.fraction(snapshot);
  const count = ImportProgress.countLabel(snapshot);
  const phase = ImportProgress.phaseLabel(snapshot.phase);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const line = reduce ? (elapsed >= 1500 ? ImportProgress.lines[0] : null) : ImportProgress.spokenLine(elapsed);

  return (
    <div className="import-bar">
      <div className="import-bar-top">
        <strong>{phase}</strong>
        <span className="import-count">{count}</span>
      </div>
      <div
        className="import-track"
        role="progressbar"
        aria-label="Import progress"
        aria-valuemin={0}
        aria-valuemax={snapshot.total}
        aria-valuenow={snapshot.done}
        aria-valuetext={`${snapshot.done} of ${snapshot.total} done`}
      >
        <div className="import-fill" style={{ width: `${Math.round(fraction * 1000) / 10}%` }} />
      </div>
      {line ? <p className="import-line" aria-hidden="true">{line}</p> : null}
      <button className="btn btn-ghost" type="button" aria-label="Stop import" onClick={props.onStop}>Stop</button>
    </div>
  );
}
