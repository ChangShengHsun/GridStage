// Imported first: its top-level side effect migrates openstage-* localStorage
// keys to gridstage-* before any zustand-persist store hydrates below.
import { migrateMediaDatabases } from './state/brandMigration';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/instrument-sans';
import '@fontsource/ibm-plex-mono/400.css';
import './index.css';
import { App } from './App';

const rootEl = document.getElementById('root');
if (rootEl === null) {
  throw new Error('Root element #root not found');
}

// Copy pre-rebrand IndexedDB data (audio, backgrounds, history) before the app
// reads it, then render regardless of whether the migration succeeded.
void migrateMediaDatabases().finally(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

// PWA: offline app shell + installability. Production only — a service
// worker on the dev server would serve stale modules mid-edit.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
