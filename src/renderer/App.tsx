import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logoUrl from '../../build/logo.png';
import { TrackAnalyzer } from '@core/analysis/TrackAnalyzer';
import { BpmMath } from '@core/analysis/BpmMath';
import { BeatQuery } from '@core/library/BeatRules';
import { UserMessage } from '@core/library/UserMessage';
import { BEAT_STATUSES, BeatStatusLabel, type Beat, type LibraryFilters, type Settings, type SortDirection, type SortKey } from '@core/library/types';
import { WebAudioDecode } from './decode';
import { CropDialog, ShortcutsDialog, SettingsDialog, BatchDialog, ConfirmDialog } from './dialogs';
import { Inspector } from './Inspector';
import { Sidebar } from './Sidebar';
import { TrackTable } from './TrackTable';

const emptyFilters: LibraryFilters = {
  search: '',
  status: 'all',
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
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [busy, setBusy] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [playing, setPlaying] = useState(false);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200);
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
            else if ('error' in saved && saved.error) toast(saved.error);
          } catch {
            toast(`Could not analyze ${beat.title}.`);
          }
        }
        for (const error of local.errors) toast(error.message);
      } finally {
        setBusy((current) => current.filter((id) => !unique.includes(id)));
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
      await analyzeIds(result.needsDecode);
    },
    [analyzeIds, refresh, toast],
  );

  const actions = useRef({ importPaths, analyzeIds, toast, selected, activeId });
  actions.current = { importPaths, analyzeIds, toast, selected, activeId };

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
      if (command === 'write-tags') void window.prep.writeTags(ids).then((results) => {
        const failed = results.filter((item) => !item.ok);
        current.toast(failed.length ? failed[0].message : UserMessage.tagsWritten);
      });
      if (command === 'remove') setDialog({ type: 'remove' });
    });
  }, []);

  const visible = useMemo(
    () => BeatQuery.sort(beats.filter((beat) => BeatQuery.match(beat, filters)), sortKey, sortDirection),
    [beats, filters, sortKey, sortDirection],
  );
  const active = beats.find((beat) => beat.id === activeId) || null;

  async function writeTags(ids: string[]) {
    if (!ids.length) return;
    const results = await window.prep.writeTags(ids);
    const failed = results.filter((item) => !item.ok);
    toast(failed.length ? failed[0].message : UserMessage.tagsWritten);
  }

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === 'Escape' && dialog) {
        setDialog(null);
        return;
      }
      if (typing) return;
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
      } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && visible.length) {
        event.preventDefault();
        const index = Math.max(0, visible.findIndex((beat) => beat.id === activeId));
        const next = visible[Math.min(visible.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)))];
        if (next) choose(next.id, visible.indexOf(next), event);
      } else if (event.key === ' ' && active) {
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

  return (
    <div className={active ? 'app inspecting' : 'app'} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(event) => {
      event.preventDefault();
      setDragOver(false);
      const paths = window.prep.pathsForFiles(Array.from(event.dataTransfer.files));
      void importPaths(paths);
    }}>
      <a className="sr" href="#library">Skip to library</a>
      <header className="topbar">
        <button className="brand" onClick={() => void window.prep.openSite()} type="button">
          <BrandMark />
          <span>
            <span className="brand-name"><span>AWK</span>BEATS</span>
            <span className="brand-sub">Prep Station</span>
          </span>
        </button>
        <div className="search">
          <label className="sr" htmlFor="library-search">Search the library</label>
          <input id="library-search" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        </div>
        <div className="top-actions">
          <button className="btn" type="button" onClick={() => void window.prep.pickAudio().then((paths) => importPaths(paths))}>Import</button>
          <button className="btn" type="button" onClick={() => void analyzeIds(selected.length ? selected : activeId ? [activeId] : visible.map((beat) => beat.id))} disabled={!beats.length}>Analyze</button>
          <button className="btn" type="button" onClick={() => void window.prep.exportCsv(selected)}>Export CSV</button>
        </div>
      </header>
      <div className="workspace">
        <Sidebar
          filters={filters}
          counts={counts}
          beats={beats}
          onChange={setFilters}
          onClear={() => setFilters(emptyFilters)}
        />
        <main id="library" className="table-wrap">
          {beats.length === 0 ? (
            <div className="empty">
              <div>
                <img className="empty-mark" src={logoUrl} alt="AwkBeats" />
                <h2>{UserMessage.emptyTitle}</h2>
                <p className="muted">{UserMessage.emptyBody}</p>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div className="empty">
              <div>
                <img className="empty-mark" src={logoUrl} alt="" />
                <h2>{UserMessage.noMatches}</h2>
              </div>
            </div>
          ) : (
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
            if ('error' in result && result.error) toast(result.error);
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
            const blob = new Blob([copy]);
            setDialog({ type: 'crop', src: URL.createObjectURL(blob), name: picked.name });
          }}
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
        <span>{beats.length} beats{selected.length ? ` · ${selected.length} selected` : ''}</span>
        <span>{active ? `${BeatStatusLabel.text(active.status)} · ${BpmMath.interpretation({ bpmDetected: active.bpmDetected, bpmScale: active.bpmScale, bpmOverride: active.bpmOverride })}` : 'Awkward J · awkbeats.com'}</span>
        <button className="btn-ghost" type="button" onClick={() => setDialog({ type: 'shortcuts' })}>Shortcuts</button>
      </footer>
      {dragOver ? <div className="drop">Drop beats to import</div> : null}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((item) => <div className="toast" key={item.id}>{item.text}</div>)}
      </div>
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
          confirm="Remove"
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

