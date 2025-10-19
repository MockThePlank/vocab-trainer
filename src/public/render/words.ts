import { VocabEntry, WordItem, PlacedWord, SelectedWord } from '../types';
import { state } from '../state/state';
import { overlaps } from './collisions';
import { showToast } from '../ui/toast';
import { startRandomSuccessAnimation } from '../animations/index';

function floatAround(el: HTMLElement): void {
  const amplitude = 2;
  const speed = 0.001 + Math.random() * 0.001;
  const offsetX = Math.random() * 1000;
  const offsetY = Math.random() * 1000;

  function animate(time: number): void {
    const dx = Math.sin(time * speed + offsetX) * amplitude;
    const dy = Math.cos(time * speed + offsetY) * amplitude;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

export function renderWords(): void {
  const germanContainer = document.getElementById('german');
  const englishContainer = document.getElementById('english');
  if (!germanContainer || !englishContainer) return;

  germanContainer.querySelectorAll('.word').forEach(w => w.remove());
  englishContainer.querySelectorAll('.word').forEach(w => w.remove());

  const germanWords: WordItem[] = [];
  const englishWords: WordItem[] = [];
  state.vocab.forEach(pair => {
    germanWords.push({ text: pair.de, lang: 'de' });
    englishWords.push({ text: pair.en, lang: 'en' });
  });

  germanWords.sort(() => Math.random() - 0.5);
  englishWords.sort(() => Math.random() - 0.5);

  const placedGerman: PlacedWord[] = [];
  const placedEnglish: PlacedWord[] = [];

  germanWords.forEach((item, index) => placeWord(item, index, germanContainer, placedGerman, germanWords.length));
  englishWords.forEach((item, index) => placeWord(item, index, englishContainer, placedEnglish, englishWords.length));
}

function placeWord(
  item: WordItem,
  index: number,
  container: HTMLElement,
  placed: PlacedWord[],
  totalCount: number
): void {
  const el = document.createElement('div');
  el.textContent = item.text;
  el.className = 'word';
  el.style.visibility = 'hidden';
  el.style.position = 'absolute';
  container.appendChild(el);

  const rect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const widthPercent = (rect.width / containerRect.width) * 100;
  const heightPercent = (rect.height / containerRect.height) * 100;

  let top: number;
  let left: number;
  let tries = 0;
  const maxTries = 200;
  let positioned = false;
  const headerHeight = 60;
  const containerHeight = containerRect.height;
  const headerHeightPercent = (headerHeight / containerHeight) * 100;
  const availableHeight = 95 - headerHeightPercent - heightPercent;

  do {
    top = headerHeightPercent + Math.random() * availableHeight;
    left = Math.random() * (95 - widthPercent);
    tries++;
    if (!overlaps(top, left, widthPercent, heightPercent, placed, 2)) {
      positioned = true; break;
    }
  } while (tries < maxTries);

  if (!positioned && tries >= maxTries) {
    tries = 0;
    do {
      top = headerHeightPercent + Math.random() * availableHeight;
      left = Math.random() * (95 - widthPercent);
      tries++;
      if (!overlaps(top, left, widthPercent, heightPercent, placed, 0.5)) {
        positioned = true; break;
      }
    } while (tries < 100);
  }

  if (!positioned) {
    const cols = Math.ceil(Math.sqrt(totalCount));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const availableGridHeight = 95 - headerHeightPercent;
    top = headerHeightPercent + (row * (availableGridHeight / Math.ceil(totalCount / cols))) + Math.random() * 2;
    left = (col * (95 / cols)) + Math.random() * 2;
  }

  el.style.top = `${top}%`;
  el.style.left = `${left}%`;
  el.style.visibility = 'visible';

  placed.push({ top, left, width: widthPercent, height: heightPercent });
  el.onclick = () => selectWord(item.lang, item.text, el);
  floatAround(el);
}

function selectWord(lang: 'de' | 'en', word: string, el: HTMLElement): void {
  if (el.classList.contains('solved')) return;
  if (lang === 'de') {
    if (state.selectedDe) state.selectedDe.el.classList.remove('selected');
    state.selectedDe = { word, el } as SelectedWord;
  } else {
    if (state.selectedEn) state.selectedEn.el.classList.remove('selected');
    state.selectedEn = { word, el } as SelectedWord;
  }
  el.classList.add('selected');
  if (state.selectedDe && state.selectedEn) checkPair();
}

function checkPair(): void {
  if (!state.selectedDe || !state.selectedEn) return;
  const correct = state.vocab.some(p => p.de === state.selectedDe!.word && p.en === state.selectedEn!.word);
  if (correct) {
    showToast('🎉 Super, gut gemacht!', 'success');
    startRandomSuccessAnimation();
    state.selectedDe.el.classList.remove('selected');
    state.selectedEn.el.classList.remove('selected');
    state.selectedDe.el.classList.add('solved');
    state.selectedEn.el.classList.add('solved');
  } else {
    showToast('❌ Das passt leider nicht.', 'error');
    state.selectedDe.el.classList.remove('selected');
    state.selectedEn.el.classList.remove('selected');
  }
  state.selectedDe = null;
  state.selectedEn = null;
}
