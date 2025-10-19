import { state } from './state/state';
import { fetchVocab } from './api/vocabApi';
import { renderWords } from './render/words';
import { showToast } from './ui/toast';
import { toggleAddForm, handleFormSubmit } from './ui/form';

/**
 * Initializes vocabulary data for the current lesson
 */
export async function initVocab(): Promise<void> {
  console.log('Lade Vokabeln für:', state.currentLesson);
  try {
    const data = await fetchVocab(state.currentLesson);
    state.vocab = data.sort(() => Math.random() - 0.5);
    renderWords();
    console.log('Geladene Vokabeln:', state.vocab.length);
  } catch (err) {
    console.error('Fehler beim Laden der Vokabeln:', err);
    showToast('❌ Fehler beim Laden der Vokabeln', 'error');
  }
}

export function switchLesson(): void {
  const selector = document.getElementById('lessonSelect') as HTMLSelectElement | null;
  if (selector) {
    state.currentLesson = selector.value as typeof state.currentLesson;
    initVocab();
  }
}

function setupDom(): void {
  const selector = document.getElementById('lessonSelect') as HTMLSelectElement | null;
  if (selector) selector.value = state.currentLesson;

  const form = document.getElementById('addForm');
  if (form) form.onsubmit = handleFormSubmit as any;

  const toggle = document.getElementById('addVocabToggle');
  if (toggle) toggle.onclick = toggleAddForm as any;

  const lessonSelect = document.getElementById('lessonSelect');
  if (lessonSelect) lessonSelect.addEventListener('change', switchLesson);
}

window.addEventListener('DOMContentLoaded', () => {
  setupDom();
  initVocab();
  // Listen for vocab additions from form module
  window.addEventListener('vocab:added', () => {
    initVocab();
  });
});
