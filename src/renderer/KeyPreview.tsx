import { useSyncExternalStore } from 'react';
import { KeyTone } from '@core/analysis/KeyTone';

type PreviewSnap = { sounding: boolean; holding: boolean; name: string | null };

/** Local reference chord. A separate AudioContext from the beat player. */
export class KeyPreview {
  private static context: AudioContext | null = null;
  private static nodes: OscillatorNode[] = [];
  private static timer: number | null = null;
  private static listeners = new Set<() => void>();
  private static snap: PreviewSnap = { sounding: false, holding: false, name: null };

  static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  static snapshot(): PreviewSnap {
    return this.snap;
  }

  static toggleChord(name: string): void {
    if (!KeyTone.triad(name)) return;
    if (this.snap.sounding && !this.snap.holding && this.snap.name === name) {
      this.stop();
      return;
    }
    this.startChord(name);
  }

  static toggleHold(name: string): void {
    if (!KeyTone.triad(name)) return;
    if (this.snap.holding) this.stop();
    else this.startDrone(name);
  }

  static restartIfSounding(name: string): void {
    if (!this.snap.sounding || !KeyTone.triad(name)) return;
    if (this.snap.holding) this.startDrone(name);
    else this.startChord(name);
  }

  static stop(): void {
    if (this.timer != null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        // The voice may already have ended.
      }
    }
    this.nodes = [];
    this.publish(false, false, null);
  }

  private static startChord(name: string): void {
    const notes = KeyTone.triad(name);
    const ctx = this.prepare();
    if (!notes || !ctx) return;
    const now = ctx.currentTime;
    const midis = notes.map((note) => KeyTone.midi(note, 3)).filter((midi): midi is number => midi != null);
    midis.forEach((midi) => this.voice(ctx, midi, now, now + 1.5, 0.05));
    this.publish(true, false, name);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.nodes = [];
      this.publish(false, false, null);
    }, 1500);
  }

  private static startDrone(name: string): void {
    const notes = KeyTone.triad(name);
    const ctx = this.prepare();
    if (!notes || !ctx) return;
    const midi = KeyTone.midi(notes[0], 3);
    if (midi == null) return;
    const now = ctx.currentTime;
    this.voice(ctx, midi, now, now + 3600, 0.12);
    this.publish(true, true, name);
  }

  private static prepare(): AudioContext | null {
    if (typeof AudioContext === 'undefined') return null;
    if (this.timer != null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        // already ended
      }
    }
    this.nodes = [];
    const ctx = this.context ?? new AudioContext();
    this.context = ctx;
    void ctx.resume();
    return ctx;
  }

  private static voice(ctx: AudioContext, midi: number, start: number, stopAt: number, peak: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), start);
    const gain = ctx.createGain();
    const releaseAt = Math.max(start + 0.02, stopAt - 0.3);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.setValueAtTime(peak, releaseAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(stopAt + 0.02);
    this.nodes.push(osc);
  }

  private static publish(sounding: boolean, holding: boolean, name: string | null): void {
    this.snap = { sounding, holding, name };
    for (const listener of this.listeners) listener();
  }
}

export function KeyPlay(props: { name: string | null }) {
  const snap = useSyncExternalStore(
    (listener) => KeyPreview.subscribe(listener),
    () => KeyPreview.snapshot(),
  );
  const name = props.name;
  const playing = Boolean(name && snap.sounding && !snap.holding && snap.name === name);
  const label = name ? `Play ${name} reference chord` : 'Key not measured yet';
  return (
    <span className="key-play-wrap" title={name ? undefined : 'Key not measured yet'}>
      <button
        className={playing ? 'key-play on' : 'key-play'}
        type="button"
        disabled={!name}
        aria-pressed={playing}
        aria-label={label}
        data-label={name ? label : undefined}
        onClick={() => name && KeyPreview.toggleChord(name)}
      >
        {playing ? <StopIcon /> : <SpeakerIcon />}
      </button>
    </span>
  );
}

export function HoldDrone(props: { name: string | null }) {
  const snap = useSyncExternalStore(
    (listener) => KeyPreview.subscribe(listener),
    () => KeyPreview.snapshot(),
  );
  const holding = Boolean(props.name && snap.holding && snap.name === props.name);
  return (
    <button
      className={holding ? 'btn lock on' : 'btn lock'}
      type="button"
      disabled={!props.name}
      aria-pressed={holding}
      title={props.name ? 'Hold the root while the beat plays' : 'Key not measured yet'}
      onClick={() => props.name && KeyPreview.toggleHold(props.name)}
    >
      Hold
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M2.5 6.2h2.2L8 3.6v8.8L4.7 9.8H2.5z" fill="currentColor" />
      <path d="M10 6.2a2.6 2.6 0 0 1 0 3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.6 4.6a4.6 4.6 0 0 1 0 6.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}
