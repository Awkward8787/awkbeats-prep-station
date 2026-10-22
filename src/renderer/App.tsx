import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logoUrl from '../../build/logo.png';
import { TrackAnalyzer } from '@core/analysis/TrackAnalyzer';
import { BeatQuery } from '@core/library/BeatRules';
import { UserMessage } from '@core/library/UserMessage';
import { BEAT_STATUSES, KeyChoice, type Beat, type LibraryFilters, type Settings, type SortDirection, type SortKey } from '@core/library/types';
import { WebAudioDecode } from './decode';
import { CropDialog, ShortcutsDialog, SettingsDialog, BatchDialog, ConfirmDialog, ProducerDialog } from './dialogs';
import { Inspector } from './Inspector';
import { KeyPreview } from './KeyPreview';
import { ShortcutGuard } from './ShortcutGuard';
import { Sidebar } from './Sidebar';
import { TrackTable } from './TrackTable';

const emptyFilters: LibraryFilters = {
  search: '',
  status: 'all',
  producer: '',
  artist: '',
  genre: '',
  key: '',
  tag: '',
  bpmMin: null,
  bpmMax: null,
  dateFrom: '',
  dateTo: '',
};

type Dialog =
  | null
  | { type: 'settings' }
  | { type: 'shortcuts' }
  | { type: 'batch' }
  | { type: 'remove' }
  | { type: 'crop'; src: string; name: string };

type ToastItem = { id: number; text: string; tone: 'ok' | 'error' };

