import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, protocol, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { ByteRange } from '../src/core/audio/ByteRange';
import { PcmDecoder } from '../src/core/audio/PcmDecoder';
import { TrackAnalyzer } from '../src/core/analysis/TrackAnalyzer';
import { AudioFiles } from '../src/core/library/AudioFiles';
import { CsvExport } from '../src/core/library/CsvExport';
import { Importer } from '../src/core/library/Importer';
import { Theme } from '../src/core/brand/Theme';
import { LibraryStore } from '../src/core/library/LibraryStore';
import type { AnalysisResult, BatchPatch, Settings, UserPatch } from '../src/core/library/types';
import { TagCommit } from '../src/core/tags/TagCommit';
import { TagWriter } from '../src/core/tags/TagWriter';

const SITE = 'https://awkbeats.com';

function brandLogoPath(): string {
  const unpacked = path.join(process.resourcesPath, 'logo.png');
  if (app.isPackaged && fs.existsSync(unpacked)) return unpacked;
  return path.join(app.getAppPath(), 'build', 'logo.png');
}

function appIconPath(): string {
  return path.join(app.getAppPath(), 'build', 'icon.png');
}

if (process.env.AWKBEATS_USER_DATA) {
  app.setPath('userData', process.env.AWKBEATS_USER_DATA);
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'beat',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
  },
]);

let store: LibraryStore;
let mainWindow: BrowserWindow | null = null;
let startupDecode: string[] = [];
let cancelImport = false;

