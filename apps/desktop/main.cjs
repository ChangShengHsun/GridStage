const { app, BrowserWindow, dialog, protocol, net, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const RENDERER_DIR = path.join(__dirname, 'renderer');
const RELEASES_URL = 'https://github.com/ChangShengHsun/GridStage/releases/latest';

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
        title: 'GridStage',
        message: `New version ${info.version} is ready / 新版本 ${info.version} 已下載完成`,
      });
      if (choice === 0) autoUpdater.quitAndInstall();
    });
    autoUpdater.on('error', () => {}); // offline is fine — try again next launch
    autoUpdater.checkForUpdates().catch(() => {});
    return;
  }
  fetch('https://api.github.com/repos/ChangShengHsun/GridStage/releases/latest')
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
        title: 'GridStage',
        message: `Version ${latest} is available / 新版本 ${latest} 已發布`,
      });
      if (choice === 0) void shell.openExternal(RELEASES_URL);
    })
    .catch(() => {});
}

// Serve the built web app from a real origin (app://bundle) instead of
// file://. Chromium restricts localStorage / IndexedDB on file://, and
// GridStage keeps the whole document, audio, and version history there — a
// proper secure origin is required for any of that to persist.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/**
 * "Open with GridStage" (.gridstage file association, declared in
 * package.json build.fileAssociations). Windows/Linux pass the file path in
 * argv — of the launching process, or of the second instance a double-click
 * spawns while we run. macOS uses the open-file event instead.
 */
let mainWindow = null;
let pendingDocPath = null;

function docPathFromArgv(argv) {
  const found = argv.find((arg) => arg.endsWith('.gridstage') || arg.endsWith('.gridstage.json'));
  return found !== undefined && fs.existsSync(found) ? found : null;
}

function openDocPath(filePath) {
  if (filePath === null) return;
  if (mainWindow === null || mainWindow.webContents.isLoading()) {
    pendingDocPath = filePath; // delivered after did-finish-load
    return;
  }
  try {
    mainWindow.webContents.send('gridstage:open-doc', fs.readFileSync(filePath, 'utf8'));
  } catch {
    // Unreadable file — the renderer never hears about it; nothing to clean up.
  }
}

// Must be registered before app ready or the first open-file is lost.
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  openDocPath(filePath);
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}
app.on('second-instance', (_event, argv) => {
  if (mainWindow !== null) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  openDocPath(docPathFromArgv(argv));
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#191512',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  // Any external link opens in the system browser, never inside the app frame.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('did-finish-load', () => {
    const queued = pendingDocPath;
    pendingDocPath = null;
    openDocPath(queued);
  });
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });
  void win.loadURL('app://bundle/index.html');
  mainWindow = win;
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return; // this instance is quitting
  // Windows/Linux put a double-clicked file's path in the launch argv.
  openDocPath(docPathFromArgv(process.argv));
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
