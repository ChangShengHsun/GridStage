const { contextBridge, ipcRenderer } = require('electron');

// Minimal bridge for "open with GridStage": the main process reads the
// double-clicked .gridstage file and pushes its text to the renderer, which
// runs the normal import (apps/web/src/state/desktopOpen.ts).
contextBridge.exposeInMainWorld('gridstageDesktop', {
  onOpenDoc: (callback) => {
    ipcRenderer.on('gridstage:open-doc', (_event, text) => callback(text));
  },
});
