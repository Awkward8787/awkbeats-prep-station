import { useEffect, useState } from 'react';
import { BpmMath } from '@core/analysis/BpmMath';
import { Camelot } from '@core/analysis/Camelot';
import { UserMessage } from '@core/library/UserMessage';
import { BEAT_STATUSES, BeatCatalog, BeatStatusLabel, Format, KeyChoice, type Beat, type UserPatch } from '@core/library/types';

export function Inspector(props: {
  beat: Beat | null;
  busy: boolean;
  playing: boolean;
  selectionCount: number;
  onPlayChange: (playing: boolean) => void;
  onChange: (patch: UserPatch) => void;
  onAnalyze: () => void;
  onWrite: () => void;
  onRemove: () => void;
  onReveal: () => void;
  onExportCover: () => void;
  onPickCover: () => void;
  onAdjust: () => void;
  onBatch: () => void;
}) {
  const beat = props.beat;
  const [draft, setDraft] = useState<Beat | null>(beat);
  const [tagDraft, setTagDraft] = useState('');
  const [bpmDraft, setBpmDraft] = useState('');
  useEffect(() => {
    setDraft(beat);
    setBpmDraft(beat ? Format.bpm(BpmMath.working(beat)).replace('—', '') : '');
  }, [beat?.id, beat?.updatedAt]);

  if (!beat || !draft) {
    return (
      <aside className="inspector" aria-label="Beat editor">
        <h2>Beat</h2>
        <p className="muted">Select a beat to edit its tempo, key, notes, and cover.</p>
      </aside>
    );
  }
  const working = KeyChoice.working(beat);
  const parsed = Camelot.parse(working.name || '') || Camelot.fromPitch(6, 'minor');
  const bpm = BpmMath.working(beat);
  const interpretation = BpmMath.interpretation(beat);
  const save = (patch: UserPatch) => props.onChange(patch);

  return (
    <aside className="inspector" aria-label="Beat editor">
      <div className="inspector-head">
        <div>
          <h3>{beat.title}</h3>
          <div className="faint">{beat.fileName} · {Format.fileSize(beat.fileSize)} · {Format.duration(beat.durationSec)}</div>
        </div>
        <button className="play" type="button" aria-label={props.playing ? 'Pause' : 'Play'} onClick={() => {
          const audio = document.getElementById('beat-player') as HTMLAudioElement | null;
          if (!audio) return;
          if (audio.paused) void audio.play();
          else audio.pause();
        }}>{props.playing ? 'II' : '▶'}</button>
      </div>
      <audio
        id="beat-player"
        src={beat.missing ? undefined : `beat://audio/${beat.id}`}
        onPlay={() => props.onPlayChange(true)}
        onPause={() => props.onPlayChange(false)}
      />
      {beat.missing ? <p className="error">{UserMessage.fileMissing}</p> : null}
      <section className="analysis" aria-label="Analysis">
        <div className="tempo-row">
          <div>
            <div className="tempo">{Format.bpm(bpm)}<small>BPM · {interpretation}{beat.bpmLocked ? ' · locked' : ''}</small></div>
          </div>
          {working.camelot ? <span className="camelot">{working.camelot}</span> : null}
        </div>
        <div className="key-line">{working.name || 'Key not measured'}</div>
        <div className="faint">
          Detected {beat.bpmDetected != null ? Format.bpm(beat.bpmDetected) : '—'} BPM
          {beat.keyDetected ? ` · ${beat.keyDetected}` : ''}
          {beat.keyConfidence != null ? ` · ${Math.round(beat.keyConfidence * 100)}% key confidence` : ''}
        </div>
        {beat.peaks.length ? (
          <svg className="waveform" viewBox="0 0 360 48" aria-hidden="true">
            <path d={beat.peaks.map((peak, index) => {
              const x = (index + 0.5) * (360 / beat.peaks.length);
              const h = Math.max(1.5, peak * 44);
              return `M${x.toFixed(2)} ${(48 - h) / 2} V${((48 - h) / 2 + h).toFixed(2)}`;
            }).join(' ')} />
          </svg>
        ) : <p className="faint">{UserMessage.analyzeIdle}</p>}
        <div className="button-row">
          <button className="btn" type="button" onClick={() => save({ bpmScale: 0.5, bpmOverride: null })}>Half-time</button>
          <button className="btn" type="button" onClick={() => save({ bpmScale: 2, bpmOverride: null })}>Double-time</button>
          <button className="btn" type="button" onClick={() => save({ bpmScale: 1, bpmOverride: null })}>Use detected</button>
          <button className="btn" type="button" aria-pressed={beat.bpmLocked} onClick={() => save({ bpmLocked: !beat.bpmLocked })}>{beat.bpmLocked ? 'Unlock BPM' : 'Lock BPM'}</button>
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="bpm-override">Working BPM</label>
          <input id="bpm-override" inputMode="decimal" value={bpmDraft} onChange={(event) => setBpmDraft(event.target.value)} onBlur={() => {
            if (!bpmDraft.trim()) { save({ bpmOverride: null }); return; }
            const value = Number(bpmDraft);
            if (!Number.isFinite(value)) return;
            save({ bpmOverride: value });
          }} />
        </div>
        <div className="range">
          <div className="field">
            <label htmlFor="key-root">Key</label>
            <select id="key-root" value={parsed.root} onChange={(event) => {
              const next = Camelot.fromPitch(Camelot.roots().indexOf(event.target.value), parsed.mode);
              save({ keyOverride: next.name, camelotOverride: next.camelot });
            }}>
              {Camelot.roots().map((root) => <option key={root} value={root}>{root}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="key-mode">Mode</label>
            <select id="key-mode" value={parsed.mode} onChange={(event) => {
              const mode = event.target.value === 'minor' ? 'minor' : 'major';
              const next = Camelot.fromPitch(parsed.pitchClass, mode);
              save({ keyOverride: next.name, camelotOverride: next.camelot });
            }}>
              <option value="major">major</option>
              <option value="minor">minor</option>
            </select>
          </div>
        </div>
        <div className="button-row">
          <button className="btn" type="button" onClick={() => save({ keyOverride: null, camelotOverride: null })}>Use detected key</button>
          <button className="btn" type="button" aria-pressed={beat.keyLocked} onClick={() => save({ keyLocked: !beat.keyLocked })}>{beat.keyLocked ? 'Unlock key' : 'Lock key'}</button>
          <button className="btn btn-primary" type="button" onClick={props.onAnalyze} disabled={props.busy || beat.missing}>{props.busy ? 'Analyzing…' : 'Analyze again'}</button>
        </div>
      </section>
      <h2>Artwork</h2>
      <div className="cover" style={beat.artworkFile ? { backgroundImage: `url("beat://cover/${beat.id}?v=${encodeURIComponent(beat.updatedAt)}")` } : undefined}>
        {beat.artworkFile ? null : 'No cover yet'}
      </div>
      <div className="button-row">
        <button className="btn" type="button" onClick={props.onPickCover}>Add cover</button>
        <button className="btn" type="button" onClick={props.onAdjust} disabled={!beat.artworkFile}>Adjust crop</button>
        <button className="btn" type="button" onClick={props.onExportCover} disabled={!beat.artworkFile}>Export cover</button>
      </div>
      {beat.artworkWidth ? <p className="faint">Embedded size {beat.artworkWidth}×{beat.artworkHeight}. 3000×3000 is available in the crop.</p> : null}
      <h2>Metadata</h2>
      <Text label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} onBlur={() => save({ title: draft.title })} />
      <Text label="Producer / artist" value={draft.artist} onChange={(artist) => setDraft({ ...draft, artist })} onBlur={() => save({ artist: draft.artist })} />
      <div className="field">
        <label htmlFor="genre">Genre</label>
        <input id="genre" list="genre-list" value={draft.genre} onChange={(event) => setDraft({ ...draft, genre: event.target.value })} onBlur={() => save({ genre: draft.genre })} />
        <datalist id="genre-list">{BeatCatalog.genres.map((genre) => <option key={genre} value={genre} />)}</datalist>
      </div>
      <div className="field">
        <label htmlFor="mood">Mood</label>
        <input id="mood" list="mood-list" value={draft.mood} onChange={(event) => setDraft({ ...draft, mood: event.target.value })} onBlur={() => save({ mood: draft.mood })} />
        <datalist id="mood-list">{BeatCatalog.moods.map((mood) => <option key={mood} value={mood} />)}</datalist>
      </div>
      <div className="field">
        <label htmlFor="tag-input">Tags</label>
        <div className="chips">
          {draft.tags.map((tag) => (
            <button key={tag} className="chip" type="button" onClick={() => save({ tags: draft.tags.filter((item) => item !== tag) })}>{tag} ×</button>
          ))}
        </div>
        <input id="tag-input" value={tagDraft} aria-describedby="tag-hint" onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const next = [...draft.tags, tagDraft];
            setTagDraft('');
            save({ tags: next });
          }
        }} />
        <span id="tag-hint" className="faint">Press Enter to add a tag.</span>
      </div>
      <Text label="Comments" value={draft.comment} area onChange={(comment) => setDraft({ ...draft, comment })} onBlur={() => save({ comment: draft.comment })} />
      <Text label="Copyright" value={draft.copyright} onChange={(copyright) => setDraft({ ...draft, copyright })} onBlur={() => save({ copyright: draft.copyright })} />
      <Text label="ISRC" value={draft.isrc} onChange={(isrc) => setDraft({ ...draft, isrc })} onBlur={() => save({ isrc: draft.isrc })} />
      <div className="field">
        <label htmlFor="beat-date">Date</label>
        <input id="beat-date" type="date" value={draft.date} onChange={(event) => { setDraft({ ...draft, date: event.target.value }); save({ date: event.target.value }); }} />
      </div>
      <h2>Catalog</h2>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" value={beat.status} onChange={(event) => save({ status: event.target.value as Beat['status'] })}>
          {BEAT_STATUSES.map((status) => <option key={status} value={status}>{BeatStatusLabel.text(status)}</option>)}
        </select>
      </div>
      <Text label="Notes" value={draft.notes} area onChange={(notes) => setDraft({ ...draft, notes })} onBlur={() => save({ notes: draft.notes })} />
      <div className="button-row">
        <button className="btn btn-primary" type="button" onClick={props.onWrite} disabled={beat.missing}>Write tags to file</button>
        <button className="btn" type="button" onClick={props.onReveal} disabled={beat.missing}>Show in folder</button>
        {props.selectionCount > 1 ? <button className="btn" type="button" onClick={props.onBatch}>Edit {props.selectionCount} selected</button> : null}
        <button className="btn btn-danger" type="button" onClick={props.onRemove}>Remove</button>
      </div>
    </aside>
  );
}

function Text(props: { label: string; value: string; area?: boolean; onChange: (value: string) => void; onBlur: () => void }) {
  const id = `field-${props.label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}</label>
      {props.area ? (
        <textarea id={id} rows={3} value={props.value} onChange={(event) => props.onChange(event.target.value)} onBlur={props.onBlur} />
      ) : (
        <input id={id} value={props.value} onChange={(event) => props.onChange(event.target.value)} onBlur={props.onBlur} />
      )}
    </div>
  );
}
