/** Performance title -> safe download filename ('' falls back to 'openstage'). */
export function safeFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned === '' ? 'openstage' : cleaned.toLowerCase();
}
