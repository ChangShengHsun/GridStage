import { beforeEach, describe, expect, it } from 'vitest';
import type { Performer } from '@gridstage/shared-types';
import { hasRealWork, recordExport, shouldNudge, snooze } from './backupNudge';

// Node has no localStorage; a Map-backed stub is enough for the nudge state.
const backing = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => void backing.set(k, v),
  removeItem: (k: string) => void backing.delete(k),
  clear: () => backing.clear(),
  key: (i: number) => [...backing.keys()][i] ?? null,
  get length() {
    return backing.size;
  },
} as Storage;

beforeEach(() => backing.clear());

const performer = (id: string): Performer => ({
  id,
  performanceId: 'perf',
  name: id,
  color: '#fff',
  role: '',
  avatarUrl: null,
});
const emptyDoc = { performers: [], formations: [] };
const busyDoc = { performers: [performer('a'), performer('b'), performer('c')], formations: [] };

describe('backup nudge', () => {
  it('stays quiet for docs without real work', () => {
    expect(hasRealWork(emptyDoc)).toBe(false);
    expect(shouldNudge(emptyDoc)).toBe(false);
  });

  it('nudges a busy doc that was never exported', () => {
    expect(shouldNudge(busyDoc)).toBe(true);
  });

  it('is quiet within a week of an export, nudges after', () => {
    const day0 = new Date('2026-07-17T00:00:00Z');
    recordExport(day0);
    expect(shouldNudge(busyDoc, new Date('2026-07-20T00:00:00Z'))).toBe(false);
    expect(shouldNudge(busyDoc, new Date('2026-07-25T00:00:01Z'))).toBe(true);
  });

  it('snooze quiets it for a week', () => {
    const day0 = new Date('2026-07-17T00:00:00Z');
    snooze(day0);
    expect(shouldNudge(busyDoc, new Date('2026-07-23T00:00:00Z'))).toBe(false);
    expect(shouldNudge(busyDoc, new Date('2026-07-24T00:00:01Z'))).toBe(true);
  });

  it('survives corrupted stored state', () => {
    backing.set('gridstage-backup-nudge', '{not json');
    expect(shouldNudge(busyDoc)).toBe(true);
  });
});