export function App() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filters, setFilters] = useState<LibraryFilters>(emptyFilters);
  const [sortKey, setSortKey] = useState<SortKey>('imported');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [busy, setBusy] = useState<string[]>([]);
  const [job, setJob] = useState<{ total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [playing, setPlaying] = useState(false);
  const dragDepth = useRef(0);

  const toast = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text, tone }]);
    if (tone === 'ok') window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4000);
  }, []);

  const replace = useCallback((beat: Beat) => {
    setBeats((current) => current.map((item) => (item.id === beat.id ? beat : item)));
  }, []);

  const refresh = useCallback(async () => {
    setBeats(await window.prep.list());
  }, []);

  const analyzeIds = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids)];
      if (!unique.length) return;
      setBusy((current) => [...new Set([...current, ...unique])]);
      setJob({ total: unique.length });
      try {
        const local = await window.prep.analyze(unique);
        setBeats(local.beats);
        for (const id of local.needsDecode) {
          const beat = local.beats.find((item) => item.id === id);
          if (!beat) continue;
          try {
            const bytes = new Uint8Array(await window.prep.readAudio(id));
            const decoded = await WebAudioDecode.decode(bytes, beat.format);
            const analysis = TrackAnalyzer.analyze(decoded.samples, decoded.sampleRate);
            const saved = await window.prep.submitAnalysis(id, analysis);
            if ('beat' in saved && saved.beat) replace(saved.beat);
            else if ('error' in saved && saved.error) toast(saved.error, 'error');
          } catch {
            toast(`Couldn't read ${beat.fileName}. Check that the file plays in another app, then choose Re-analyze.`, 'error');
          }
        }
        for (const error of local.errors) toast(error.message, 'error');
      } finally {
        setBusy((current) => current.filter((id) => !unique.includes(id)));
        setJob(null);
      }
    },
    [replace, toast],
  );

  const importPaths = useCallback(
    async (paths: string[]) => {
      if (!paths.length) return;
      const result = await window.prep.importPaths(paths);
      await refresh();
      toast(UserMessage.imported(result.imported.length, result.duplicates, result.failed.length));
      if (result.failed.length) toast(result.failed[0].message, 'error');
      await analyzeIds(result.needsDecode);
    },
    [analyzeIds, refresh, toast],
  );

  const writeTags = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const results = await window.prep.writeTags(ids);
    setBeats(await window.prep.list());
    const failed = results.filter((item) => !item.ok);
    if (failed.length) toast(failed[0].message, 'error');
    else if (results[0]) toast(results.length === 1 ? results[0].message : `Tags written to ${results.length} files.`);
  }, [toast]);

  const actions = useRef({ importPaths, analyzeIds, toast, writeTags, selected, activeId });
  actions.current = { importPaths, analyzeIds, toast, writeTags, selected, activeId };

  useEffect(() => {
    void (async () => {
      const [library, current, startup] = await Promise.all([window.prep.list(), window.prep.settings(), window.prep.takeStartup()]);
      setBeats(library);
      setSettings(current);
      if (library[0]) setActiveId(library[0].id);
      if (startup.length) await actions.current.analyzeIds(startup);
    })();
    return window.prep.onMenu((command) => {
      const current = actions.current;
      const ids = current.selected.length ? current.selected : current.activeId ? [current.activeId] : [];
      if (command === 'import-files') void window.prep.pickAudio().then((paths) => current.importPaths(paths));
      if (command === 'import-folder') void window.prep.pickFolder().then((folder) => { if (folder) return current.importPaths([folder]); });
      if (command === 'export-csv') void window.prep.exportCsv(current.selected).then((file) => file && current.toast(`Catalog saved to ${file}`));
      if (command === 'settings') setDialog({ type: 'settings' });
      if (command === 'shortcuts') setDialog({ type: 'shortcuts' });
      if (command === 'analyze') void current.analyzeIds(ids);
      if (command === 'write-tags') void current.writeTags(ids);
      if (command === 'remove') setDialog({ type: 'remove' });
    });
  }, []);

  const visible = useMemo(
    () => BeatQuery.sort(beats.filter((beat) => BeatQuery.match(beat, filters)), sortKey, sortDirection),
    [beats, filters, sortKey, sortDirection],
  );
  const active = beats.find((beat) => beat.id === activeId) || null;

  useEffect(() => {
    if (activeId && beats.length && !visible.some((beat) => beat.id === activeId)) setActiveId(null);
  }, [visible, activeId, beats.length]);

  function choose(id: string, index: number, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) {
    if (event.shiftKey) {
      const start = Math.min(anchor, index);
      const end = Math.max(anchor, index);
      setSelected(visible.slice(start, end + 1).map((beat) => beat.id));
    } else if (event.metaKey || event.ctrlKey) {
      setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
      setAnchor(index);
    } else {
      setSelected([id]);
      setAnchor(index);
    }
    setActiveId(id);
  }

  const showProducer = Boolean(settings && beats.length === 0 && !settings.producerName && !settings.producerPromptDismissed && !dialog);

  useEffect(() => {
    KeyPreview.stop();
  }, [activeId]);

  useEffect(() => {
    const stop = () => KeyPreview.stop();
    window.addEventListener('blur', stop);
    return () => window.removeEventListener('blur', stop);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === 'Escape') {
        KeyPreview.stop();
        if (dialog) setDialog(null);
        return;
      }
      if (ShortcutGuard.controlOwnsKey(target, event.key)) return;
      if (dialog || showProducer || typing) return;
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        document.getElementById('library-search')?.focus();
      } else if (mod && event.key.toLowerCase() === 'i' && event.shiftKey) {
        event.preventDefault();
        void window.prep.pickFolder().then((folder) => { if (folder) return importPaths([folder]); });
      } else if (mod && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        void window.prep.pickAudio().then((paths) => importPaths(paths));
      } else if (mod && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        void window.prep.exportCsv(selected).then((file) => file && toast(`Catalog saved to ${file}`));
      } else if (mod && event.key === 'Enter') {
        event.preventDefault();
        void analyzeIds(selected.length ? selected : activeId ? [activeId] : []);
      } else if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void writeTags(selected.length ? selected : activeId ? [activeId] : []);
      } else if (mod && event.key === ',') {
        event.preventDefault();
        setDialog({ type: 'settings' });
      } else if (mod && event.key === '/') {
        event.preventDefault();
        setDialog({ type: 'shortcuts' });
      } else if (mod && event.key === 'Backspace') {
        event.preventDefault();
        setDialog({ type: 'remove' });
      } else if (!mod && !event.altKey && event.key.toLowerCase() === 'k' && active) {
        const name = KeyChoice.working(active).name;
        if (!name) return;
        event.preventDefault();
        KeyPreview.toggleChord(name);
      } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && visible.length && !target?.closest('table.tracks')) {
        event.preventDefault();
        const index = Math.max(0, visible.findIndex((beat) => beat.id === activeId));
        const next = visible[Math.min(visible.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)))];
        if (next) choose(next.id, visible.indexOf(next), event);
      } else if (event.key === ' ' && active && ShortcutGuard.spacePlaysBeat(target)) {
        event.preventDefault();
        const audio = document.getElementById('beat-player') as HTMLAudioElement | null;
        if (!audio) return;
        if (audio.paused) void audio.play();
        else audio.pause();
      } else if (/^[1-5]$/.test(event.key) && active) {
        const status = BEAT_STATUSES[Number(event.key) - 1];
        void window.prep.updateBeat(active.id, { status }).then((result) => 'beat' in result && result.beat && replace(result.beat));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: beats.length };
    for (const status of BEAT_STATUSES) map[status] = beats.filter((beat) => beat.status === status).length;
    return map;
  }, [beats]);

  const mac = window.prep.platform === 'darwin';
  const exportLabel = selected.length ? `Export ${selected.length} selected` : 'Export catalog';
  const progress = job && busy.length ? `Analyzing ${job.total - busy.length + 1} of ${job.total}…` : '';

  async function openCover(file: File) {
    const copy = await file.arrayBuffer();
    setDialog({ type: 'crop', src: URL.createObjectURL(new Blob([copy])), name: file.name });
  }

  return (
    <div
      className={beats.length === 0 ? 'app empty-lib' : 'app'}
      onDragEnter={(event) => { event.preventDefault(); dragDepth.current += 1; setDragOver(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => { dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragOver(false); } }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragOver(false);
        const paths = window.prep.pathsForFiles(Array.from(event.dataTransfer.files));
        void importPaths(paths);
      }}
    >
      <a className="sr" href="#library">Skip to library</a>
      <header className="topbar">
        <div className="brand">
          <BrandMark />
          <span>
            <span className="brand-name"><span>AWK</span>BEATS</span>
            <span className="brand-sub">Prep Station</span>
          </span>
        </div>
        <div className="search">
          <label className="sr" htmlFor="library-search">Search</label>
          <SearchIcon />
          <input
            id="library-search"
            placeholder="Search title, tag, genre or key"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
          <span className="search-hint" aria-hidden="true"><kbd>{mac ? '⌘' : 'Ctrl'}</kbd><kbd>F</kbd></span>
        </div>
        <div className="top-actions">
          <button className="btn" type="button" onClick={() => void window.prep.pickAudio().then((paths) => importPaths(paths))}>Import beats</button>
          <button
            className="btn"
            type="button"
            disabled={!beats.length}
            title={beats.length ? undefined : 'Import beats first'}
            onClick={() => void window.prep.exportCsv(selected).then((file) => file && toast(`Catalog saved to ${file}`))}
          >{exportLabel}</button>
        </div>
      </header>
      <div className="workspace">
        <Sidebar filters={filters} counts={counts} beats={beats} onChange={setFilters} onClear={() => setFilters(emptyFilters)} />
        <main
          id="library"
          className="table-wrap"
          onClick={(event) => {
            const el = event.target as HTMLElement;
            if (el === event.currentTarget || el.classList.contains('table-hint')) setSelected([]);
          }}
        >
          {beats.length === 0 ? (
            <div className="empty">
              <div className={dragOver ? 'drop-zone drag' : 'drop-zone'}>
                <img className="empty-mark" src={logoUrl} alt="" />
                <h2>{UserMessage.emptyTitle}</h2>
                <p className="muted">{UserMessage.emptyBody}</p>
                <div className="button-row">
                  <button className="btn btn-primary" type="button" onClick={() => void window.prep.pickAudio().then((paths) => importPaths(paths))}>Import beats</button>
                  <button className="btn" type="button" onClick={() => void window.prep.pickFolder().then((folder) => { if (folder) return importPaths([folder]); })}>Import a folder</button>
                </div>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div className="empty">
              <div>
                <h2>{filters.search ? `No beats match "${filters.search}".` : 'No beats match these filters.'}</h2>
                <button className="btn" type="button" onClick={() => setFilters(emptyFilters)}>Clear search and filters</button>
              </div>
            </div>
          ) : (
            <>
              <TrackTable
                beats={visible}
                selected={selected}
                activeId={activeId}
                busy={busy}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={(key) => {
                  if (key === sortKey) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  else { setSortKey(key); setSortDirection(key === 'title' ? 'asc' : 'desc'); }
                }}
                onChoose={choose}
              />
              <p className="table-hint">Drop more beats anywhere to import them.</p>
            </>
          )}
        </main>
        <Inspector
          beat={active}
          busy={active ? busy.includes(active.id) : false}
          playing={playing}
          onPlayChange={setPlaying}
          onChange={async (patch) => {
            if (!active) return;
            const result = await window.prep.updateBeat(active.id, patch);
            if ('error' in result && result.error) toast(result.error, 'error');
            if ('beat' in result && result.beat) replace(result.beat);
          }}
          onAnalyze={() => active && void analyzeIds([active.id])}
          onWrite={() => active && void writeTags([active.id])}
          onRemove={() => setDialog({ type: 'remove' })}
          onReveal={() => active && void window.prep.showInFolder(active.id)}
          onExportCover={() => active && void window.prep.exportArtwork(active.id).then((file) => file && toast(`Cover saved to ${file}`))}
          onPickCover={async () => {
            const picked = await window.prep.pickArtwork();
            if (!picked) return;
            const copy = new ArrayBuffer(picked.bytes.byteLength);
            new Uint8Array(copy).set(picked.bytes);
            setDialog({ type: 'crop', src: URL.createObjectURL(new Blob([copy])), name: picked.name });
          }}
          onDropCover={(file) => void openCover(file)}
          onAdjust={async () => {
            if (!active?.artworkFile) return;
            const response = await fetch(`beat://cover/${active.id}?v=${encodeURIComponent(active.updatedAt)}`);
            const blob = await response.blob();
            setDialog({ type: 'crop', src: URL.createObjectURL(blob), name: 'cover.jpg' });
          }}
          onBatch={() => selected.length > 1 && setDialog({ type: 'batch' })}
          selectionCount={selected.length}
        />
      </div>
      <footer className="footer">
        <span>{beats.length} {beats.length === 1 ? 'beat' : 'beats'} · {selected.length} selected</span>
        <span>{progress}</span>
        <span className="footer-right">
          <button className="powered" type="button" onClick={() => void window.prep.openSite()}>
            Powered by <span>AwkBeats</span>
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setDialog({ type: 'shortcuts' })}>Shortcuts</button>
        </span>
      </footer>
      {dragOver && beats.length > 0 ? (
        <div className="drop">
          <img src={logoUrl} alt="" />
          <strong>Drop to import</strong>
          <span>WAV, MP3, AIFF or FLAC</span>
        </div>
      ) : null}
      <div className="toast-wrap">
        {toasts.map((item) => (
          <div className={item.tone === 'error' ? 'toast error' : 'toast'} key={item.id} role={item.tone === 'error' ? 'alert' : 'status'}>
            <span>{item.text}</span>
            {item.tone === 'error' ? <button type="button" aria-label="Dismiss" onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}>×</button> : null}
          </div>
        ))}
      </div>
      {showProducer && settings ? (
        <ProducerDialog
          onLater={() => {
            void window.prep.updateSettings({ producerPromptDismissed: true }).then(setSettings);
          }}
          onSave={(producerName) => {
            void window.prep.updateSettings({ producerName, producerPromptDismissed: true }).then(setSettings);
          }}
        />
      ) : null}
      {dialog?.type === 'settings' && settings ? (
        <SettingsDialog
          settings={settings}
          onClose={() => setDialog(null)}
          onSave={async (patch) => {
            setSettings(await window.prep.updateSettings(patch));
            setDialog(null);
            toast('Settings saved.');
          }}
        />
      ) : null}
      {dialog?.type === 'shortcuts' ? <ShortcutsDialog onClose={() => setDialog(null)} /> : null}
      {dialog?.type === 'batch' ? (
        <BatchDialog
          count={selected.length}
          onClose={() => setDialog(null)}
          onApply={async (patch) => {
            const updated = await window.prep.batchUpdate(selected, patch);
            setBeats((current) => current.map((beat) => updated.find((item) => item.id === beat.id) || beat));
            setDialog(null);
            toast(`Updated ${updated.length} beats.`);
          }}
        />
      ) : null}
      {dialog?.type === 'remove' ? (
        <ConfirmDialog
          title={UserMessage.removeTitle}
          body={UserMessage.removeBody}
          confirm="Remove from library"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const ids = selected.length ? selected : activeId ? [activeId] : [];
            setBeats(await window.prep.remove(ids));
            setSelected([]);
            setActiveId(null);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.type === 'crop' && active && settings ? (
        <CropDialog
          src={dialog.src}
          initialSize={settings.artworkExportSize}
          onClose={() => { URL.revokeObjectURL(dialog.src); setDialog(null); }}
          onUse={async (bytes, size) => {
            const beat = await window.prep.saveArtwork(active.id, bytes, size, size);
            replace(beat);
            URL.revokeObjectURL(dialog.src);
            setDialog(null);
            toast(`Cover set at ${size}×${size}.`);
          }}
        />
      ) : null}
    </div>
  );
}

export function BrandMark() {
  return <img className="brand-mark" src={logoUrl} alt="" />;
}

function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.4 10.4 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
