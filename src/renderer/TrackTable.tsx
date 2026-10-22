import { useEffect, useState } from 'react';
import { BpmMath } from '@core/analysis/BpmMath';
import { BeatStatusLabel, Format, KeyChoice, type Beat, type SortDirection, type SortKey } from '@core/library/types';
import { CheckBox } from './CheckBox';

const columns: { key: SortKey; label: string; className: string }[] = [
  { key: 'title', label: 'Title', className: 'col-title' },
  { key: 'bpm', label: 'BPM', className: 'col-bpm' },
  { key: 'key', label: 'Key', className: 'col-key' },
  { key: 'genre', label: 'Genre', className: 'col-genre' },
  { key: 'status', label: 'Status', className: 'col-status' },
  { key: 'date', label: 'Date', className: 'col-date' },
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
  onSelectVisible: (selected: boolean) => void;
}) {
  const narrow = useNarrow();
  const tabId = props.beats.some((beat) => beat.id === props.activeId) ? props.activeId : props.beats[0]?.id;
  const visibleIds = props.beats.map((beat) => beat.id);
  const selectedVisible = visibleIds.filter((id) => props.selected.includes(id)).length;
  const allVisible = visibleIds.length > 0 && selectedVisible === visibleIds.length;

  return (
    <table className="tracks" role="grid" aria-label="Beats">
      <colgroup>
        <col className="col-check" />
        <col className="col-title" />
        <col className="col-bpm" />
        <col className="col-key" />
        <col className="col-genre" />
        <col className="col-status" />
        <col className="col-date" />
      </colgroup>
      <thead>
        <tr role="row">
          <th scope="col" role="columnheader">
            <CheckBox
              checked={allVisible}
              indeterminate={selectedVisible > 0 && !allVisible}
              ariaLabel={allVisible ? 'Clear selection' : 'Select all visible beats'}
              onChange={(checked) => props.onSelectVisible(checked)}
            />
          </th>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              role="columnheader"
              className={column.className}
              aria-sort={props.sortKey === column.key ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
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
          const picked = props.selected.includes(beat.id);
          const credit = [beat.producer, beat.artist].filter(Boolean).join(' · ');
          const bits = [
            credit,
            beat.format.toUpperCase(),
            Format.duration(beat.durationSec),
            narrow && beat.genre ? beat.genre : '',
            narrow && beat.date ? Format.date(beat.date) : '',
            props.busy.includes(beat.id) ? 'Analyzing' : '',
          ].filter(Boolean);
          return (
            <tr
              key={beat.id}
              role="row"
              data-id={beat.id}
              tabIndex={beat.id === tabId ? 0 : -1}
              className={`${active ? 'active' : ''} ${picked && !active ? 'picked' : ''} ${beat.missing ? 'missing' : ''}`}
              aria-selected={picked}
              onClick={(event) => props.onChoose(beat.id, index, event)}
              onKeyDown={(event) => {
                if ((event.target as HTMLElement).tagName === 'INPUT') return;
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  event.stopPropagation();
                  const next = index + (event.key === 'ArrowDown' ? 1 : -1);
                  const beatNext = props.beats[next];
                  if (beatNext) {
                    props.onChoose(beatNext.id, next, event);
                    (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
                  }
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  props.onChoose(beat.id, index, event);
                } else if (event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  props.onChoose(beat.id, index, { shiftKey: event.shiftKey, metaKey: true, ctrlKey: true });
                }
              }}
            >
              <td role="gridcell">
                <CheckBox
                  checked={picked}
                  ariaLabel={`Select ${beat.title}`}
                  onChange={(_checked, shiftKey) => {
                    props.onChoose(beat.id, index, { shiftKey, metaKey: true, ctrlKey: true });
                  }}
                />
              </td>
              <td role="gridcell" className="col-title">
                <div className="title-cell">
                  <strong>{beat.title}</strong>
                  <small>
                    {bits.join(' · ')}
                    {beat.tagsDirty ? <span className="dirty"> <i /> Not written to file</span> : null}
                  </small>
                </div>
              </td>
              <td role="gridcell" className="num col-bpm">
                {bpm == null ? <span className="sr">BPM not set</span> : Format.bpm(bpm)}
                {beat.bpmLocked ? <LockMark /> : null}
              </td>
              <td role="gridcell" className="col-key">
                {key.name ? key.name : <span className="sr">Key not set</span>} {key.camelot ? <span className="camelot">{key.camelot}</span> : null}
              </td>
              <td role="gridcell" className="col-genre">{beat.genre || <span className="sr">Genre not set</span>}</td>
              <td role="gridcell" className="col-status"><span className="pill"><i className={`dot ${beat.status}`} />{BeatStatusLabel.text(beat.status)}</span></td>
              <td role="gridcell" className="col-date">{beat.date || <span className="sr">Date not set</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function LockMark() {
  return (
    <svg className="lock-mark" viewBox="0 0 16 16" width="12" height="12" aria-label="BPM locked">
      <rect x="3" y="7" width="10" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1359px)');
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);
  return narrow;
}
