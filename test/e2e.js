const { chromium, devices } = require('playwright');
const fs = require('fs');
const SOL = JSON.parse(fs.readFileSync(__dirname + '/solutions.json'));
const URL = process.argv[2] || 'http://localhost:8765/';
const OUT = '/workspace/castle-crash/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await sleep(800);
  await page.screenshot({ path: OUT + 'screenshot-title.png' });
  const meta = await page.evaluate(() => ({
    viewport: document.querySelector('meta[name=viewport]').content,
    capable: !!document.querySelector('meta[name=apple-mobile-web-app-capable]'),
    touchIcon: document.querySelector('link[rel=apple-touch-icon]').href,
    levels: CastleCrash.levels.length, w: innerWidth, h: innerHeight, dpr: devicePixelRatio
  }));
  console.log('meta', JSON.stringify(meta));

  // Level 1 via real touch drag (CDP touch events)
  await page.tap('#btn-play');
  await sleep(1500);
  const cdp = await ctx.newCDPSession(page);
  async function touchDrag(angle, power) {
    const pm = await page.evaluate(() => CastleCrash.pullMax);
    const s = await page.evaluate(() => CastleCrash.worldToScreen(CastleCrash.game.LAUNCH.x, CastleCrash.game.LAUNCH.y));
    const a = angle * Math.PI / 180, L = power * pm;
    const ex = s.x - Math.cos(a) * L, ey = s.y + Math.sin(a) * L;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s.x, y: s.y }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: s.x + (ex - s.x) * i / 12, y: s.y + (ey - s.y) * i / 12 }] });
      await sleep(16);
    }
    return { ex, ey };
  }
  const p1 = await touchDrag(SOL[0][0][0], SOL[0][0][1]);
  await sleep(200);
  await page.screenshot({ path: OUT + 'screenshot-aiming.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250);
  const fired = await page.evaluate(() => ({ phase: CastleCrash.game.phase, shots: CastleCrash.game.shotsUsed, ballY: CastleCrash.game.ball && CastleCrash.game.ball.position.y }));
  console.log('L1 touch fire ->', JSON.stringify(fired));
  await page.waitForFunction(() => CastleCrash.mode === 'result', null, { timeout: 20000 });
  await sleep(700);
  await page.screenshot({ path: OUT + 'screenshot-result.png' });
  const r1 = await page.evaluate(() => ({ phase: CastleCrash.game.phase, stars: CastleCrash.game.stars, score: CastleCrash.game.score, coins: CastleCrash.game.coins, saved: localStorage.getItem('castleCrash.v1') }));
  console.log('L1 result', JSON.stringify(r1));

  // Mouse play on level 2 (desktop-style pointer)
  await page.tap('#res-next'); await sleep(1500);
  {
    const s = await page.evaluate(() => CastleCrash.worldToScreen(CastleCrash.game.LAUNCH.x, CastleCrash.game.LAUNCH.y));
    const pm = await page.evaluate(() => CastleCrash.pullMax);
    const [ang, pw] = SOL[1][0]; const a = ang * Math.PI / 180, L = pw * pm;
    await page.mouse.move(s.x, s.y); await page.mouse.down();
    await page.mouse.move(s.x - Math.cos(a) * L, s.y + Math.sin(a) * L, { steps: 10 }); await page.mouse.up();
    await page.waitForFunction(() => CastleCrash.mode === 'result', null, { timeout: 20000 });
    console.log('L2 mouse result', await page.evaluate(() => CastleCrash.game.phase + ' stars ' + CastleCrash.game.stars));
  }

  // FPS sample during a busy level
  await page.evaluate(() => CastleCrash.loadLevel(17)); await sleep(1200);
  await page.evaluate(() => CastleCrash.fire(20, 1)); await sleep(400);
  await page.screenshot({ path: OUT + 'screenshot-impact.png' });
  await sleep(1500);
  console.log('fps', await page.evaluate(() => Math.round(window.__fps)));

  // Every level by replaying solver shots in the browser
  const results = [];
  for (let i = 0; i < SOL.length; i++) {
    await page.evaluate(i => CastleCrash.loadLevel(i), i);
    if (i === 17) { await sleep(600); await page.screenshot({ path: OUT + 'screenshot-level18.png' }); }
    await page.waitForTimeout(2100);
    for (const [a, p] of SOL[i]) {
      await page.waitForFunction(() => ['aim', 'won', 'lost', 'winning'].includes(CastleCrash.game.phase), null, { timeout: 20000 });
      if (await page.evaluate(() => CastleCrash.game.phase !== 'aim')) break;
      await page.evaluate(([a, p]) => CastleCrash.fire(a, p), [a, p]);
      await sleep(100);
    }
    await page.waitForFunction(() => ['aim', 'won', 'lost'].includes(CastleCrash.game.phase) && CastleCrash.game.phase !== 'flying', null, { timeout: 25000 });
    await page.waitForFunction(() => CastleCrash.game.phase !== 'winning', null, { timeout: 5000 });
    const r = await page.evaluate(() => ({ phase: CastleCrash.game.phase, used: CastleCrash.game.shotsUsed, left: CastleCrash.game.targetsLeft, stars: CastleCrash.game.stars || 0 }));
    results.push(r); console.log('level', i + 1, JSON.stringify(r));
  }

  // level select screen
  await page.evaluate(() => CastleCrash.show('levels')); await sleep(400);
  await page.screenshot({ path: OUT + 'screenshot-levels.png' });

  // service worker + offline reload
  const swOk = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  await sleep(500);
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await sleep(800);
  const offline = await page.evaluate(() => typeof CastleCrash === 'object' && CastleCrash.levels.length);
  const persisted = await page.evaluate(() => Object.keys(CastleCrash.save.stars).length);
  await ctx.setOffline(false);
  console.log('serviceWorker', swOk, 'offline reload levels', offline, 'persisted stars entries', persisted);
  console.log('wins', results.filter(r => r.phase === 'won').length, '/', results.length);
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
