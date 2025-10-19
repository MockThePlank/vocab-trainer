import { Sparkle } from '../types';

function getCanvasContext() {
  const canvas = document.getElementById('confetti') as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  return { canvas, ctx } as const;
}

export function startUnicorn(): void {
  const result = getCanvasContext(); if (!result) return;
  const { canvas, ctx } = result;
  const unicorn = { x: canvas.width + 100, y: canvas.height / 2, speed: 6 };
  const rainbow: { x: number; y: number }[] = [];
  const sparkles: Sparkle[] = [];
  const startTime = Date.now(); const duration = 4000;
  function draw(): void {
    const elapsed = Date.now() - startTime;
    if (elapsed < duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rainbow.push({ x: unicorn.x, y: unicorn.y }); if (rainbow.length > 50) rainbow.shift();
      const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
      rainbow.forEach((p, i) => { ctx.beginPath(); ctx.strokeStyle = colors[i % colors.length]; ctx.lineWidth = 10; ctx.globalAlpha = i / rainbow.length; if (i > 0) { ctx.moveTo(rainbow[i-1].x, rainbow[i-1].y); ctx.lineTo(p.x, p.y); ctx.stroke(); } });
      ctx.globalAlpha = 1;
      if (Math.random() < 0.3) sparkles.push({ x: unicorn.x + Math.random() * 40 - 20, y: unicorn.y + Math.random() * 40 - 20, life: 20 });
      sparkles.forEach((s, i) => { ctx.beginPath(); ctx.fillStyle = `rgba(255, 255, 0, ${s.life / 20})`; ctx.arc(s.x, s.y, 3, 0, 2 * Math.PI); ctx.fill(); s.life--; if (s.life <= 0) sparkles.splice(i, 1); });
      ctx.font = '60px Arial'; ctx.fillText('🦄', unicorn.x, unicorn.y);
      unicorn.x -= unicorn.speed; requestAnimationFrame(draw);
    } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  draw();
}
