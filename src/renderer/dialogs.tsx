import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { SquareCrop } from '@core/library/SquareCrop';
import { UserMessage } from '@core/library/UserMessage';
import { BEAT_STATUSES, BeatCatalog, BeatStatusLabel, type BatchPatch, type Settings } from '@core/library/types';

export function SettingsDialog(props: { settings: Settings; onClose: () => void; onSave: (patch: Partial<Settings>) => void }) {
  const [producerName, setProducerName] = useState(props.settings.producerName);
  const [copyrightTemplate, setCopyrightTemplate] = useState(props.settings.copyrightTemplate);
  const [artworkExportSize, setArtworkExportSize] = useState(props.settings.artworkExportSize);
  const [creditProducerAsComposer, setCreditProducerAsComposer] = useState(props.settings.creditProducerAsComposer);
  return (
    <Modal title="Settings" onClose={props.onClose}>
      <div className="field">
        <label htmlFor="producer-name">Producer name</label>
        <input id="producer-name" value={producerName} onChange={(event) => setProducerName(event.target.value)} />
        <span className="faint">Saved on this computer and filled in on every new beat. A beat can use a different producer name.</span>
      </div>
      <div className="field">
        <label htmlFor="copyright-template">Copyright template</label>
        <input id="copyright-template" value={copyrightTemplate} onChange={(event) => setCopyrightTemplate(event.target.value)} />
        <span className="faint">{'{year}'} and {'{producer}'} are replaced when a beat is imported. If the producer name is empty, the copyright line stays blank.</span>
      </div>
      <div className="field">
        <label className="check-row" htmlFor="credit-composer">
          <input
            id="credit-composer"
            type="checkbox"
            checked={creditProducerAsComposer}
            onChange={(event) => setCreditProducerAsComposer(event.target.checked)}
          />
          Also credit producer as composer
        </label>
        <span className="faint">Off writes the producer tag only. On also writes the composer tag.</span>
      </div>
      <div className="field">
        <label htmlFor="art-size">Default cover export</label>
        <select id="art-size" value={artworkExportSize} onChange={(event) => setArtworkExportSize(Number(event.target.value) === 1500 ? 1500 : 3000)}>
          <option value={1500}>1500×1500</option>
          <option value={3000}>3000×3000</option>
        </select>
      </div>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={props.onClose}>Cancel</button>
        <button className="btn btn-primary" type="button" onClick={() => props.onSave({ producerName, copyrightTemplate, artworkExportSize, creditProducerAsComposer })}>Save settings</button>
      </div>
    </Modal>
  );
}

export function ShortcutsDialog(props: { onClose: () => void }) {
  const mac = window.prep.platform === 'darwin';
  const mod = mac ? '⌘' : 'Ctrl';
  const rows: { label: string; keys: string[] }[] = [
    { label: 'Search', keys: [mod, 'F'] },
    { label: 'Import beats', keys: [mod, 'I'] },
    { label: 'Import a folder', keys: [mod, 'Shift', 'I'] },
    { label: 'Export catalog', keys: [mod, 'E'] },
    { label: 'Re-analyze', keys: [mod, 'Enter'] },
    { label: 'Write tags', keys: [mod, 'S'] },
    { label: 'Play reference chord', keys: ['K'] },
    { label: 'Remove from library', keys: [mod, 'Backspace'] },
    { label: 'Move selection', keys: ['↑', '↓'] },
    { label: 'Play or pause', keys: ['Space'] },
    { label: 'Set status', keys: ['1', '5'] },
    { label: 'Settings', keys: [mod, ','] },
    { label: 'This list', keys: [mod, '/'] },
  ];
  return (
    <Modal title="Keyboard shortcuts" onClose={props.onClose}>
      <div className="shortcut-list">
        {rows.map((row) => (
          <FragmentRow key={row.label} label={row.label} keys={row.keys} />
        ))}
      </div>
      <div className="modal-actions"><button className="btn" type="button" onClick={props.onClose}>Close</button></div>
    </Modal>
  );
}

function FragmentRow(props: { label: string; keys: string[] }) {
  return (
    <>
      <span>{props.label}</span>
      <span className="keys">{props.keys.map((key) => <kbd key={key}>{key}</kbd>)}</span>
    </>
  );
}

export function ProducerDialog(props: { onSave: (name: string) => void; onLater: () => void }) {
  const [name, setName] = useState('');
  return (
    <Modal title="What name goes on your beats?" onClose={props.onLater}>
      <div className="field">
        <label htmlFor="first-producer">Producer name</label>
        <input id="first-producer" value={name} onChange={(event) => setName(event.target.value)} />
        <span className="faint">Filled in on new beats. You can change it on any beat.</span>
      </div>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={props.onLater}>Later</button>
        <button className="btn btn-primary" type="button" disabled={!name.trim()} onClick={() => props.onSave(name.trim())}>Save</button>
      </div>
    </Modal>
  );
}

