import type { DocState } from './store';

/**
 * Version snapshots — the local "time machine". Stored in IndexedDB as plain
 * DocState JSON; the backend's `version_snapshot` table (Yjs state bytea)
 * takes over once accounts/persistence exist.
 */

export interface SnapshotMeta {
  id: string;
  name: string;
  createdAt: string;
}

export interface Snapshot extends SnapshotMeta {
  doc: DocState;
}

const DB_NAME = 'gridstage-history';
const STORE = 'snapshots';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });
  } finally {
    db.close();
  }
}

export async function saveSnapshot(name: string, doc: DocState): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    doc,
  };
  await withStore('readwrite', (s) => s.put(snapshot));
  return snapshot;
}

/** Newest first. */
export async function listSnapshots(): Promise<Snapshot[]> {
  const all = await withStore<Snapshot[]>('readonly', (s) => s.getAll() as IDBRequest<Snapshot[]>);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteSnapshot(id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(id) as IDBRequest<undefined>);
}
