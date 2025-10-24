import { state } from './state/state';
import { fetchVocab } from './api/vocabApi';
import { renderWords } from './render/words';
import { showToast } from './ui/toast';
import { toggleAddForm, toggleAddLessonForm, handleFormSubmit, handleLessonFormSubmit } from './ui/form';

interface Lesson {
  slug: string;
  title?: string;
  entry_count: number;
}

/**
 * Fetches available lessons from the API and populates the lesson selector
 */
async function fetchLessonsAndPopulate(): Promise<void> {
  try {
    const response = await fetch('/api/lessons');
    if (!response.ok) {
      console.error('Failed to fetch lessons');
      return;
    }

    const lessons: Lesson[] = await response.json();
    const selector = document.getElementById('lessonSelect') as HTMLSelectElement | null;
    
    if (!selector) return;

    // Store current selection
    const currentSelection = selector.value;

    // Clear and repopulate
    selector.innerHTML = '';
    
    lessons.forEach(lesson => {
      const option = document.createElement('option');
      option.value = lesson.slug;
      option.textContent = lesson.title || lesson.slug;
      selector.appendChild(option);
    });

    // Restore selection or select first lesson
    if (lessons.find(l => l.slug === currentSelection)) {
      selector.value = currentSelection;
    } else if (lessons.length > 0) {
      selector.value = lessons[0].slug;
      state.currentLesson = lessons[0].slug as typeof state.currentLesson;
    }
  } catch (err) {
    console.error('Error fetching lessons:', err);
    showToast('❌ Fehler beim Laden der Lektionen', 'error');
  }
}

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

  const lessonForm = document.getElementById('addLessonForm');
  if (lessonForm) lessonForm.onsubmit = handleLessonFormSubmit as any;

  const toggle = document.getElementById('addVocabToggle');
  if (toggle) toggle.onclick = toggleAddForm as any;

  const lessonToggle = document.getElementById('addLessonToggle');
  if (lessonToggle) lessonToggle.onclick = toggleAddLessonForm as any;

  const lessonSelect = document.getElementById('lessonSelect');
  if (lessonSelect) lessonSelect.addEventListener('change', switchLesson);
}

window.addEventListener('DOMContentLoaded', async () => {
  setupDom();
  await fetchLessonsAndPopulate();
  await initVocab();
  
  // Listen for vocab additions from form module
  window.addEventListener('vocab:added', () => {
    initVocab();
  });

  // Listen for lesson additions
  window.addEventListener('lesson:added', async (e: Event) => {
    const customEvent = e as CustomEvent;
    await fetchLessonsAndPopulate();
    
    // Switch to the new lesson if provided
    if (customEvent.detail && customEvent.detail.slug) {
      const selector = document.getElementById('lessonSelect') as HTMLSelectElement | null;
      if (selector) {
        selector.value = customEvent.detail.slug;
        state.currentLesson = customEvent.detail.slug;
        await initVocab();
      }
    }
  });
});
