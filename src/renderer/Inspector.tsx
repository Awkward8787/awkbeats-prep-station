import { useEffect, useRef, useState } from 'react';
import { PlaybackSpan } from '@core/audio/PlaybackSpan';
import { BpmMath } from '@core/analysis/BpmMath';
import { Camelot } from '@core/analysis/Camelot';
import { KeyConfidence } from '@core/analysis/KeyConfidence';
import { UserMessage } from '@core/library/UserMessage';
import { BEAT_STATUSES, BeatCatalog, BeatStatusLabel, Format, KeyChoice, type Beat, type UserPatch } from '@core/library/types';
import { HoldDrone, KeyPlay, KeyPreview } from './KeyPreview';
import { SectionToggle } from './Sidebar';

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
  onDropCover: (file: File) => void;
  onAdjust: () => void;
  onBatch: () => void;
}) {
  const beat = props.beat;
  const [draft, setDraft] = useState<Beat | null>(beat);
  const [tagDraft, setTagDraft] = useState('');
  const [bpmDraft, setBpmDraft] = useState('');
  const [bpmError, setBpmError] = useState('');
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [coverDrag, setCoverDrag] = useState(false);
  useEffect(() => {
    setDraft(beat);
    setBpmDraft(beat ? Format.bpm(BpmMath.working(beat)) : '');
    setBpmError('');
    setReleaseOpen(false);
  }, [beat?.id, beat?.updatedAt]);

  if (!beat || !draft) {
    return (
      <aside className="inspector" aria-label="Beat editor">
        <div className="inspector-scroll">
          <h2>Beat</h2>
          <p className="muted">Select a beat to see its tempo, key and cover.</p>
        </div>
      </aside>
    );
  }

  const working = KeyChoice.working(beat);
  const parsed = Camelot.parse(working.name || '') || Camelot.fromPitch(6, 'minor');
  const bpm = BpmMath.working(beat);
  const save = (patch: UserPatch) => props.onChange(patch);
  const tempoNote = tempoDifference(beat, bpm);
  const keyNote = beat.keyOverride && beat.keyDetected && beat.keyOverride !== beat.keyDetected
    ? `Detected ${beat.keyDetected}. You set ${beat.keyOverride}.`
    : '';
  const lowConfidence = !beat.keyOverride && KeyConfidence.low(beat.keyConfidence) && Boolean(working.name);
  const scaleChecked = beat.bpmOverride == null ? beat.bpmScale : null;
  const square = beat.artworkWidth != null && beat.artworkHeight != null && beat.artworkWidth === beat.artworkHeight;

  function commitBpm() {
    if (!bpmDraft.trim()) {
      setBpmError('');
      save({ bpmOverride: null });
      return;
    }
    const value = Number(bpmDraft);
    if (!Number.isFinite(value) || value < 40 || value > 300) {
      setBpmError(UserMessage.bpmInvalid);
      return;
    }
    setBpmError('');
    save({ bpmOverride: value });
  }

  function setKey(root: string, mode: 'major' | 'minor') {
    const pitch = Camelot.roots().indexOf(root);
    const next = Camelot.fromPitch(pitch < 0 ? parsed.pitchClass : pitch, mode);
    save({ keyOverride: next.name, camelotOverride: next.camelot });
    KeyPreview.restartIfSounding(next.name);
  }

  return (
    <aside className="inspector" aria-label="Beat editor">
      <div className="inspector-scroll">
        <div className="inspector-head">
          <div>
            <h3>{beat.title}</h3>
            <div className="faint">{[beat.fileName, Format.fileSize(beat.fileSize), Format.duration(beat.durationSec)].filter(Boolean).join(' · ')}</div>
            {beat.tagsDirty ? <div className="dirty"><i /> Not written to file</div> : null}
          </div>
          <button className="play" type="button" aria-label={props.playing ? 'Pause' : 'Play'} onClick={() => {
            const audio = document.getElementById('beat-player') as HTMLAudioElement | null;
            if (!audio) return;
            if (audio.paused) void audio.play();
            else audio.pause();
          }}>{props.playing ? <PauseIcon /> : <PlayIcon />}</button>
        </div>
        <BeatAudio beat={beat} onPlayChange={props.onPlayChange} />
        {beat.missing ? <p className="error">{UserMessage.fileMissing}</p> : null}

        <div className="section-head">
          <h2>Tempo and key</h2>
          <button className="btn btn-ghost" type="button" onClick={props.onAnalyze} disabled={props.busy || beat.missing}>{props.busy ? 'Analyzing…' : 'Re-analyze'}</button>
        </div>
        <section className="analysis" aria-label="Tempo and key">
          <div className="tempo-row">
            <div className="tempo">{Format.bpm(bpm) ? <>{Format.bpm(bpm)}<span> BPM</span></> : 'BPM'}</div>
            {working.camelot ? <span className="camelot">{working.camelot}</span> : null}
            <button className="icon-toggle" type="button" aria-label="Lock BPM" title="Lock BPM" aria-pressed={beat.bpmLocked} onClick={() => save({ bpmLocked: !beat.bpmLocked })}>
              <LockIcon closed={beat.bpmLocked} />
            </button>
          </div>
          <div className="key-line">
            <span className="key-name">{working.name || 'Key not measured'}</span>
            <button className="icon-toggle" type="button" aria-label="Lock key" title="Lock key" aria-pressed={beat.keyLocked} onClick={() => save({ keyLocked: !beat.keyLocked })}>
              <LockIcon closed={beat.keyLocked} />
            </button>
          </div>
          {tempoNote ? <p className="faint">{tempoNote}</p> : null}
          {keyNote ? <p className="faint">{keyNote}</p> : null}
          {lowConfidence ? <p className="faint">Low key confidence. Check by ear.</p> : null}
          {beat.peaks.length ? <Waveform key={beat.id} peaks={beat.peaks} durationSec={beat.durationSec} /> : <p className="faint">{UserMessage.analyzeIdle}</p>}
          <div className="tempo-controls">
            <div className="segment" role="radiogroup" aria-label="Tempo scale">
              {([[0.5, '½×'], [1, '1×'], [2, '2×']] as const).map(([scale, label]) => (
                <button
                  key={label}
                  className="btn"
                  type="button"
                  role="radio"
                  aria-checked={scaleChecked === scale}
                  onClick={() => save({ bpmScale: scale, bpmOverride: null })}
                >{label}</button>
              ))}
            </div>
            <div className="field bpm-field">
              <label htmlFor="bpm-override" className="sr">BPM</label>
              <input id="bpm-override" inputMode="decimal" value={bpmDraft} onChange={(event) => setBpmDraft(event.target.value)} onBlur={commitBpm} />
            </div>
          </div>
          {bpmError ? <p className="error">{bpmError}</p> : null}
          <div className="key-edit">
            <div className="field">
              <label htmlFor="key-root">Key</label>
              <select id="key-root" value={parsed.root} onChange={(event) => setKey(event.target.value, parsed.mode)}>
                {Camelot.roots().map((root) => <option key={root} value={root}>{root}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="key-mode">Mode</label>
              <select id="key-mode" value={parsed.mode} onChange={(event) => setKey(parsed.root, event.target.value === 'minor' ? 'minor' : 'major')}>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>
            {beat.keyOverride ? (
              <button className="btn btn-ghost" type="button" onClick={() => save({ keyOverride: null, camelotOverride: null })}>Reset to detected</button>
            ) : null}
          </div>
          <div className="key-actions">
            <KeyPlay name={working.name} />
            <HoldDrone name={working.name} />
          </div>
        </section>

        <h2>Cover</h2>
        <div
          className={`${beat.artworkFile ? 'cover has' : 'cover empty'}${coverDrag ? ' drag' : ''}`}
          style={beat.artworkFile ? { backgroundImage: `url("beat://cover/${beat.id}?v=${encodeURIComponent(beat.updatedAt)}")` } : undefined}
          onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setCoverDrag(true); }}
          onDragLeave={() => setCoverDrag(false)}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setCoverDrag(false);
            const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith('image/'));
            if (file) props.onDropCover(file);
          }}
        >
          {beat.artworkFile ? null : (
            <div>
              <p>Drop a cover image or</p>
              <button className="btn" type="button" onClick={props.onPickCover}>Add cover</button>
            </div>
          )}
        </div>
        {beat.artworkFile ? (
          <div className="button-row">
            <button className="btn" type="button" onClick={props.onPickCover}>Add cover</button>
            <button className="btn" type="button" onClick={props.onAdjust}>Adjust crop</button>
            <button className="btn" type="button" onClick={props.onExportCover}>Export cover</button>
          </div>
        ) : null}
        {beat.artworkWidth && beat.artworkHeight && !square ? (
          <p className="faint">Cover is {beat.artworkWidth}×{beat.artworkHeight} and not square. Use Adjust crop to export a 1500 or 3000 square.</p>
        ) : null}

        <h2>Details</h2>
        <Text label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} onBlur={() => save({ title: draft.title })} />
        <div className="range">
          <Text label="Producer" value={draft.producer} onChange={(producer) => setDraft({ ...draft, producer })} onBlur={() => save({ producer: draft.producer })} />
          <Text label="Artist" value={draft.artist} onChange={(artist) => setDraft({ ...draft, artist })} onBlur={() => save({ artist: draft.artist })} />
        </div>
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
              <span className="chip" key={tag}>
                {tag}
                <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => save({ tags: draft.tags.filter((item) => item !== tag) })}>×</button>
              </span>
            ))}
          </div>
          <input id="tag-input" value={tagDraft} aria-describedby="tag-hint" onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              const next = [...draft.tags, tagDraft];
              setTagDraft('');
              save({ tags: next });
            } else if (event.key === 'Backspace' && !tagDraft && draft.tags.length) {
              save({ tags: draft.tags.slice(0, -1) });
            }
          }} />
          <span id="tag-hint" className="faint">Press Enter to add a tag.</span>
        </div>

        <SectionToggle
          label="Release info"
          count={[draft.copyright, draft.isrc, draft.date, draft.comment].filter((value) => value.trim()).length}
          open={releaseOpen}
          onClick={() => setReleaseOpen((value) => !value)}
        />
        {releaseOpen ? (
          <div className="filter-stack">
            <Text label="Copyright" value={draft.copyright} onChange={(copyright) => setDraft({ ...draft, copyright })} onBlur={() => save({ copyright: draft.copyright })} />
            <Text label="ISRC" value={draft.isrc} onChange={(isrc) => setDraft({ ...draft, isrc })} onBlur={() => save({ isrc: draft.isrc })} />
            <div className="field">
              <label htmlFor="beat-date">Date</label>
              <input id="beat-date" type="date" value={draft.date} onChange={(event) => { setDraft({ ...draft, date: event.target.value }); save({ date: event.target.value }); }} />
            </div>
            <Text label="Comments" value={draft.comment} area onChange={(comment) => setDraft({ ...draft, comment })} onBlur={() => save({ comment: draft.comment })} />
          </div>
        ) : null}

        <h2>Catalog</h2>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={beat.status} onChange={(event) => save({ status: event.target.value as Beat['status'] })}>
            {BEAT_STATUSES.map((status) => <option key={status} value={status}>{BeatStatusLabel.text(status)}</option>)}
          </select>
        </div>
        <Text label="Notes" value={draft.notes} area onChange={(notes) => setDraft({ ...draft, notes })} onBlur={() => save({ notes: draft.notes })} />
        {props.selectionCount > 1 ? <button className="btn" type="button" onClick={props.onBatch}>Edit {props.selectionCount} selected</button> : null}
        <button className="btn btn-danger catalog-remove" type="button" onClick={props.onRemove}>Remove from library</button>
      </div>
      <div className="inspector-footer">
        <button className="btn btn-primary" type="button" onClick={props.onWrite} disabled={beat.missing}>Write tags to file</button>
        <button className="btn" type="button" onClick={props.onReveal} disabled={beat.missing}>Show in folder</button>
      </div>
    </aside>
  );
}

