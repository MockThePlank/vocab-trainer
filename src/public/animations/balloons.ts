import { Balloon } from '../types';

function getCanvasContext() {
  const canvas = document.getElementById('confetti') as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return { canvas, ctx } as const;
}

export function startBalloons(): void {
  const result = getCanvasContext(); if (!result) return;
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
  const startTime = Date.now(); const duration = 4000;
  function draw(): void {
    const elapsed = Date.now() - startTime;
    if (elapsed < duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      balloons.forEach(b => {
        ctx.beginPath(); ctx.fillStyle = b.c; ctx.arc(b.x + Math.sin(b.wobble) * 10, b.y, b.r, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.arc(b.x + Math.sin(b.wobble) * 10 - b.r/3, b.y - b.r/3, b.r/3, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.moveTo(b.x + Math.sin(b.wobble) * 10, b.y + b.r); ctx.lineTo(b.x + Math.sin(b.wobble) * 10, b.y + b.r + 40); ctx.stroke();
        b.y -= b.speed; b.wobble += b.wobbleSpeed;
      });
      requestAnimationFrame(draw);
    } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  draw();
}
