import { BpmMath } from '@core/analysis/BpmMath';
import { BeatStatusLabel, Format, KeyChoice, type Beat, type SortDirection, type SortKey } from '@core/library/types';

const columns: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'bpm', label: 'BPM' },
  { key: 'key', label: 'Key' },
  { key: 'genre', label: 'Genre' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
];

export function TrackTable(props: {
  beats: Beat[];
  selected: string[];
  activeId: string | null;
  busy: string[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onChoose: (id: string, index: number, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
}) {
  return (
    <table className="tracks">
      <thead>
        <tr>
          <th scope="col"></th>
          {columns.map((column) => (
            <th key={column.key} scope="col">
              <button type="button" onClick={() => props.onSort(column.key)}>
                {column.label}{props.sortKey === column.key ? (props.sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.beats.map((beat, index) => {
          const key = KeyChoice.working(beat);
          const bpm = BpmMath.working(beat);
          const active = beat.id === props.activeId;
          return (
            <tr
              key={beat.id}
              className={`${active ? 'active' : ''} ${beat.missing ? 'missing' : ''}`}
              aria-selected={props.selected.includes(beat.id)}
              onClick={(event) => props.onChoose(beat.id, index, event)}
            >
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${beat.title}`}
                  checked={props.selected.includes(beat.id)}
                  onChange={() => undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onChoose(beat.id, index, { ...event, metaKey: true, ctrlKey: true, shiftKey: event.shiftKey });
                  }}
                />
              </td>
              <td>
                <div className="title-cell">
                  <strong>{beat.title}</strong>
                  <small>{beat.artist} · {beat.format.toUpperCase()} · {Format.duration(beat.durationSec)}{props.busy.includes(beat.id) ? ' · Analyzing' : ''}</small>
                </div>
              </td>
              <td className="mono">{Format.bpm(bpm)}{beat.bpmLocked ? ' · locked' : ''}</td>
              <td>{key.name || '—'} {key.camelot ? <span className="camelot">{key.camelot}</span> : null}</td>
              <td>{beat.genre || '—'}</td>
              <td><span className="pill"><i className={`dot ${beat.status}`} />{BeatStatusLabel.text(beat.status)}</span></td>
              <td>{beat.date || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
