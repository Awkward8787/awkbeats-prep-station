import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { ImportResult } from '../src/core/library/Importer';
import type { AnalysisResult, BatchPatch, Beat, Settings, UserPatch } from '../src/core/library/types';

export type PrepApi = {
  list: () => Promise<Beat[]>;
  settings: () => Promise<Settings>;
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;
  importPaths: (paths: string[]) => Promise<ImportResult>;
  pickAudio: () => Promise<string[]>;
  pickFolder: () => Promise<string | null>;
  updateBeat: (id: string, patch: UserPatch) => Promise<{ beat: Beat } | { error: string }>;
  batchUpdate: (ids: string[], patch: BatchPatch) => Promise<Beat[]>;
  remove: (ids: string[]) => Promise<Beat[]>;
  analyze: (ids: string[]) => Promise<{ beats: Beat[]; needsDecode: string[]; errors: { id: string; message: string }[] }>;
  submitAnalysis: (id: string, analysis: AnalysisResult) => Promise<{ beat: Beat } | { error: string }>;
  readAudio: (id: string) => Promise<Uint8Array>;
  writeTags: (ids: string[]) => Promise<{ id: string; ok: boolean; message: string }[]>;
  saveArtwork: (id: string, bytes: Uint8Array, width: number, height: number) => Promise<Beat>;
  pickArtwork: () => Promise<{ name: string; bytes: Uint8Array } | null>;
  exportArtwork: (id: string) => Promise<string | null>;
  exportCsv: (ids: string[]) => Promise<string | null>;
  showInFolder: (id: string) => Promise<void>;
  openSite: () => Promise<void>;
  takeStartup: () => Promise<string[]>;
  pathsForFiles: (files: File[]) => string[];
  onMenu: (callback: (command: string) => void) => () => void;
  platform: NodeJS.Platform;
};

const prep: PrepApi = {
  list: () => ipcRenderer.invoke('library:list'),
  settings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:update', patch),
  importPaths: (paths: string[]) => ipcRenderer.invoke('library:import', paths),
  pickAudio: () => ipcRenderer.invoke('dialog:audio'),
  pickFolder: () => ipcRenderer.invoke('dialog:folder'),
  updateBeat: (id: string, patch: UserPatch) => ipcRenderer.invoke('beat:update', id, patch),
  batchUpdate: (ids: string[], patch: BatchPatch) => ipcRenderer.invoke('beat:batch', ids, patch),
  remove: (ids: string[]) => ipcRenderer.invoke('beat:remove', ids),
  analyze: (ids: string[]) => ipcRenderer.invoke('beat:analyze', ids),
  submitAnalysis: (id: string, analysis: AnalysisResult) => ipcRenderer.invoke('beat:analysis', id, analysis),
  readAudio: (id: string) => ipcRenderer.invoke('beat:audio', id),
  writeTags: (ids: string[]) => ipcRenderer.invoke('beat:write-tags', ids),
  saveArtwork: (id: string, bytes: Uint8Array, width: number, height: number) =>
    ipcRenderer.invoke('beat:artwork', id, bytes, width, height),
  pickArtwork: () => ipcRenderer.invoke('dialog:artwork'),
  exportArtwork: (id: string) => ipcRenderer.invoke('beat:export-artwork', id),
  exportCsv: (ids: string[]) => ipcRenderer.invoke('library:csv', ids),
  showInFolder: (id: string) => ipcRenderer.invoke('beat:reveal', id),
  openSite: () => ipcRenderer.invoke('app:site'),
  takeStartup: () => ipcRenderer.invoke('app:startup'),
  pathsForFiles: (files: File[]) => files.map((file) => webUtils.getPathForFile(file)).filter((item) => item.length > 0),
  onMenu: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, command: string) => callback(command);
    ipcRenderer.on('menu-command', listener);
    return () => {
      ipcRenderer.removeListener('menu-command', listener);
    };
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld('prep', prep);
