import type { DocState } from './store';

/**
 * Backup nudge — everything lives in this browser's localStorage/IndexedDB,
 * so "clear browsing data" deletes the user's work. Once a doc holds real
 * work, suggest exporting a .gridstage.json backup every so often.
 */

const KEY = 'gridstage-backup-nudge';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface NudgeState {
  lastExportAt?: string;
  snoozedUntil?: string;
}

function read(): NudgeState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? {} : (JSON.parse(raw) as NudgeState);
  } catch {
    return {};
  }
}

function write(state: NudgeState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/** Pure: does this doc hold enough work to be worth nagging about? */
export function hasRealWork(doc: Pick<DocState, 'performers' | 'formations'>): boolean {
  return doc.performers.length >= 3 || doc.formations.length >= 3;
}

/** Nudge when the doc has real work and no export/snooze within a week. */
export function shouldNudge(
  doc: Pick<DocState, 'performers' | 'formations'>,
  now: Date = new Date(),
): boolean {
  if (!hasRealWork(doc)) return false;
  const s = read();
  const t = now.getTime();
  if (s.snoozedUntil !== undefined && t < Date.parse(s.snoozedUntil)) return false;
  if (s.lastExportAt !== undefined && t - Date.parse(s.lastExportAt) < WEEK_MS) return false;
  return true;
}

/** Call after a successful choreography-file export. */
export function recordExport(now: Date = new Date()): void {
  write({ ...read(), lastExportAt: now.toISOString() });
}

/** "Later": stay quiet for a week. */
export function snooze(now: Date = new Date()): void {
  write({ ...read(), snoozedUntil: new Date(now.getTime() + WEEK_MS).toISOString() });
}
