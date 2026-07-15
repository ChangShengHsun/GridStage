/**
 * One-time rebrand data migration: OpenStage → GridStage.
 *
 * The app's persistence keys were renamed from `openstage-*` to `gridstage-*`.
 * This copies any existing local data (documents, library, prefs, audio,
 * backgrounds, version history) from the old names to the new ones so nothing
 * a user already saved is lost. Idempotent — only copies when the target is
 * missing — so it is safe to run on every launch.
 *
 * ponytail: delete this module once no browser is expected to still hold
 * `openstage-*` data (there are no external users yet — it exists purely to
 * preserve local dev/test documents across the rename).
 */

const OLD = 'openstage-';
const NEW = 'gridstage-';

/** Copy every `openstage-*` localStorage key to `gridstage-*` if absent. */
export function migrateLocalStorage(): void {
  if (typeof localStorage === 'undefined') return;
  const oldKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== null && key.startsWith(OLD)) oldKeys.push(key);
  }
  for (const key of oldKeys) {
    const newKey = NEW + key.slice(OLD.length);
    if (localStorage.getItem(newKey) !== null) continue;
    const value = localStorage.getItem(key);
    if (value !== null) localStorage.setItem(newKey, value);
  }
}

interface DbSpec {
  old: string;
  next: string;
  store: string;
  /** `null` = out-of-line keys (blobStore); a string = in-line keyPath. */
  keyPath: string | null;
}

const DBS: DbSpec[] = [
  { old: 'openstage-media', next: 'gridstage-media', store: 'blobs', keyPath: null },
  { old: 'openstage-history', next: 'gridstage-history', store: 'snapshots', keyPath: 'id' },
];

function openDb(name: string, store: string, keyPath: string | null): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(store, keyPath === null ? undefined : { keyPath });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

async function copyDb(spec: DbSpec): Promise<void> {
  // Probe first so we never create an empty old DB as a side effect of
  // opening it, and skip work once the target already exists.
  if (typeof indexedDB.databases === 'function') {
    const names = (await indexedDB.databases()).map((d) => d.name);
    if (!names.includes(spec.old) || names.includes(spec.next)) return;
  }
  const oldDb = await openDb(spec.old, spec.store, spec.keyPath);
  const [keys, values] = await new Promise<[IDBValidKey[], unknown[]]>((resolve, reject) => {
    const tx = oldDb.transaction(spec.store, 'readonly');
    const os = tx.objectStore(spec.store);
    const keyReq = os.getAllKeys();
    const valReq = os.getAll();
    tx.oncomplete = () => resolve([keyReq.result, valReq.result]);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
  });
  oldDb.close();
  if (values.length === 0) return;
  const newDb = await openDb(spec.next, spec.store, spec.keyPath);
  await new Promise<void>((resolve, reject) => {
    const tx = newDb.transaction(spec.store, 'readwrite');
    const os = tx.objectStore(spec.store);
    values.forEach((value, i) => {
      if (spec.keyPath === null) os.put(value, keys[i]);
      else os.put(value);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
  newDb.close();
}

/** Copy the pre-rebrand IndexedDB databases. Failures never block startup. */
export async function migrateMediaDatabases(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  for (const spec of DBS) {
    try {
      await copyDb(spec);
    } catch {
      // Old data stays intact; a later launch can retry.
    }
  }
}

// Runs at import so localStorage is migrated before any zustand-persist store
// hydrates — this module must therefore be imported first in main.tsx.
migrateLocalStorage();
