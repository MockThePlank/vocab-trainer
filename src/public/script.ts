/**
 * @fileoverview Frontend script for the vocabulary trainer
 * Handles drag-and-drop vocabulary matching, animations, and form submissions
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

interface VocabEntry {
  id: number;
  lesson: string;
  de: string;
  en: string;
  created_at?: string;
}

interface WordItem {
  text: string;
  lang: 'de' | 'en';
}

interface PlacedWord {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SelectedWord {
  word: string;
  el: HTMLElement;
}

interface Balloon {
  x: number;
  y: number;
  r: number;
  c: string;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
}

interface Rocket {
  x: number;
  y: number;
  speed: number;
  trail: { x: number; y: number }[];
}

interface Sparkle {
  x: number;
  y: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

type Lesson = 'lesson01' | 'lesson02' | 'lesson03' | 'lesson04';
type ToastType = 'success' | 'error' | 'info';

// ============================================================================
// State
// ============================================================================

let selectedDe: SelectedWord | null = null;
let selectedEn: SelectedWord | null = null;
let vocab: VocabEntry[] = [];
let currentLesson: Lesson = 'lesson01';

// ============================================================================
// Initialization and Lesson Management
// ============================================================================

/**
 * Initializes vocabulary data for the current lesson
 * Fetches data from API and renders words on screen
 */
async function initVocab(): Promise<void> {
  console.log('Lade Vokabeln für:', currentLesson);
  
  try {
    const res = await fetch(`/api/vocab/${currentLesson}`);
    vocab = await res.json();
    console.log('Geladene Vokabeln:', vocab.length);
    
    // Shuffle all vocabulary
    vocab = vocab.sort(() => Math.random() - 0.5);
    renderWords();
  } catch (error) {
    console.error('Fehler beim Laden der Vokabeln:', error);
    showToast('❌ Fehler beim Laden der Vokabeln', 'error');
  }
}

/**
 * Switches to a different lesson
 * Called when user selects a different lesson from dropdown
 */
function switchLesson(): void {
  const selector = document.getElementById('lessonSelect') as HTMLSelectElement;
  if (selector) {
    currentLesson = selector.value as Lesson;
    initVocab();
  }
}

// ============================================================================
// Word Rendering and Positioning
// ============================================================================

/**
 * Renders words in their respective containers
 * Separates German and English words, shuffles them, and places them on screen
 */
function renderWords(): void {
  const germanContainer = document.getElementById('german');
  const englishContainer = document.getElementById('english');
  
  if (!germanContainer || !englishContainer) {
    console.error('Container nicht gefunden');
    return;
  }
  
  // Remove existing words, keep headers
  germanContainer.querySelectorAll('.word').forEach(word => word.remove());
  englishContainer.querySelectorAll('.word').forEach(word => word.remove());

  // Separate German and English words
  const germanWords: WordItem[] = [];
  const englishWords: WordItem[] = [];
  
  vocab.forEach(pair => {
    germanWords.push({ text: pair.de, lang: 'de' });
    englishWords.push({ text: pair.en, lang: 'en' });
  });

  // Shuffle both lists separately
  germanWords.sort(() => Math.random() - 0.5);
  englishWords.sort(() => Math.random() - 0.5);

  const placedGerman: PlacedWord[] = [];
  const placedEnglish: PlacedWord[] = [];

  // Place German words
  germanWords.forEach((item, index) => {
    placeWord(item, index, germanContainer, placedGerman, germanWords.length);
  });

  // Place English words
  englishWords.forEach((item, index) => {
    placeWord(item, index, englishContainer, placedEnglish, englishWords.length);
  });
}

/**
 * Places a single word in the container with collision detection
 * @param item - Word item to place
 * @param index - Index of word in array
 * @param container - Container element
 * @param placed - Array of already placed words
 * @param totalCount - Total number of words to place
 */
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
  
  // Temporarily add element to measure size
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

  // Calculate available area (below header)
  const headerHeight = 60;
  const containerHeight = containerRect.height;
  const headerHeightPercent = (headerHeight / containerHeight) * 100;
  const availableHeight = 95 - headerHeightPercent - heightPercent;

  // Try with normal buffer first
  do {
    top = headerHeightPercent + Math.random() * availableHeight;
    left = Math.random() * (95 - widthPercent);
    tries++;
    
    if (!overlaps(top, left, widthPercent, heightPercent, placed, 2)) {
      positioned = true;
      break;
    }
  } while (tries < maxTries);

  // Fallback: Try with less buffer
  if (!positioned && tries >= maxTries) {
    tries = 0;
    do {
      top = headerHeightPercent + Math.random() * availableHeight;
      left = Math.random() * (95 - widthPercent);
      tries++;
      
      if (!overlaps(top, left, widthPercent, heightPercent, placed, 0.5)) {
        positioned = true;
        break;
      }
    } while (tries < 100);
  }

  // Last fallback: Grid position
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

