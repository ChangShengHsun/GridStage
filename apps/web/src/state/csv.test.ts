import { describe, expect, it } from 'vitest';
import { parseRoster } from './csv';

describe('parseRoster', () => {
  it('parses plain name-only lines', () => {
    expect(parseRoster('Alice\nBob\n')).toEqual([
      { name: 'Alice', role: '', color: null },
      { name: 'Bob', role: '', color: null },
    ]);
  });

  it('parses name,role,color and normalizes the color', () => {
    const rows = parseRoster('Alice,captain,#E8843C\nBob,flyer,5b8ff0');
    expect(rows).toEqual([
      { name: 'Alice', role: 'captain', color: '#e8843c' },
      { name: 'Bob', role: 'flyer', color: '#5b8ff0' },
    ]);
  });

  it('skips a header row', () => {
    const rows = parseRoster('Name,Role,Color\nAlice,captain,\n');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Alice');
  });

  it('handles quoted fields with commas and escaped quotes', () => {
    const rows = parseRoster('"Doe, Jane",lead,\n"Say ""hi""",backup,');
    expect(rows[0]?.name).toBe('Doe, Jane');
    expect(rows[1]?.name).toBe('Say "hi"');
  });

  it('ignores blank lines, invalid colors, and empty names', () => {
    const rows = parseRoster('\nAlice,,not-a-color\n,orphanrole,\n\r\nBob\n');
    expect(rows).toEqual([
      { name: 'Alice', role: '', color: null },
      { name: 'Bob', role: '', color: null },
    ]);
  });

  it('handles CRLF files (Excel on Windows)', () => {
    expect(parseRoster('Alice\r\nBob\r\n')).toHaveLength(2);
  });

  it('returns empty for empty input', () => {
    expect(parseRoster('')).toEqual([]);
    expect(parseRoster('name,role,color')).toEqual([]);
  });

  it('rejects binary garbage (e.g. a WAV picked by mistake)', () => {
    const binary = 'RIFF\x00\x01WAVEfmt \x10\x00\x00\x00\x01\nAlice\nBob\x03\x1b\x07junk';
    const rows = parseRoster(binary);
    // Only the clean text line survives.
    expect(rows).toEqual([{ name: 'Alice', role: '', color: null }]);
  });
});
