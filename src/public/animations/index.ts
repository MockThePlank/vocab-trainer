import { startConfetti } from './confetti';
import { startBalloons } from './balloons';
import { startRocket } from './rocket';
import { startUnicorn } from './unicorn';
import { startFireworks } from './fireworks';

export { startConfetti, startBalloons, startRocket, startUnicorn, startFireworks };

export function startRandomSuccessAnimation(): void {
  const animations = [startConfetti, startBalloons, startRocket, startUnicorn, startFireworks];
  const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
  randomAnimation();
}
