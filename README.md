# Castle Crash 3D

An original first-person 3D physics puzzle game for iPhone (and any modern browser). Tap the castle to fire a cannonball at that spot, or hold and drag to aim with a crosshair and release to fire. Knock every crown and gem off the castle. Shots are unlimited; use fewer shots for more stars and coins.

**Play:** https://fparro-netizen.github.io/castle-crash/ (published from the `fparro-netizen.github.io` repo).

- 24 hand-built 3D levels: towers, walls, keeps and bridges in wood, ice and stone
- 1 to 3 stars per level by shot count, coins, saved progress, level select
- Works offline and full screen after Safari > Share > Add to Home Screen
- No ads, no purchases, no tracking

Built with [three.js](https://threejs.org) r160 (MIT) and [cannon-es](https://github.com/pmndrs/cannon-es) 0.20 (MIT), bundled in `js/lib/`.
(`js/matter.min.js` is left over from the earlier 2D version and is no longer used.)

## Tests
- `node test/sim3.mjs <levelIndex>` checks a level stays standing untouched and finds a shot sequence that clears it, using the real game core.
- `node test/e2e3.cjs <url>` plays every level in an iPhone-sized headless Chromium (touch tap, drag-to-aim, offline reload, saved progress).
