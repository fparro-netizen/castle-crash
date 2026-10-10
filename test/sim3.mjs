// Stability + greedy "unlimited shots" solver for every 3D level using the real core.
import * as CANNON from 'cannon-es';
import { createGame, buildItems, CAMERA } from '../site3/js/core.js';
import LEVELS from '../site3/js/levels.js';
const li = +process.argv[2], mode = process.argv[3] || 'all';
const L = LEVELS[li];
function fresh() { const g = createGame(CANNON, L); g.settle(240, 120); return g; }
function stability() {
  const g = createGame(CANNON, L);
  for (let i = 0; i < 600; i++) g.frame(); // 10 s
  const moved = g.blocks.concat(g.targets).filter(b => !b.cc.dead && b.velocity.length() > 0.2).length;
  return { targetsLost: g.targets.length - g.targetsLeft, broken: g.blocksBroken, moving: moved, bodies: g.blocks.length + g.targets.length };
}
function shoot(g, p) { g.fireAt(p); g.settle(360, 40); }
function candidates(g) {
  const pts = [];
  for (const b of g.targets.concat(g.blocks)) {
    if (b.cc.dead) continue;
    const p = b.position;
    pts.push({ x: p.x, y: p.y, z: p.z });
    if (b.cc.kind === 'block') { pts.push({ x: p.x, y: p.y - (b.cc.h || 0) * 0.3, z: p.z }); }
  }
  for (const b of g.statics) pts.push({ x: b.position.x, y: b.position.y + b.cc.h / 2 + 0.3, z: b.position.z });
  return pts;
}
function play(shots) { const g = fresh(); for (const s of shots) { if (g.phase !== 'play') break; shoot(g, s); } return g; }
const out = { level: li + 1, name: L.name, par: L.par, stability: stability() };
if (mode !== 'stab') {
  let seq = [], won = false;
  for (let k = 0; k < 14 && !won; k++) {
    const base = play(seq);
    let cands = candidates(base);
    if (cands.length > 70) cands = cands.filter((_, i) => i % Math.ceil(cands.length / 70) === 0);
    let best = null;
    for (const c of cands) {
      const g = play(seq.concat([c]));
      const w = g.targetsLeft === 0;
      const sc = (w ? 1e7 : 0) + (g.targets.length - g.targetsLeft) * 1e5 + g.damageDealt;
      if (!best || sc > best.sc) best = { sc, c, w };
    }
    seq.push(best.c); won = best.w;
  }
  out.solve = { won, shots: seq.length, seq: seq.map(p => [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)]) };
}
console.log(JSON.stringify(out));
