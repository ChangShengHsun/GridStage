const { app, BrowserWindow, dialog, protocol, net, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const RENDERER_DIR = path.join(__dirname, 'renderer');
const RELEASES_URL = 'https://github.com/ChangShengHsun/OpenStage/releases/latest';

/** True when b is a strictly newer semver than a (e.g. '0.2.1' > '0.2.0'). */
function isNewerVersion(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (db !== da) return db > da;
  }
  return false;
}

/**
 * Version updates, checked once on launch against GitHub Releases.
 * - Windows (NSIS): electron-updater downloads in the background and offers
 *   a restart — works for unsigned builds.
 * - macOS: unsigned builds cannot self-update (Squirrel.Mac requires code
 *   signing), so we just offer the download page for the new version.
 */
function setupAutoUpdate() {
  if (!app.isPackaged) return;
  if (process.platform === 'win32') {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.on('update-downloaded', (info) => {
      const choice = dialog.showMessageBoxSync({
        type: 'info',
        buttons: ['Restart & update / 重啟並更新', 'Later / 稍後'],
        defaultId: 0,
        cancelId: 1,
        title: 'OpenStage',
        message: `New version ${info.version} is ready / 新版本 ${info.version} 已下載完成`,
      });
      if (choice === 0) autoUpdater.quitAndInstall();
    });
    autoUpdater.on('error', () => {}); // offline is fine — try again next launch
    autoUpdater.checkForUpdates().catch(() => {});
    return;
  }
  fetch('https://api.github.com/repos/ChangShengHsun/OpenStage/releases/latest')
    .then((res) => (res.ok ? res.json() : null))
    .then((release) => {
      const latest =
        release !== null && typeof release.tag_name === 'string'
          ? release.tag_name.replace(/^v/, '')
          : null;
      if (latest === null || !isNewerVersion(app.getVersion(), latest)) return;
      const choice = dialog.showMessageBoxSync({
        type: 'info',
        buttons: ['Download / 前往下載', 'Later / 稍後'],
        defaultId: 0,
        cancelId: 1,
        title: 'OpenStage',
        message: `Version ${latest} is available / 新版本 ${latest} 已發布`,
      });
      if (choice === 0) void shell.openExternal(RELEASES_URL);
    })
    .catch(() => {});
}

// Serve the built web app from a real origin (app://bundle) instead of
// file://. Chromium restricts localStorage / IndexedDB on file://, and
// OpenStage keeps the whole document, audio, and version history there — a
// proper secure origin is required for any of that to persist.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#191512',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  });
  // Any external link opens in the system browser, never inside the app frame.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  void win.loadURL('app://bundle/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
    const filePath = path.join(RENDERER_DIR, rel);
    // Contain path traversal to the bundled renderer.
    if (filePath !== RENDERER_DIR && !filePath.startsWith(RENDERER_DIR + path.sep)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
  createWindow();
  setupAutoUpdate();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
