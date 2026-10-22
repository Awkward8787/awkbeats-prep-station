import { useEffect, useState } from 'react';
import { BEAT_STATUSES, BeatCatalog, BeatStatusLabel, type Beat, type LibraryFilters } from '@core/library/types';

export function Sidebar(props: {
  filters: LibraryFilters;
  counts: Record<string, number>;
  beats: Beat[];
  onChange: (filters: LibraryFilters) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<'any' | '7' | '30' | 'year' | 'custom'>('any');
  const [bpmMinText, setBpmMinText] = useState('');
  const [bpmMaxText, setBpmMaxText] = useState('');
  const set = (patch: Partial<LibraryFilters>) => props.onChange({ ...props.filters, ...patch });

  useEffect(() => {
    setBpmMinText(props.filters.bpmMin == null ? '' : String(props.filters.bpmMin));
    setBpmMaxText(props.filters.bpmMax == null ? '' : String(props.filters.bpmMax));
  }, [props.filters.bpmMin, props.filters.bpmMax]);

  useEffect(() => {
    if (!props.filters.dateFrom && !props.filters.dateTo && added !== 'custom') setAdded('any');
  }, [props.filters.dateFrom, props.filters.dateTo, added]);

  if (props.beats.length === 0) return <nav className="rail" aria-label="Library" />;

  const genres = [...new Set([...BeatCatalog.genres, ...props.beats.map((beat) => beat.genre).filter(Boolean)])];
  const keys = [...new Set(props.beats.flatMap((beat) => [beat.camelotDetected, beat.camelotOverride].filter((item): item is string => Boolean(item))))].sort();
  const tags = [...new Set(props.beats.flatMap((beat) => beat.tags))].sort((a, b) => a.localeCompare(b));
  const filterCount = countFilters(props.filters);
  const filtersActive = filterCount > 0 || props.filters.status !== 'all';

  function parseBpm(raw: string, key: 'bpmMin' | 'bpmMax') {
    const text = raw.trim();
    if (!text) {
      set({ [key]: null });
      return;
    }
    const value = Number(text);
    if (!Number.isFinite(value)) {
      if (key === 'bpmMin') setBpmMinText(props.filters.bpmMin == null ? '' : String(props.filters.bpmMin));
      else setBpmMaxText(props.filters.bpmMax == null ? '' : String(props.filters.bpmMax));
      return;
    }
    set({ [key]: value });
  }

  function chooseAdded(next: 'any' | '7' | '30' | 'year' | 'custom') {
    setAdded(next);
    if (next === 'custom') return;
    set(dateRange(next));
  }

  return (
    <nav className="rail" aria-label="Library filters">
      <h2>Library</h2>
      <div className="status-list">
        <button className={props.filters.status === 'all' ? 'status-item active' : 'status-item'} type="button" onClick={() => set({ status: 'all' })}>
          <span>All</span><span className="count">{props.counts.all || 0}</span>
        </button>
        {BEAT_STATUSES.map((status) => (
          <button key={status} className={props.filters.status === status ? 'status-item active' : 'status-item'} type="button" onClick={() => set({ status })}>
            <span><i className={`dot ${status}`} />{BeatStatusLabel.text(status)}</span>
            <span className="count">{props.counts[status] || 0}</span>
          </button>
        ))}
      </div>
      <SectionToggle label="Filters" count={filterCount} open={open} onClick={() => setOpen((value) => !value)} />
      {open ? (
        <div className="filter-stack">
          <div className="field">
            <label htmlFor="filter-producer">Producer</label>
            <input id="filter-producer" value={props.filters.producer} onChange={(event) => set({ producer: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="filter-artist">Artist</label>
            <input id="filter-artist" value={props.filters.artist} onChange={(event) => set({ artist: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="filter-genre">Genre</label>
            <select id="filter-genre" value={props.filters.genre} onChange={(event) => set({ genre: event.target.value })}>
              <option value="">Any genre</option>
              {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-key">Key</label>
            <select id="filter-key" value={props.filters.key} onChange={(event) => set({ key: event.target.value })}>
              <option value="">Any key</option>
              {keys.map((key) => <option key={key} value={key}>{key}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-tag">Tag</label>
            <select id="filter-tag" value={props.filters.tag} onChange={(event) => set({ tag: event.target.value })}>
              <option value="">Any tag</option>
              {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>
          <fieldset className="field bpm-range">
            <legend>BPM</legend>
            <div className="range">
              <input
                id="bpm-min"
                aria-label="Minimum BPM"
                type="number"
                min={40}
                max={300}
                step={1}
                placeholder="Min"
                value={bpmMinText}
                onChange={(event) => setBpmMinText(event.target.value)}
                onBlur={() => parseBpm(bpmMinText, 'bpmMin')}
              />
              <input
                id="bpm-max"
                aria-label="Maximum BPM"
                type="number"
                min={40}
                max={300}
                step={1}
                placeholder="Max"
                value={bpmMaxText}
                onChange={(event) => setBpmMaxText(event.target.value)}
                onBlur={() => parseBpm(bpmMaxText, 'bpmMax')}
              />
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="filter-added">Added</label>
            <select id="filter-added" value={added} onChange={(event) => chooseAdded(event.target.value as 'any' | '7' | '30' | 'year' | 'custom')}>
              <option value="any">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="year">This year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          {added === 'custom' ? (
            <div className="range">
              <div className="field">
                <label htmlFor="filter-from">From</label>
                <input id="filter-from" type="date" value={props.filters.dateFrom} onChange={(event) => set({ dateFrom: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="filter-to">To</label>
                <input id="filter-to" type="date" value={props.filters.dateTo} onChange={(event) => set({ dateTo: event.target.value })} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {filtersActive ? <button className="btn btn-ghost" type="button" onClick={props.onClear}>Clear filters</button> : null}
    </nav>
  );
}

export function SectionToggle(props: { label: string; count: number; open: boolean; onClick: () => void }) {
  return (
    <button className="section-toggle" type="button" aria-expanded={props.open} onClick={props.onClick}>
      <svg className="chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M6 3.5 11 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{props.label}</span>
      <span className="count">{props.count}</span>
    </button>
  );
}

function countFilters(filters: LibraryFilters): number {
  let count = 0;
  if (filters.producer) count += 1;
  if (filters.artist) count += 1;
  if (filters.genre) count += 1;
  if (filters.key) count += 1;
  if (filters.tag) count += 1;
  if (filters.bpmMin != null) count += 1;
  if (filters.bpmMax != null) count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  return count;
}

function dateRange(preset: 'any' | '7' | '30' | 'year'): { dateFrom: string; dateTo: string } {
  if (preset === 'any') return { dateFrom: '', dateTo: '' };
  const now = new Date();
  const today = iso(now);
  if (preset === 'year') return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: `${now.getFullYear()}-12-31` };
  const from = new Date(now);
  from.setDate(from.getDate() - (preset === '7' ? 6 : 29));
  return { dateFrom: iso(from), dateTo: today };
}

function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
