import { Particle } from '../types';

function getCanvasContext() {
  const canvas = document.getElementById('confetti') as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  return { canvas, ctx } as const;
}

export function startFireworks(): void {
  const result = getCanvasContext(); if (!result) return;
  const { canvas, ctx } = result;
  const fireworks: Particle[][] = [];
  const startTime = Date.now(); const duration = 4000;
  function createFirework(): void {
    const x = Math.random() * canvas.width;
    const y = canvas.height / 3 + Math.random() * canvas.height / 3;
    const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
    const particles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      particles.push({ x, y, vx: Math.cos(angle) * (2 + Math.random() * 3), vy: Math.sin(angle) * (2 + Math.random() * 3), life: 100, color });
    }
    fireworks.push(particles);
  }
  function draw(): void {
    const elapsed = Date.now() - startTime;
    if (elapsed < duration) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (Math.random() < 0.05) createFirework();
      fireworks.forEach((particles, fIndex) => {
        particles.forEach((p, pIndex) => {
          ctx.beginPath(); ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 100; ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI); ctx.fill();
          p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; if (p.life <= 0) particles.splice(pIndex, 1);
        });
        if (particles.length === 0) fireworks.splice(fIndex, 1);
      });
      ctx.globalAlpha = 1; requestAnimationFrame(draw);
    } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  draw();
}
