import { importDocText } from './docFile';
import { messages } from '../i18n';

/**
 * Receiving side of the Android share sheet: sw.js stashed the shared file in
 * the share cache and redirected here with ?shared-doc=1. Import it once and
 * clean up, so a reload never re-imports. Names must match sw.js.
 */
const SHARE_CACHE = 'gridstage-share';
const SHARED_DOC_KEY = 'shared-doc';

export async function consumeSharedDoc(): Promise<void> {
  if (!new URLSearchParams(window.location.search).has('shared-doc')) return;
  // Strip the marker first — a failed import must not retry on every reload.
  const clean = new URL(window.location.href);
  clean.searchParams.delete('shared-doc');
  window.history.replaceState(null, '', clean);
  if (!('caches' in window)) return;
  const cache = await caches.open(SHARE_CACHE);
  const stashed = await cache.match(SHARED_DOC_KEY);
  if (stashed === undefined) return;
  await cache.delete(SHARED_DOC_KEY);
  const text = await stashed.text();
  if (!importDocText(text)) window.alert(messages().library.importFailed);
}
