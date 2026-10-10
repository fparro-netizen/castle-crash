import * as CANNON from 'cannon-es';
import { createGame } from '../site3/js/core.js';
import LEVELS from '../site3/js/levels.js';
for (const li of [23, 18, 15]) {
  const g = createGame(CANNON, LEVELS[li]); g.settle(200, 100);
  let t0 = performance.now(); for (let i = 0; i < 120; i++) g.frame(); const idle = (performance.now() - t0) / 120;
  let worst = 0, sum = 0;
  for (let s = 0; s < 4; s++) { g.fireAt({ x: -2 + s * 1.3, y: 1, z: -8 }); for (let i = 0; i < 60; i++) { t0 = performance.now(); g.frame(); const d = performance.now() - t0; worst = Math.max(worst, d); sum += d; } }
  console.log(LEVELS[li].name, 'idle ms/frame', idle.toFixed(2), 'collapse avg', (sum / 240).toFixed(2), 'worst', worst.toFixed(2), 'bodies', g.world.bodies.length);
}