/**
 * Checks if a word position overlaps with already placed words
 * @param top - Top position in percent
 * @param left - Left position in percent
 * @param width - Width in percent
 * @param height - Height in percent
 * @param placed - Array of already placed words
 * @param buffer - Buffer space around words
 * @returns True if overlaps, false otherwise
 */
function overlaps(
  top: number,
  left: number,
  width: number,
  height: number,
  placed: PlacedWord[],
  buffer: number = 2
): boolean {
  return placed.some(p => {
    const noOverlapX = (left + width + buffer < p.left) || (p.left + p.width + buffer < left);
    const noOverlapY = (top + height + buffer < p.top) || (p.top + p.height + buffer < top);
    
    return !(noOverlapX || noOverlapY);
  });
}

// ============================================================================
// Word Animation
// ============================================================================

/**
 * Animates a word element with a gentle floating motion
 * @param el - Element to animate
 */
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

// ============================================================================
// Word Selection and Matching
// ============================================================================

/**
 * Selects a word when clicked
 * @param lang - Language of the word ('de' or 'en')
 * @param word - The word text
 * @param el - The DOM element
 */
function selectWord(lang: 'de' | 'en', word: string, el: HTMLElement): void {
  // Ignore already solved words
  if (el.classList.contains('solved')) {
    return;
  }
  
  if (lang === 'de') {
    if (selectedDe) selectedDe.el.classList.remove('selected');
    selectedDe = { word, el };
  } else {
    if (selectedEn) selectedEn.el.classList.remove('selected');
    selectedEn = { word, el };
  }
  el.classList.add('selected');

  if (selectedDe && selectedEn) checkPair();
}

/**
 * Checks if the selected word pair is correct
 */
function checkPair(): void {
  if (!selectedDe || !selectedEn) return;
  
  const correct = vocab.some(
    p => p.de === selectedDe!.word && p.en === selectedEn!.word
  );

  if (correct) {
    showToast('🎉 Super, gut gemacht!', 'success');
    startRandomSuccessAnimation();
    
    // Mark both words as solved
    selectedDe.el.classList.remove('selected');
    selectedEn.el.classList.remove('selected');
    selectedDe.el.classList.add('solved');
    selectedEn.el.classList.add('solved');
  } else {
    showToast('❌ Das passt leider nicht.', 'error');
    
    selectedDe.el.classList.remove('selected');
    selectedEn.el.classList.remove('selected');
  }

  selectedDe = null;
  selectedEn = null;
}

// ============================================================================
// Toast Notifications
// ============================================================================

/**
 * Shows a toast notification message
 * @param message - Message to display
 * @param type - Type of toast (success, error, info)
 */
function showToast(message: string, type: ToastType = 'info'): void {
  // Remove existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

// ============================================================================
// Success Animations
// ============================================================================

/**
 * Gets the canvas context for animations
 * @returns Canvas and context or null if not found
 */
function getCanvasContext(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.getElementById('confetti') as HTMLCanvasElement;
  if (!canvas) return null;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  return { canvas, ctx };
}

/**
 * Confetti animation
 */
function startConfetti(): void {
  const result = getCanvasContext();
  if (!result) return;
  
  const { canvas, ctx } = result;
  
  const confetti = Array.from({ length: 100 }).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 5 + 2,
    c: `hsl(${Math.random() * 360}, 100%, 60%)`,
    s: Math.random() * 3 + 1,
  }));
  
  const startTime = Date.now();
  const duration = 4000;
  
  function draw(): void {
    const elapsed = Date.now() - startTime;
    
    if (elapsed < duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confetti.forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = p.c;
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fill();
        p.y += p.s;
        if (p.y > canvas.height) p.y = -10;
      });
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

/**
 * Balloons animation
 */
