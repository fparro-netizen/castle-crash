# Castle Crash

An original first-person 3D physics puzzle game for iPhone (and any modern browser). Big multi-layer stacks of bricks, planks, cubes, cylinders and pillars sit on a floating island. Tap anywhere to fire a cannonball at that spot (or hold and drag to aim, release to fire) and knock the pieces off the edge. Clear the target share of pieces (85-90%, shown on the progress bar) to win. Shots are unlimited; fewer shots earn more stars and coins, and golden crowns are an optional bonus.

**Play:** https://fparro-netizen.github.io/castle-crash/ (published from the `fparro-netizen.github.io` repo).

- 24 levels with 42 to 151 pieces each: walls, pyramids, jenga towers, pagodas, shelves, ziggurats and castles
- Wood, stone and ice behave differently (mass, friction, bounce); ice shatters on hard hits
- Real rigid-body physics: Rapier 3D with 8 solver iterations, continuous collision detection on the ball, sleeping bodies, structures pre-settled so they stand still until hit
- Instanced rendering (a few draw calls for all pieces) so 150 pieces run smoothly on a phone
- Stars by shot count, coins, saved progress, level select, sound
- Works offline and full screen after Safari > Share > Add to Home Screen
- No ads, no purchases, no tracking

Built with [three.js](https://threejs.org) r160 (MIT) and [Rapier](https://rapier.rs) (`@dimforge/rapier3d-compat` 0.14, Apache-2.0), bundled in `js/lib/`.
(`js/matter.min.js` and `js/cannon-es.js` / `js/lib/cannon-es.js` are left over from earlier versions and are no longer used.)

## Tests
- `node test/sim4.mjs <levelIndex>` checks a level stays standing for 10 s untouched and finds a shot sequence that clears it, using the real game core.
- `node test/perf4.mjs` measures physics milliseconds per step on the heaviest levels.
- `node test/e2e4.cjs <url>` plays every level in an iPhone-sized headless Chromium (touch tap, drag-to-aim, stability, offline reload, saved progress).
