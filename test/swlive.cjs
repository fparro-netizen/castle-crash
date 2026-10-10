const { chromium, devices } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  await p.goto('https://fparro-netizen.github.io/bus-jam/', { waitUntil: 'networkidle' }); await sleep(4000);
  console.log('after bus-jam', JSON.stringify(await p.evaluate(() => caches.keys())));
  await p.evaluate(async () => { await caches.open('castle-crash-3d-v1'); await caches.open('castle-crash-stack-v1'); }); // simulate older Castle Crash caches
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('https://fparro-netizen.github.io/castle-crash/', { waitUntil: 'networkidle' }); await sleep(6000);
  console.log('after castle-crash', JSON.stringify(await p.evaluate(() => caches.keys())), 'game', await p.evaluate(() => typeof CastleCrash === 'object'), 'errors', JSON.stringify(errs));
  await b.close();
})();
