// Stability + greedy solver for every level using the real game core.
const Matter = require('matter-js');
const Core = require('../site/js/core.js');
const LEVELS = require('../site/js/levels.js');

function fresh(li) { const g = Core.createGame(Matter, LEVELS[li]); g.settle(120); return g; }
function stability(li) {
  const g = Core.createGame(Matter, LEVELS[li]);
  for (let i = 0; i < 900; i++) g.step();
  const moved = g.blocks.concat(g.targets).filter(b => !b.plugin.cc.dead && b.speed > 0.3).length;
  return { targetsLost: g.targets.length - g.targetsLeft, blocksBroken: g.blocksBroken, moving: moved, phase: g.phase };
}
function play(li, shots) {
  const g = fresh(li);
  for (const s of shots) {
    if (g.phase !== 'aim') break;
    g.fire(g.aimVelocity(s[0], s[1]));
    g.resolve(3000);
  }
  return g;
}
function solve(li) {
  const L = LEVELS[li];
  const angles = []; for (let a = -8; a <= 78; a += 3) angles.push(a);
  const powers = []; for (let p = 0.4; p <= 1.001; p += 0.06) powers.push(+p.toFixed(2));
  let seq = [], wins = 0, winShots = [];
  for (let k = 0; k < L.balls; k++) {
    let best = null;
    for (const a of angles) for (const p of powers) {
      const g = play(li, seq.concat([[a, p]]));
      const won = g.phase === 'won' || g.phase === 'winning' || g.targetsLeft === 0;
      const sc = (won ? 1e6 : 0) + (g.targets.length - g.targetsLeft) * 1e4 + g.damageDealt;
      if (won && k === 0) { wins++; winShots.push([a, p]); }
      if (!best || sc > best.sc) best = { sc, a, p, won, left: g.targetsLeft };
    }
    seq.push([best.a, best.p]);
    if (best.won) return { solved: true, shots: seq.length, seq, oneShotWins: wins, winShots: winShots.slice(0, 6), candidates: angles.length * powers.length };
  }
  return { solved: false, shots: seq.length, seq, left: play(li, seq).targetsLeft };
}
const li = +process.argv[2];
const mode = process.argv[3] || 'all';
const out = { level: li + 1, name: LEVELS[li].name, balls: LEVELS[li].balls, par: LEVELS[li].par, stability: stability(li) };
if (mode !== 'stab') out.solve = solve(li);
console.log(JSON.stringify(out));