export function BatchDialog(props: { count: number; onClose: () => void; onApply: (patch: BatchPatch) => void }) {
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [producer, setProducer] = useState('');
  const [artist, setArtist] = useState('');
  const [tags, setTags] = useState('');
  const [copyright, setCopyright] = useState('');
  return (
    <Modal title={`Edit ${props.count} beats`} onClose={props.onClose}>
      <p className="muted">Only fields you fill in are applied. Empty fields stay as they are.</p>
      <div className="field">
        <label htmlFor="batch-status">Status</label>
        <select id="batch-status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Leave unchanged</option>
          {BEAT_STATUSES.map((item) => <option key={item} value={item}>{BeatStatusLabel.text(item)}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="batch-genre">Genre</label><input id="batch-genre" list="genre-list" value={genre} onChange={(event) => setGenre(event.target.value)} /></div>
      <div className="field"><label htmlFor="batch-mood">Mood</label><input id="batch-mood" list="mood-list" value={mood} onChange={(event) => setMood(event.target.value)} /></div>
      <div className="field"><label htmlFor="batch-producer">Producer name</label><input id="batch-producer" value={producer} onChange={(event) => setProducer(event.target.value)} /></div>
      <div className="field"><label htmlFor="batch-artist">Artist name</label><input id="batch-artist" value={artist} onChange={(event) => setArtist(event.target.value)} /></div>
      <div className="field"><label htmlFor="batch-tags">Add tags</label><input id="batch-tags" value={tags} onChange={(event) => setTags(event.target.value)} /></div>
      <div className="field"><label htmlFor="batch-copy">Copyright</label><input id="batch-copy" value={copyright} onChange={(event) => setCopyright(event.target.value)} /></div>
      <datalist id="genre-list">{BeatCatalog.genres.map((item) => <option key={item} value={item} />)}</datalist>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={props.onClose}>Cancel</button>
        <button className="btn btn-primary" type="button" onClick={() => {
          const patch: BatchPatch = {};
          if (status) patch.status = status as BatchPatch['status'];
          if (genre.trim()) patch.genre = genre.trim();
          if (mood.trim()) patch.mood = mood.trim();
          if (producer.trim()) patch.producer = producer.trim();
          if (artist.trim()) patch.artist = artist.trim();
          if (copyright.trim()) patch.copyright = copyright.trim();
          if (tags.trim()) patch.addTags = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
          props.onApply(patch);
        }}>Apply</button>
      </div>
    </Modal>
  );
}

export function ConfirmDialog(props: { title: string; body: string; confirm: string; danger?: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal title={props.title} onClose={props.onClose} initialFocus="#dialog-cancel">
      <p>{props.body}</p>
      <div className="modal-actions">
        <button id="dialog-cancel" className="btn" type="button" onClick={props.onClose}>Cancel</button>
        <button className={props.danger ? 'btn btn-danger' : 'btn btn-primary'} type="button" onClick={props.onConfirm}>{props.confirm}</button>
      </div>
    </Modal>
  );
}

export function CropDialog(props: { src: string; initialSize: 1500 | 3000; onClose: () => void; onUse: (bytes: Uint8Array, size: number) => void }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState<1500 | 3000>(props.initialSize);
  const frame = natural.w ? SquareCrop.frame(natural.w, natural.h, zoom, offset.x, offset.y) : null;
  const display = frame ? 360 / frame.side : 1;

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!drag.current || !frame) return;
      const dx = (event.clientX - drag.current.x) / display;
      const dy = (event.clientY - drag.current.y) / display;
      setOffset({ x: drag.current.ox - dx, y: drag.current.oy - dy });
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [display, frame]);

  return (
    <Modal title="Crop cover" onClose={props.onClose} wide>
      <div
        className="crop-stage"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
        }}
      >
        <img
          ref={imageRef}
          src={props.src}
          alt="Cover being cropped"
          draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            setNatural({ w: image.naturalWidth, h: image.naturalHeight });
            const side = Math.min(image.naturalWidth, image.naturalHeight);
            setOffset({ x: (image.naturalWidth - side) / 2, y: (image.naturalHeight - side) / 2 });
          }}
          style={frame ? { width: natural.w * display, height: natural.h * display, left: -frame.x * display, top: -frame.y * display } : undefined}
        />
      </div>
      <div className="field">
        <label htmlFor="crop-zoom">Zoom</label>
        <input id="crop-zoom" type="range" min={1} max={4} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
      </div>
      <div className="field">
        <label htmlFor="crop-size">Export size</label>
        <select id="crop-size" value={size} onChange={(event) => setSize(Number(event.target.value) === 1500 ? 1500 : 3000)}>
          <option value={1500}>1500×1500</option>
          <option value={3000}>3000×3000</option>
        </select>
      </div>
      {natural.w > 0 && Math.min(natural.w, natural.h) < 3000 && size === 3000 ? <p className="faint">{UserMessage.cropUpscale}</p> : null}
      <div className="modal-actions">
        <button className="btn" type="button" onClick={props.onClose}>Cancel</button>
        <button className="btn btn-primary" type="button" onClick={() => {
          const image = imageRef.current;
          if (!image || !frame) return;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          if (!context) return;
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(image, frame.x, frame.y, frame.side, frame.side, 0, 0, size, size);
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            props.onUse(new Uint8Array(await blob.arrayBuffer()), size);
          }, 'image/jpeg', 0.92);
        }}>Use cover</button>
      </div>
    </Modal>
  );
}

function Modal(props: { title: string; onClose: () => void; wide?: boolean; initialFocus?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    if (!root) return;
    const focusable = () =>
      [...root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
        (el) => !el.hasAttribute('disabled'),
      );
    const preferred = props.initialFocus ? root.querySelector<HTMLElement>(props.initialFocus) : null;
    (preferred || focusable()[0])?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      opener.current?.focus();
    };
  }, [props.initialFocus]);
  return (
    <div className="modal-back" onMouseDown={props.onClose}>
      <div
        ref={ref}
        className={props.wide ? 'modal wide' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{props.title}</h2>
        {props.children}
      </div>
    </div>
  );
}
