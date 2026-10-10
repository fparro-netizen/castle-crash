const { chromium, devices } = require('playwright');
const fs = require('fs');
const SOL = JSON.parse(fs.readFileSync(__dirname + '/solutions3.json'));
const URL = process.argv[2] || 'http://localhost:8766/';
const ONLY = process.argv[3];
const OUT = '/workspace/castle-crash/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|ReadPixels|swiftshader|SwiftShader|WebGL/i.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await sleep(1500);
  await page.screenshot({ path: OUT + 'shot3d-title.png' });
  console.log('webgl', await page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); return !!g && g.getParameter(g.RENDERER); }));
  await page.tap('#btn-play'); await sleep(1500);
  await page.screenshot({ path: OUT + 'shot3d-level1.png' });

  // Real touch tap at the crown's screen position
  const cdp = await ctx.newCDPSession(page);
  const crown = await page.evaluate(() => { const b = CastleCrash.game.targets[0].position; return CastleCrash.worldToScreen(b.x, b.y - 0.9, b.z); });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: crown.x, y: crown.y }] });
  await sleep(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250);
  await page.screenshot({ path: OUT + 'shot3d-firing.png' });
  console.log('after tap', JSON.stringify(await page.evaluate(() => ({ shots: CastleCrash.game.shots, balls: CastleCrash.game.balls.length }))));
  await sleep(700);
  await page.screenshot({ path: OUT + 'shot3d-impact.png' });
  const ok1 = await page.waitForFunction(() => CastleCrash.mode === 'result', null, { timeout: 15000 }).then(() => true).catch(() => false);
  if (!ok1) { // keep tapping (unlimited shots)
    for (let i = 0; i < 6 && (await page.evaluate(() => CastleCrash.mode)) !== 'result'; i++) {
      const pt = await page.evaluate(() => { const t = CastleCrash.game.targets.find(t => !t.cc.dead); if (!t) return null; return CastleCrash.worldToScreen(t.position.x, t.position.y, t.position.z); });
      if (pt) await page.mouse.click(pt.x, pt.y); await sleep(2500);
    }
  }
  await sleep(600);
  await page.screenshot({ path: OUT + 'shot3d-result.png' });
  console.log('L1', JSON.stringify(await page.evaluate(() => ({ mode: CastleCrash.mode, phase: CastleCrash.game.phase, shots: CastleCrash.game.shots, stars: CastleCrash.game.stars, coins: CastleCrash.game.coins, saved: localStorage.getItem('castleCrash3d.v1') }))));

  // Hold-and-drag with mouse on level 2, release over the tower
  await page.tap('#res-next'); await sleep(1500);
  {
    const t = await page.evaluate(() => { const b = CastleCrash.game.targets[0].position; return CastleCrash.worldToScreen(b.x, b.y - 1.5, b.z); });
    await page.mouse.move(60, 400); await page.mouse.down(); await page.mouse.move(t.x, t.y, { steps: 8 });
    await page.screenshot({ path: OUT + 'shot3d-crosshair.png' });
    await page.mouse.up(); await sleep(300);
    console.log('L2 drag shot', await page.evaluate(() => CastleCrash.game.shots));
  }
  await sleep(2000);
  console.log('fps (swiftshader)', await page.evaluate(() => Math.round(window.__fps)), 'draw calls', await page.evaluate(() => CastleCrash.renderInfo.calls));

  // every level: replay solver shots directly, then keep firing at remaining targets (unlimited shots)
  const results = [];
  for (let i = 0; i < SOL.length; i++) {
    if (ONLY && +ONLY !== i) continue;
    await page.evaluate(i => CastleCrash.loadLevel(i), i);
    await sleep(2200);
    if (i === 23) await page.screenshot({ path: OUT + 'shot3d-level24.png' });
    if (i === 17) await page.screenshot({ path: OUT + 'shot3d-level18.png' });
    const stable = await page.evaluate(() => CastleCrash.game.targetsLeft === CastleCrash.game.targets.length && CastleCrash.game.blocksBroken === 0);
    for (const [x, y, z] of SOL[i]) {
      if (await page.evaluate(() => CastleCrash.game.phase !== 'play')) break;
      await page.evaluate(([x, y, z]) => CastleCrash.fireWorldDirect(x, y, z), [x, y, z]);
      await sleep(2600);
    }
    let extra = 0;
    while (extra < 8 && await page.evaluate(() => CastleCrash.game.phase === 'play')) {
      await page.evaluate(() => { const t = CastleCrash.game.targets.find(t => !t.cc.dead); CastleCrash.fireWorldDirect(t.position.x, t.position.y, t.position.z); });
      extra++; await sleep(2600);
    }
    await page.waitForFunction(() => CastleCrash.mode === 'result', null, { timeout: 8000 }).catch(() => {});
    const r = await page.evaluate(() => ({ mode: CastleCrash.mode, shots: CastleCrash.game.shots, stars: CastleCrash.game.stars || 0, left: CastleCrash.game.targetsLeft }));
    r.stable = stable; r.extra = extra; results.push(r); console.log('level', i + 1, JSON.stringify(r));
  }
  await page.evaluate(() => CastleCrash.show('levels')); await sleep(400);
  await page.screenshot({ path: OUT + 'shot3d-levels.png' });
  const swOk = await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await sleep(500); await ctx.setOffline(true); await page.reload({ waitUntil: 'load' }); await sleep(1500);
  const offline = await page.evaluate(() => typeof CastleCrash === 'object' && CastleCrash.levels.length);
  const persisted = await page.evaluate(() => Object.keys(CastleCrash.save.stars).length);
  console.log('serviceWorker', swOk, 'offline levels', offline, 'saved levels', persisted);
  console.log('cleared', results.filter(r => r.mode === 'result').length, '/', results.length);
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
