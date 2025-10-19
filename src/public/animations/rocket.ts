import { Rocket } from '../types';

function getCanvasContext() {
  const canvas = document.getElementById('confetti') as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  return { canvas, ctx } as const;
}

export function startRocket(): void {
  const result = getCanvasContext(); if (!result) return;
  const { canvas, ctx } = result;
  const rocket: Rocket = { x: canvas.width / 2, y: canvas.height + 50, speed: 8, trail: [] };
  const stars = Array.from({ length: 50 }).map(() => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2 }));
  const startTime = Date.now(); const duration = 4000;
  function draw(): void {
    const elapsed = Date.now() - startTime;
    if (elapsed < duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => { ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI); ctx.fill(); });
      rocket.trail.push({ x: rocket.x, y: rocket.y }); if (rocket.trail.length > 20) rocket.trail.shift();
      ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 150, 0, 0.5)'; ctx.lineWidth = 15; rocket.trail.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); ctx.stroke();
      ctx.save(); ctx.translate(rocket.x, rocket.y);
      ctx.beginPath(); ctx.fillStyle = '#e74c3c'; ctx.moveTo(0, -30); ctx.lineTo(-10, 10); ctx.lineTo(10, 10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = '#3498db'; ctx.arc(0, -10, 5, 0, 2 * Math.PI); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.fillStyle = i % 2 === 0 ? '#ff9500' : '#ffdd00'; ctx.arc(-5 + i * 5, 10, 3 + Math.random() * 3, 0, 2 * Math.PI); ctx.fill(); }
      ctx.restore(); rocket.y -= rocket.speed; requestAnimationFrame(draw);
    } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  draw();
}
