// Stability (10 s untouched, awake) + greedy unlimited-shot solver for each level, using the real core and Rapier.
import RAPIER from '../site4/js/lib/rapier.js';
import { createGame } from '../site4/js/core.js';
import LEVELS from '../site4/js/levels.js';
await RAPIER.init();
const li = +process.argv[2], mode = process.argv[3] || 'all';
const L = LEVELS[li];
function stability() {
  const g = createGame(RAPIER, L);
  const p0 = g.positions();
  g.world.forEachRigidBody(b => b.isDynamic() && b.wakeUp());
  for (let i = 0; i < 600; i++) g.step();
  const p1 = g.positions();
  let maxMove = 0; p0.forEach((p, i) => { if (p && p1[i]) maxMove = Math.max(maxMove, Math.hypot(p.x - p1[i].x, p.y - p1[i].y, p.z - p1[i].z)); });
  const r = { pieces: g.total, bonus: g.bonus.length, off: g.off, bonusOff: g.bonusOff, maxMove: +maxMove.toFixed(3) };
  g.free(); return r;
}
const out = { level: li + 1, name: L.name, goal: L.goal, par: L.par, stability: stability() };
if (mode !== 'stab') {
  const g = createGame(RAPIER, L);
  const seq = []; let t0 = Date.now();
  for (let k = 0; k < 30 && g.phase === 'play'; k++) {
    const snap = g.snapshot();
    const live = g.pieces.filter(p => !p.off && !p.gone);
    const pos = live.map(p => g.world.getRigidBody(p.h).translation());
    // candidates: sample live pieces (bias to low and central ones) + a few on the bonus crowns
    let cands = pos.map(t => ({ x: t.x, y: t.y, z: t.z }));
    if (cands.length > 36) { cands.sort((a, b) => a.y - b.y); const step = cands.length / 36; cands = Array.from({ length: 36 }, (_, i) => cands[Math.floor(i * step)]); }
    let best = null;
    for (const c of cands) {
      g.restore(snap);
      g.fireAt(c); g.settle(260, 30);
      const sc = g.off + (g.phase !== 'play' ? 1000 : 0);
      if (!best || sc > best.sc) best = { sc, c };
    }
    g.restore(snap);
    g.fireAt(best.c); g.settle(260, 30);
    seq.push([+best.c.x.toFixed(3), +best.c.y.toFixed(3), +best.c.z.toFixed(3)]);
  }
  for (let i = 0; i < 120 && g.phase === 'winning'; i++) g.step();
  out.solve = { won: g.phase === 'won' || g.phase === 'winning', shots: seq.length, offPct: Math.round(100 * g.off / g.total), seq, secs: Math.round((Date.now() - t0) / 1000) };
}
console.log(JSON.stringify(out));
