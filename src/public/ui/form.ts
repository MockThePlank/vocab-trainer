import { state } from '../state/state';
import { showToast } from './toast';
import { postVocab } from '../api/vocabApi';

/** Toggle the add vocabulary form visibility */
export function toggleAddForm(): void {
  const form = document.getElementById('addForm');
  const toggle = document.getElementById('addVocabToggle');
  if (!form || !toggle) return;

  if (form.classList.contains('form-hidden')) {
    form.classList.remove('form-hidden');
    form.classList.add('form-visible');
    (toggle as HTMLElement).style.background = '#00aaff';
    (toggle as HTMLElement).style.color = 'white';
    (toggle as HTMLElement).style.borderColor = '#0088cc';
  } else {
    form.classList.remove('form-visible');
    form.classList.add('form-hidden');
    (toggle as HTMLElement).style.background = '#f0f9ff';
    (toggle as HTMLElement).style.color = 'inherit';
    (toggle as HTMLElement).style.borderColor = '#a3d3ff';
  }
}

/** Handle add vocab form submit */
export async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const deInput = document.getElementById('de') as HTMLInputElement | null;
  const enInput = document.getElementById('en') as HTMLInputElement | null;
  if (!deInput || !enInput) return;

  const de = deInput.value.trim();
  const en = enInput.value.trim();

  if (!de || !en) {
    showToast('❌ Bitte beide Felder ausfüllen.', 'error');
    return;
  }
  if (de.length > 60) {
    showToast('❌ Das deutsche Wort darf maximal 60 Zeichen lang sein.', 'error');
    return;
  }
  if (en.length > 60) {
    showToast('❌ Das englische Wort darf maximal 60 Zeichen lang sein.', 'error');
    return;
  }

  try {
    const msg = await postVocab(state.currentLesson, de, en);
    if (msg.success) {
      showToast('✅ Neues Vokabelpaar gespeichert!', 'success');
      deInput.value = '';
      enInput.value = '';
      // Notify app that a new vocab was added so the main module can refresh
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('vocab:added'));
      }, 1500);
    } else {
      showToast('⚠️ ' + msg.error, 'error');
    }
  } catch (err) {
    console.error('Fehler beim Hinzufügen:', err);
    showToast('❌ Fehler beim Speichern', 'error');
  }
}
