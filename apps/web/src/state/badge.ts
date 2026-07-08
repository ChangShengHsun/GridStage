/**
 * Performer badge normalization: the badge must fit inside the mark circle,
 * so it is either ONE wide (CJK/fullwidth) character or up to FOUR ASCII
 * characters. Mixed input keeps just the first character.
 */
export function normalizeBadge(raw: string): string {
  const chars = Array.from(raw.trim()); // code points, so surrogate pairs survive
  if (chars.length === 0) return '';
  const hasWide = chars.some((c) => (c.codePointAt(0) ?? 0) > 0xff);
  if (hasWide) return chars[0] ?? '';
  return chars.slice(0, 4).join('');
}