function version(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8')) as { version?: string };
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function fail(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function importArg(): string | null {
  const index = process.argv.indexOf('--import');
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

async function createWindow(): Promise<void> {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: Theme.bg,
    title: 'AwkBeats Prep Station',
    icon: appIconPath(),
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (devUrl && url.startsWith(devUrl)) return;
    if (url.startsWith('file:')) return;
    event.preventDefault();
  });
  if (devUrl) await mainWindow.loadURL(devUrl);
  else await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

function sendMenu(command: string): void {
  mainWindow?.webContents.send('menu-command', command);
}

function buildMenu(): void {
  const mac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(mac
      ? [{
          label: 'AwkBeats Prep Station',
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { label: 'Settings', accelerator: 'CommandOrControl+,', click: () => sendMenu('settings') },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'Import Files…', accelerator: 'CommandOrControl+I', click: () => sendMenu('import-files') },
        { label: 'Import Folder…', accelerator: 'CommandOrControl+Shift+I', click: () => sendMenu('import-folder') },
        { label: 'Export Catalog CSV…', accelerator: 'CommandOrControl+E', click: () => sendMenu('export-csv') },
        { type: 'separator' },
        ...(mac ? [] : [{ label: 'Settings', accelerator: 'CommandOrControl+,', click: () => sendMenu('settings') }]),
        ...(mac ? [] : [{ role: 'quit' as const }]),
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    {
      label: 'Library',
      submenu: [
        { label: 'Analyze', accelerator: 'CommandOrControl+Enter', click: () => sendMenu('analyze') },
        { label: 'Write Tags to File', accelerator: 'CommandOrControl+S', click: () => sendMenu('write-tags') },
        { label: 'Remove from Library', accelerator: 'CommandOrControl+Backspace', click: () => sendMenu('remove') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Keyboard Shortcuts', accelerator: 'CommandOrControl+/', click: () => sendMenu('shortcuts') },
        {
          label: 'AwkBeats.com',
          click: () => void shell.openExternal(SITE),
        },
        ...(mac
          ? []
          : [{
              label: 'About AwkBeats Prep Station',
              click: () => {
                void dialog.showMessageBox({
                  type: 'info',
                  title: 'About AwkBeats Prep Station',
                  message: 'AwkBeats Prep Station',
                  detail: `Version ${version()}\nTag, analyze, and catalog your beats.\nPowered by AwkBeats · awkbeats.com\n\nKey and tempo are measured on this computer. Nothing is uploaded.`,
                  buttons: ['OK'],
                  defaultId: 0,
                  icon: nativeImage.createFromPath(brandLogoPath()),
                });
              },
            }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.setName('AwkBeats Prep Station');

app.whenReady().then(async () => {
  app.setAboutPanelOptions({
    applicationName: 'AwkBeats Prep Station',
    applicationVersion: version(),
    version: version(),
    copyright: `© ${new Date().getFullYear()} AwkBeats Prep Station`,
    credits: 'Powered by AwkBeats',
    iconPath: brandLogoPath(),
  });
  store = new LibraryStore(app.getPath('userData'));
  protocol.handle('beat', (request) => {
    const url = new URL(request.url);
    const id = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const beat = store.get(id);
    if (!beat) return new Response('Missing', { status: 404 });
    if (url.hostname === 'audio') {
      if (beat.missing) return new Response('Missing file', { status: 404 });
      return serveAudio(request, beat.filePath);
    }
    if (url.hostname === 'cover') {
      const cover = store.artworkPath(id);
      if (!cover) return new Response('No cover', { status: 404 });
      return netFetch(cover);
    }
    return new Response('Unknown', { status: 404 });
  });

  const initial = importArg();
  if (initial) {
    const result = await Importer.importPaths(store, [initial]);
    startupDecode = result.needsDecode;
  }

  registerIpc();
  buildMenu();
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function netFetch(filePath: string): Promise<Response> {
  return net.fetch(pathToFileURL(filePath).toString());
}

function audioType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.aiff' || ext === '.aif') return 'audio/aiff';
  if (ext === '.flac') return 'audio/flac';
  return 'audio/wav';
}

function serveAudio(request: Request, filePath: string): Response {
  let size = 0;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    return new Response('Missing file', { status: 404 });
  }
  const type = audioType(filePath);
  const resolved = ByteRange.resolve(request.headers.get('range'), size);
  if (resolved.kind === 'invalid') {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  const start = resolved.kind === 'partial' ? resolved.span.start : 0;
  const end = resolved.kind === 'partial' ? resolved.span.end : size - 1;
  const node = fs.createReadStream(filePath, { start, end });
  request.signal.addEventListener('abort', () => node.destroy());
  const headers: Record<string, string> = {
    'Content-Type': type,
    'Content-Length': String(end - start + 1),
    'Accept-Ranges': 'bytes',
  };
  if (resolved.kind === 'partial') headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  return new Response(Readable.toWeb(node) as ReadableStream, {
    status: resolved.kind === 'partial' ? 206 : 200,
    headers,
  });
}

function registerIpc(): void {
  ipcMain.handle('library:list', () => store.list());
  ipcMain.handle('settings:get', () => store.getSettings());
  ipcMain.handle('settings:update', (_event, patch: Partial<Settings>) => store.updateSettings(patch || {}));
  ipcMain.handle('app:startup', () => {
    const ids = startupDecode;
    startupDecode = [];
    return ids;
  });
  ipcMain.handle('app:site', () => shell.openExternal(SITE));
  ipcMain.handle('library:cancel-import', () => {
    cancelImport = true;
  });
  ipcMain.handle('library:import', async (event, paths: string[]) => {
    cancelImport = false;
    if (!Array.isArray(paths)) {
      return { imported: [], duplicates: 0, failed: [], needsDecode: [], decodeAt: [], unanalyzed: [], cancelled: false };
    }
    return Importer.importPaths(store, paths.filter((item) => typeof item === 'string'), (tick) => {
      if (!event.sender.isDestroyed()) event.sender.send('import-progress', tick);
    }, () => cancelImport);
  });
  ipcMain.handle('library:collect', async (_event, paths: string[]) => {
    if (!Array.isArray(paths)) return [];
    return AudioFiles.collect(paths.filter((item) => typeof item === 'string'));
  });
  ipcMain.handle('dialog:audio', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import beats',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'aiff', 'aif', 'flac'] }],
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('dialog:folder', async () => {
    const result = await dialog.showOpenDialog({ title: 'Import a folder of beats', properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0] || null;
  });
  ipcMain.handle('dialog:artwork', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose cover art',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const bytes = await fs.promises.readFile(result.filePaths[0]);
    return { name: path.basename(result.filePaths[0]), bytes };
  });
  ipcMain.handle('beat:update', (_event, id: string, patch: UserPatch) => {
    try {
      return { beat: store.update(id, patch) };
    } catch (error) {
      return { error: fail(error) };
    }
  });
  ipcMain.handle('beat:restore-title', (_event, id: string, title: string, tagsDirty: boolean) => {
    try {
      return { beat: store.restoreTitle(id, String(title ?? ''), tagsDirty === true) };
    } catch (error) {
      return { error: fail(error) };
    }
  });
  ipcMain.handle('beat:batch', (_event, ids: string[], patch: BatchPatch) => store.batchUpdate(ids, patch));
  ipcMain.handle('beat:remove', (_event, ids: string[]) => {
    store.remove(ids);
    return store.list();
  });
  ipcMain.handle('beat:analyze', async (_event, ids: string[]) => {
    const needsDecode: string[] = [];
    const errors: { id: string; message: string }[] = [];
    for (const id of ids) {
      const beat = store.get(id);
      if (!beat || beat.missing) continue;
      if (beat.format !== 'wav' && beat.format !== 'aiff') {
        needsDecode.push(id);
        continue;
      }
      try {
        const decoded = PcmDecoder.decode(new Uint8Array(fs.readFileSync(beat.filePath)));
        store.applyAnalysis(id, TrackAnalyzer.analyze(decoded.samples, decoded.sampleRate));
      } catch (error) {
        errors.push({ id, message: fail(error) });
      }
    }
    return { beats: store.list(), needsDecode, errors };
  });
  ipcMain.handle('beat:analysis', (_event, id: string, analysis: AnalysisResult) => {
    try {
      return { beat: store.applyAnalysis(id, analysis) };
    } catch (error) {
      return { error: fail(error) };
    }
  });
  ipcMain.handle('beat:audio', (_event, id: string) => {
    const beat = store.get(id);
    if (!beat || beat.missing) throw new Error('This file is missing from disk.');
    return fs.readFileSync(beat.filePath);
  });
  ipcMain.handle('beat:write-tags', (_event, ids: string[]) => {
    const settings = store.getSettings();
    const results: { id: string; ok: boolean; message: string }[] = [];
    for (const id of ids) {
      const beat = store.get(id);
      if (!beat) continue;
      if (beat.missing) {
        results.push({ id, ok: false, message: 'This file is missing from disk.' });
        continue;
      }
      try {
        TagWriter.write(beat.filePath, beat.format, TagCommit.fromBeat(beat, settings, store));
        store.clearTagsDirty(id);
        results.push({ id, ok: true, message: `Tags written to ${beat.fileName}` });
      } catch {
        results.push({ id, ok: false, message: 'Tags could not be written. The file may be open in another app or read-only.' });
      }
    }
    return results;
  });
  ipcMain.handle('beat:artwork', (_event, id: string, bytes: Uint8Array, width: number, height: number) => {
    const buffer = Buffer.from(bytes);
    return store.setArtwork(id, buffer, width, height);
  });
  ipcMain.handle('beat:export-artwork', async (_event, id: string) => {
    const cover = store.artworkPath(id);
    const beat = store.get(id);
    if (!cover || !beat) return null;
    const result = await dialog.showSaveDialog({
      title: 'Export cover',
      defaultPath: `${beat.title || 'cover'}-${beat.artworkWidth || 3000}.jpg`,
      filters: [{ name: 'JPEG', extensions: ['jpg'] }],
    });
    if (result.canceled || !result.filePath) return null;
    await fs.promises.copyFile(cover, result.filePath);
    return result.filePath;
  });
  ipcMain.handle('library:csv', async (_event, ids: string[]) => {
    const all = store.list();
    const beats = ids?.length ? all.filter((beat) => ids.includes(beat.id)) : all;
    const result = await dialog.showSaveDialog({
      title: 'Export catalog',
      defaultPath: 'awkbeats-catalog.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (result.canceled || !result.filePath) return null;
    await fs.promises.writeFile(result.filePath, CsvExport.render(beats), 'utf8');
    return result.filePath;
  });
  ipcMain.handle('beat:reveal', (_event, id: string) => {
    const beat = store.get(id);
    if (beat && !beat.missing) shell.showItemInFolder(beat.filePath);
  });
}
