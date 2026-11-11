/** Counts word-like segments in Latin and CJK manuscripts, rather than whitespace alone. */
export function countManuscriptWords(text: string): number {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  let count = 0;
  for (const segment of segmenter.segment(text)) if (segment.isWordLike) count++;
  return count;
}