function startBalloons(): void {
  const result = getCanvasContext();
  if (!result) return;
  
  const { canvas, ctx } = result;
  
  const balloons: Balloon[] = Array.from({ length: 15 }).map(() => ({
    x: Math.random() * canvas.width,
    y: canvas.height + Math.random() * 100,
    r: 20 + Math.random() * 15,
    c: `hsl(${Math.random() * 360}, 80%, 60%)`,
    speed: 1 + Math.random() * 2,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.02 + Math.random() * 0.03
  }));
  
  const startTime = Date.now();
  const duration = 4000;
  
  function draw(): void {
    const elapsed = Date.now() - startTime;
    
    if (elapsed < duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      balloons.forEach(b => {
        // Balloon body
        ctx.beginPath();
        ctx.fillStyle = b.c;
        ctx.arc(b.x + Math.sin(b.wobble) * 10, b.y, b.r, 0, 2 * Math.PI);
        ctx.fill();
        
        // Balloon shine
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.arc(b.x + Math.sin(b.wobble) * 10 - b.r/3, b.y - b.r/3, b.r/3, 0, 2 * Math.PI);
        ctx.fill();
        
        // String
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.moveTo(b.x + Math.sin(b.wobble) * 10, b.y + b.r);
        ctx.lineTo(b.x + Math.sin(b.wobble) * 10, b.y + b.r + 40);
        ctx.stroke();
        
        b.y -= b.speed;
        b.wobble += b.wobbleSpeed;
      });
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

/**
 * Rocket animation
 */
function startRocket(): void {
  const result = getCanvasContext();
  if (!result) return;
  
  const { canvas, ctx } = result;
  
  const rocket: Rocket = {
    x: canvas.width / 2,
    y: canvas.height + 50,
    speed: 8,
    trail: []
  };
  
  const stars = Array.from({ length: 50 }).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2
  }));
  
  const startTime = Date.now();
  const duration = 4000;
  
  function draw(): void {
    const elapsed = Date.now() - startTime;
    
    if (elapsed < duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Stars
      stars.forEach(s => {
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      // Rocket trail
      rocket.trail.push({ x: rocket.x, y: rocket.y });
      if (rocket.trail.length > 20) rocket.trail.shift();
      
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 150, 0, 0.5)';
      ctx.lineWidth = 15;
      rocket.trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      
      // Rocket body
      ctx.save();
      ctx.translate(rocket.x, rocket.y);
      
      ctx.beginPath();
      ctx.fillStyle = '#e74c3c';
      ctx.moveTo(0, -30);
      ctx.lineTo(-10, 10);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();
      
      // Window
      ctx.beginPath();
      ctx.fillStyle = '#3498db';
      ctx.arc(0, -10, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Flames
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.fillStyle = i % 2 === 0 ? '#ff9500' : '#ffdd00';
        ctx.arc(-5 + i * 5, 10, 3 + Math.random() * 3, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      ctx.restore();
      
      rocket.y -= rocket.speed;
      
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

/**
 * Unicorn animation
 */
function startUnicorn(): void {
  const result = getCanvasContext();
  if (!result) return;
  
  const { canvas, ctx } = result;
  
  const unicorn = {
    x: canvas.width + 100,
    y: canvas.height / 2,
    speed: 6
  };
  
  const rainbow: { x: number; y: number }[] = [];
  const sparkles: Sparkle[] = [];
  
  const startTime = Date.now();
  const duration = 4000;
  
  function draw(): void {
    const elapsed = Date.now() - startTime;
    
    if (elapsed < duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Rainbow trail
      rainbow.push({ x: unicorn.x, y: unicorn.y });
      if (rainbow.length > 50) rainbow.shift();
      
      const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
      rainbow.forEach((p, i) => {
        ctx.beginPath();
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 10;
        ctx.globalAlpha = i / rainbow.length;
        if (i > 0) {
          ctx.moveTo(rainbow[i-1].x, rainbow[i-1].y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
      
      // Sparkles
      if (Math.random() < 0.3) {
        sparkles.push({
          x: unicorn.x + Math.random() * 40 - 20,
          y: unicorn.y + Math.random() * 40 - 20,
          life: 20
        });
      }
      
      sparkles.forEach((s, i) => {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 0, ${s.life / 20})`;
        ctx.arc(s.x, s.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        s.life--;
        if (s.life <= 0) sparkles.splice(i, 1);
      });
      
      // Unicorn emoji
      ctx.font = '60px Arial';
      ctx.fillText('🦄', unicorn.x, unicorn.y);
      
      unicorn.x -= unicorn.speed;
      
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

/**
 * Fireworks animation
 */
function startFireworks(): void {
  const result = getCanvasContext();
  if (!result) return;
  
  const { canvas, ctx } = result;
  
  const fireworks: Particle[][] = [];
  
  const startTime = Date.now();
  const duration = 4000;
  
  function createFirework(): void {
    const x = Math.random() * canvas.width;
    const y = canvas.height / 3 + Math.random() * canvas.height / 3;
    const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
    const particles: Particle[] = [];
    
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        life: 100,
        color: color
      });
    }
    
    fireworks.push(particles);
  }
  
  function draw(): void {
    const elapsed = Date.now() - startTime;
    
    if (elapsed < duration) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Create new fireworks
      if (Math.random() < 0.05) {
        createFirework();
      }
      
      // Draw fireworks
      fireworks.forEach((particles, fIndex) => {
        particles.forEach((p, pIndex) => {
          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 100;
          ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
          ctx.fill();
          
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05; // Gravity
          p.life--;
          
          if (p.life <= 0) {
            particles.splice(pIndex, 1);
          }
        });
        
        if (particles.length === 0) {
          fireworks.splice(fIndex, 1);
        }
      });
      
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

/**
 * Starts a random success animation
 */
function startRandomSuccessAnimation(): void {
  const animations = [
    startConfetti,
    startBalloons,
    startRocket,
    startUnicorn,
    startFireworks
  ];
  
  const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
  randomAnimation();
}

// ============================================================================
// Form Handling
// ============================================================================

/**
 * Toggles the add vocabulary form visibility
 */
function toggleAddForm(): void {
  const form = document.getElementById('addForm');
  const toggle = document.getElementById('addVocabToggle');
  
  if (!form || !toggle) return;
  
  if (form.classList.contains('form-hidden')) {
    // Expand form
    form.classList.remove('form-hidden');
    form.classList.add('form-visible');
    (toggle as HTMLElement).style.background = '#00aaff';
    (toggle as HTMLElement).style.color = 'white';
    (toggle as HTMLElement).style.borderColor = '#0088cc';
  } else {
    // Collapse form
    form.classList.remove('form-visible');
    form.classList.add('form-hidden');
    (toggle as HTMLElement).style.background = '#f0f9ff';
    (toggle as HTMLElement).style.color = 'inherit';
    (toggle as HTMLElement).style.borderColor = '#a3d3ff';
  }
}

/**
 * Handles form submission for adding new vocabulary
 */
async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();
  
  const deInput = document.getElementById('de') as HTMLInputElement;
  const enInput = document.getElementById('en') as HTMLInputElement;
  
  if (!deInput || !enInput) return;
  
  const de = deInput.value.trim();
  const en = enInput.value.trim();
  
  // Validation: Empty fields
  if (!de || !en) {
    showToast('❌ Bitte beide Felder ausfüllen.', 'error');
    return;
  }
  
  // Validation: Field length limit
  if (de.length > 60) {
    showToast('❌ Das deutsche Wort darf maximal 60 Zeichen lang sein.', 'error');
    return;
  }
  
  if (en.length > 60) {
    showToast('❌ Das englische Wort darf maximal 60 Zeichen lang sein.', 'error');
    return;
  }
  
  try {
    const res = await fetch(`/api/vocab/${currentLesson}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ de, en }),
    });
    
    const msg = await res.json();
    
    if (msg.success) {
      showToast('✅ Neues Vokabelpaar gespeichert!', 'success');
      deInput.value = '';
      enInput.value = '';
      // Re-render current lesson instead of full page reload
      setTimeout(() => initVocab(), 1500);
    } else {
      showToast('⚠️ ' + msg.error, 'error');
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    showToast('❌ Fehler beim Speichern', 'error');
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize application when DOM is loaded
 */
window.onload = (): void => {
  // Set dropdown to default lesson
  const selector = document.getElementById('lessonSelect') as HTMLSelectElement;
  if (selector) {
    selector.value = currentLesson;
  }
  
  // Attach form submit handler
  const form = document.getElementById('addForm');
  if (form) {
    form.onsubmit = handleFormSubmit;
  }
  
  // Initialize vocabulary
  initVocab();
};

// Make functions available globally for onclick handlers
(window as any).switchLesson = switchLesson;
(window as any).toggleAddForm = toggleAddForm;
