import { BEAT_STATUSES, BeatCatalog, BeatStatusLabel, type Beat, type LibraryFilters } from '@core/library/types';

export function Sidebar(props: {
  filters: LibraryFilters;
  counts: Record<string, number>;
  beats: Beat[];
  onChange: (filters: LibraryFilters) => void;
  onClear: () => void;
}) {
  const genres = [...new Set([...BeatCatalog.genres, ...props.beats.map((beat) => beat.genre).filter(Boolean)])];
  const keys = [...new Set(props.beats.flatMap((beat) => [beat.camelotDetected, beat.camelotOverride].filter((item): item is string => Boolean(item))))].sort();
  const tags = [...new Set(props.beats.flatMap((beat) => beat.tags))].sort((a, b) => a.localeCompare(b));
  const set = (patch: Partial<LibraryFilters>) => props.onChange({ ...props.filters, ...patch });
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
      <div className="field">
        <label>BPM</label>
        <div className="range">
          <input aria-label="Minimum BPM" inputMode="decimal" value={props.filters.bpmMin ?? ''} onChange={(event) => set({ bpmMin: event.target.value ? Number(event.target.value) : null })} />
          <input aria-label="Maximum BPM" inputMode="decimal" value={props.filters.bpmMax ?? ''} onChange={(event) => set({ bpmMax: event.target.value ? Number(event.target.value) : null })} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="filter-from">Date from</label>
        <input id="filter-from" type="date" value={props.filters.dateFrom} onChange={(event) => set({ dateFrom: event.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="filter-to">Date to</label>
        <input id="filter-to" type="date" value={props.filters.dateTo} onChange={(event) => set({ dateTo: event.target.value })} />
      </div>
      <button className="btn btn-ghost" type="button" onClick={props.onClear}>Clear filters</button>
    </nav>
  );
}
