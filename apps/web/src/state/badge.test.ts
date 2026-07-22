import { describe, expect, it } from 'vitest';
import { normalizeBadge } from './badge';

describe('normalizeBadge', () => {
  it('keeps up to four ASCII characters', () => {
    expect(normalizeBadge('AB')).toBe('AB');
    expect(normalizeBadge('LEAD')).toBe('LEAD');
    expect(normalizeBadge('LEADER')).toBe('LEAD');
  });

  it('keeps exactly one wide (CJK) character', () => {
    expect(normalizeBadge('舞')).toBe('舞');
    expect(normalizeBadge('舞者')).toBe('舞');
  });

  it('mixed wide + ASCII keeps only the first character', () => {
    expect(normalizeBadge('A中文')).toBe('A');
    expect(normalizeBadge('中A')).toBe('中');
  });

  it('trims and handles empty', () => {
    expect(normalizeBadge('  ')).toBe('');
    expect(normalizeBadge(' 7 ')).toBe('7');
  });

  it('does not split surrogate-pair characters', () => {
    expect(normalizeBadge('𝕏abc')).toBe('𝕏');
  });
});
