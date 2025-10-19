import { VocabEntry, Lesson, SelectedWord } from '../types';

/**
 * Application state shared across modules
 */
export const state = {
  currentLesson: 'lesson01' as Lesson,
  vocab: [] as VocabEntry[],
  selectedDe: null as SelectedWord | null,
  selectedEn: null as SelectedWord | null,
};
