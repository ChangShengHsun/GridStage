import { importDocText } from './docFile';
import { messages } from '../i18n';

declare global {
  interface Window {
    /** Injected by the Electron preload (apps/desktop/preload.cjs). */
    gridstageDesktop?: { onOpenDoc: (cb: (text: string) => void) => void };
  }
}

/**
 * Desktop "open with": double-clicking a .gridstage file launches (or
 * focuses) the app; the Electron main process reads the file and sends its
 * text here. No-op in browsers — the bridge only exists under Electron.
 */
export function listenDesktopOpenDoc(): void {
  window.gridstageDesktop?.onOpenDoc((text) => {
    if (!importDocText(text)) window.alert(messages().library.importFailed);
  });
}
