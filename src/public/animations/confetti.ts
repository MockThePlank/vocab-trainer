import { Particle } from '../types';

function getCanvasContext() {
  const canvas = document.getElementById('confetti') as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return { canvas, ctx } as const;
}

export function startConfetti(): void {
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
      confetti.forEach((p: any) => {
        ctx.beginPath(); ctx.fillStyle = p.c; ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI); ctx.fill();
        p.y += p.s; if (p.y > canvas.height) p.y = -10;
      });
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}
