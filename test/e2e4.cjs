const { chromium, devices } = require('playwright');
const fs = require('fs');
const SOL = {}; for (const l of fs.readFileSync(__dirname + '/solve5.jsonl', 'utf8').trim().split('\n')) { const j = JSON.parse(l); SOL[j.level - 1] = j.solve.seq; }
const URL = process.argv[2] || 'http://localhost:8767/';
const ONLY = process.argv[3];
const OUT = process.env.OUT || '/workspace/castle-crash/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|ReadPixels|swiftshader|SwiftShader|WebGL/i.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof CastleCrash === 'object', null, { timeout: 30000 });
  await sleep(1000);
  await page.screenshot({ path: OUT + 'shot-stack-title.png' });
  await page.tap('#btn-play'); await sleep(1500);
  // real touch tap on level 1
  const cdp = await ctx.newCDPSession(page);
  const pt = await page.evaluate(() => CastleCrash.worldToScreen(0, 0.5, -5));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y }] }); await sleep(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(2500);
  console.log('L1 touch tap', JSON.stringify(await page.evaluate(() => ({ shots: CastleCrash.game.shots, off: CastleCrash.game.off, bar: document.getElementById('bar-text').textContent }))));
  // hold-and-drag with the mouse
  await page.mouse.move(60, 500); await page.mouse.down(); await page.mouse.move(pt.x, pt.y, { steps: 8 });
  await page.screenshot({ path: OUT + 'shot-stack-crosshair.png' });
  await page.mouse.up(); await sleep(300);
  console.log('L1 drag shot', await page.evaluate(() => CastleCrash.game.shots));
  // restart button: visible during play and resets the level
  await sleep(1500);
  const rb = await page.locator('#btn-restart').boundingBox();
  const before = await page.evaluate(() => ({ shots: CastleCrash.game.shots, off: CastleCrash.game.off }));
  await page.tap('#btn-restart'); await sleep(1200);
  const after = await page.evaluate(() => ({ shots: CastleCrash.game.shots, off: CastleCrash.game.off, mode: CastleCrash.mode, bar: document.getElementById('bar-text').textContent }));
  console.log('restart', JSON.stringify({ visible: await page.isVisible('#btn-restart'), box: rb, before, after }));

  const results = [];
  for (let i = 0; i < 24; i++) {
    if (ONLY !== undefined && +ONLY !== i) continue;
    await page.evaluate(i => CastleCrash.loadLevel(i), i);
    await sleep(500);
    const p0 = await page.evaluate(() => JSON.stringify(CastleCrash.game.positions()));
    await sleep(i === 17 ? 10000 : 3000);
    const st = await page.evaluate((p0) => { const a = JSON.parse(p0), b = CastleCrash.game.positions(); let m = 0; a.forEach((p, k) => { if (p && b[k]) m = Math.max(m, Math.hypot(p.x - b[k].x, p.y - b[k].y, p.z - b[k].z)); }); return { off: CastleCrash.game.off, maxMove: +m.toFixed(3) }; }, p0);
    if (i === 17) await page.screenshot({ path: OUT + 'shot-stack-before.png' });
    const rv = await page.isVisible('#btn-restart'); const barText = await page.evaluate(() => document.getElementById('bar-text').textContent);
    if (i === 17 || i === 9) { // mid-play restart check on a big level: one shot, restart while pieces are still falling
      await page.evaluate(([x, y, z]) => CastleCrash.fireWorldDirect(x, y, z), SOL[i][0]); await sleep(1200);
      const mid = await page.evaluate(() => ({ shots: CastleCrash.game.shots, phase: CastleCrash.game.phase }));
      const bt = await page.isVisible('#btn-restart'); await page.tap('#btn-restart'); await sleep(2500);
      const ok = await page.evaluate(() => CastleCrash.game.shots === 0 && CastleCrash.game.off === 0 && CastleCrash.mode === 'game');
      console.log('  restart mid-level', i + 1, JSON.stringify(mid), 'visible', bt, 'reset ok', ok);
    }
    let n = 0;
    for (const [x, y, z] of (SOL[i] || [])) {
      if (await page.evaluate(() => CastleCrash.game.phase !== 'play')) break;
      await page.evaluate(([x, y, z]) => CastleCrash.fireWorldDirect(x, y, z), [x, y, z]); n++;
      if (i === 17 && n === 1) { await sleep(550); await page.screenshot({ path: OUT + 'shot-stack-collapse.png' }); await sleep(2500); }
      else await sleep(3000);
    }
    let extra = 0;
    while (extra < 40 && await page.evaluate(() => CastleCrash.game.phase === 'play')) {
      await page.evaluate(() => { const g = CastleCrash.game; const live = g.pieces.filter(p => !p.off && !p.gone).map(p => g.world.getRigidBody(p.h).translation()); live.sort((a, b) => a.y - b.y); const t = live[Math.floor(Math.random() * Math.min(live.length, 6))]; CastleCrash.fireWorldDirect(t.x, t.y, t.z); });
      extra++; await sleep(3000);
    }
    await page.waitForFunction(() => CastleCrash.mode === 'result', null, { timeout: 8000 }).catch(() => {});
    const r = await page.evaluate(() => ({ mode: CastleCrash.mode, shots: CastleCrash.game.shots, stars: CastleCrash.game.stars || 0, pct: Math.round(100 * CastleCrash.game.off / CastleCrash.game.total), phys: CastleCrash.physMs }));
    r.stable = st; r.extra = extra; r.restartVisible = rv; r.bar0 = barText; results.push(r); console.log('level', i + 1, JSON.stringify(r));
    if (i === 23) await page.screenshot({ path: OUT + 'shot-stack-result.png' });
  }
  await page.evaluate(() => CastleCrash.show('levels')); await sleep(400);
  await page.screenshot({ path: OUT + 'shot-stack-levels.png' });
  const swOk = await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await sleep(500); await ctx.setOffline(true); await page.reload({ waitUntil: 'load' }); await sleep(3000);
  const offline = await page.evaluate(() => typeof CastleCrash === 'object' && CastleCrash.levels.length).catch(e => 'ERR ' + e.message);
  const persisted = await page.evaluate(() => Object.keys(CastleCrash.save.stars || {}).length).catch(() => -1);
  console.log('serviceWorker', swOk, 'offline levels', offline, 'saved levels', persisted);
  console.log('cleared', results.filter(r => r.mode === 'result').length, '/', results.length);
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
