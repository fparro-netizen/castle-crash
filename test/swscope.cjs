const { chromium, devices } = require('playwright'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8768/castle-crash/', { waitUntil: 'networkidle' }); await p.evaluate(async () => { await navigator.serviceWorker.ready; }); await sleep(1500);
  await p.evaluate(async () => { await (await caches.open('bus-jam-v1')).put('/bus-jam/x', new Response('x')); await caches.open('other-app'); });
  console.log('before', JSON.stringify(await p.evaluate(() => caches.keys())));
  fs.writeFileSync('/tmp/swt/castle-crash/sw.js', fs.readFileSync('/workspace/castle-crash/site4/sw.js'));
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await sleep(4000);
  console.log('after', JSON.stringify(await p.evaluate(() => caches.keys())), 'game ok', await p.evaluate(() => typeof CastleCrash === 'object'));
  await c.setOffline(true); await p.reload({ waitUntil: 'load' }); await sleep(3000);
  console.log('offline', await p.evaluate(() => typeof CastleCrash === 'object' && CastleCrash.levels.length).catch(e => 'ERR ' + e.message), 'errors', JSON.stringify(errs));
  await b.close();
})();