function tempoDifference(beat: Beat, working: number | null): string {
  if (beat.bpmDetected == null || working == null) return '';
  const detected = Format.bpm(beat.bpmDetected);
  if (beat.bpmOverride != null && Format.bpm(working) !== detected) return `Detected ${detected} BPM. You set ${Format.bpm(working)} BPM.`;
  if (beat.bpmOverride == null && beat.bpmScale === 2) return `Detected ${detected} BPM. Set to double-time.`;
  if (beat.bpmOverride == null && beat.bpmScale === 0.5) return `Detected ${detected} BPM. Set to half-time.`;
  return '';
}

function BeatAudio(props: { beat: Beat; onPlayChange: (playing: boolean) => void }) {
  useEffect(() => () => {
    const audio = document.getElementById('beat-player') as HTMLAudioElement | null;
    audio?.pause();
  }, [props.beat.id]);
  return (
    <audio
      id="beat-player"
      key={props.beat.id}
      src={props.beat.missing ? undefined : `beat://audio/${props.beat.id}`}
      onPlay={() => props.onPlayChange(true)}
      onPause={() => props.onPlayChange(false)}
    />
  );
}

function Waveform(props: { peaks: number[]; durationSec: number | null }) {
  const [time, setTime] = useState(0);
  const [reported, setReported] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = useRef(0);
  useEffect(() => {
    const audio = document.getElementById('beat-player') as HTMLAudioElement | null;
    if (!audio) return;
    const read = () => {
      setTime(audio.currentTime || 0);
      setReported(audio.duration);
      setPlaying(!audio.paused);
    };
    read();
    audio.addEventListener('timeupdate', read);
    audio.addEventListener('loadedmetadata', read);
    audio.addEventListener('durationchange', read);
    audio.addEventListener('play', read);
    audio.addEventListener('pause', read);
    audio.addEventListener('ended', read);
    return () => {
      audio.removeEventListener('timeupdate', read);
      audio.removeEventListener('loadedmetadata', read);
      audio.removeEventListener('durationchange', read);
      audio.removeEventListener('play', read);
      audio.removeEventListener('pause', read);
      audio.removeEventListener('ended', read);
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const audio = document.getElementById('beat-player') as HTMLAudioElement | null;
    if (!audio) return;
    const tick = () => {
      setTime(audio.currentTime || 0);
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame.current);
  }, [playing]);
  const duration = PlaybackSpan.total(reported, props.durationSec);
  const ratio = duration > 0 ? Math.min(1, time / duration) : 0;
  function seekTo(next: number) {
    const audio = document.getElementById('beat-player') as HTMLAudioElement | null;
    if (!audio || duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(duration, next));
    setTime(audio.currentTime);
  }
  return (
    <div className="wave-block">
      <svg
        className="waveform"
        viewBox="0 0 360 48"
        role="slider"
        tabIndex={0}
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${Format.duration(time) || '0:00'} of ${Format.duration(duration) || '0:00'}`}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          seekTo(((event.clientX - rect.left) / rect.width) * duration);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            seekTo(time + (event.key === 'ArrowRight' ? 5 : -5));
          }
        }}
      >
        {props.peaks.map((peak, index) => {
          const x = (index + 0.5) * (360 / props.peaks.length);
          const h = Math.max(1.5, peak * 44);
          const played = (index + 0.5) / props.peaks.length <= ratio;
          return <path key={index} className={played ? 'played' : 'rest'} d={`M${x.toFixed(2)} ${((48 - h) / 2).toFixed(2)} V${((48 - h) / 2 + h).toFixed(2)}`} />;
        })}
      </svg>
      <div className="time-read">{Format.duration(time) || '0:00'} / {Format.duration(duration) || '0:00'}</div>
    </div>
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M5 3.2v9.6l8-4.8z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="4" y="3" width="2.6" height="10" rx="0.4" fill="currentColor" />
      <rect x="9.4" y="3" width="2.6" height="10" rx="0.4" fill="currentColor" />
    </svg>
  );
}

function LockIcon(props: { closed: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {props.closed ? (
        <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      ) : (
        <path d="M8 7V4.4a2.6 2.6 0 0 1 5.2 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}
