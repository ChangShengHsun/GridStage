import { beforeEach, describe, expect, it } from 'vitest';
import { migrateLocalStorage } from './brandMigration';

// Node has no localStorage; this Map-backed stub supports key(i)/length, which
// the migration needs to enumerate every openstage-* key.
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

describe('migrateLocalStorage', () => {
  it('copies every openstage-* key to gridstage-*', () => {
    backing.set('openstage-doc', '{"a":1}');
    backing.set('openstage-doc:perf123', '{"b":2}');
    backing.set('openstage-layout', '{"uiMode":"expert"}');
    backing.set('unrelated-key', 'leave me');

    migrateLocalStorage();

    expect(backing.get('gridstage-doc')).toBe('{"a":1}');
    expect(backing.get('gridstage-doc:perf123')).toBe('{"b":2}');
    expect(backing.get('gridstage-layout')).toBe('{"uiMode":"expert"}');
    // Non-branded keys and the originals are untouched.
    expect(backing.get('unrelated-key')).toBe('leave me');
    expect(backing.get('openstage-doc')).toBe('{"a":1}');
  });

  it('never overwrites an existing gridstage-* value', () => {
    backing.set('openstage-doc', 'old');
    backing.set('gridstage-doc', 'new'); // already migrated / edited since

    migrateLocalStorage();

    expect(backing.get('gridstage-doc')).toBe('new');
  });

  it('is a no-op when there is nothing to migrate', () => {
    backing.set('gridstage-doc', 'x');
    migrateLocalStorage();
    expect(backing.size).toBe(1);
  });
});
