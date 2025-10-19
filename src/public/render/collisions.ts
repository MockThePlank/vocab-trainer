import { PlacedWord } from '../types';

/**
 * Checks if a word position overlaps with already placed words
 */
export function overlaps(
  top: number,
  left: number,
  width: number,
  height: number,
  placed: PlacedWord[],
  buffer = 2
): boolean {
  return placed.some(p => {
    const noOverlapX = (left + width + buffer < p.left) || (p.left + p.width + buffer < left);
    const noOverlapY = (top + height + buffer < p.top) || (p.top + p.height + buffer < top);
    return !(noOverlapX || noOverlapY);
  });
}
