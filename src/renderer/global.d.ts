import type { PrepApi } from '../../electron/preload';

declare global {
  interface Window {
    prep: PrepApi;
  }
}

export {};
