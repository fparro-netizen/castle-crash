import RAPIER from '../site4/js/lib/rapier.js';
import { createGame } from '../site4/js/core.js';
import LEVELS from '../site4/js/levels.js';
await RAPIER.init();
for (const li of [17, 22, 23]) {
  const L = LEVELS[li]; const g = createGame(RAPIER, L);
  const times = [];
  const fire = [ {x:0,y:0.6,z:-4.5}, {x:-1,y:0.4,z:-4.6}, {x:1,y:0.4,z:-4.6}, {x:0,y:1.5,z:-4.8} ];
  for (let s = 0; s < 4; s++) { g.fireAt(fire[s]); for (let i = 0; i < 90; i++) { const t = performance.now(); g.step(); times.push(performance.now() - t); } }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(L.name, g.total, 'avg', avg.toFixed(2), 'p95', times[Math.floor(times.length * 0.95)].toFixed(2), 'max', times[times.length - 1].toFixed(2), 'off%', Math.round(100 * g.off / g.total));
  g.free();
}
