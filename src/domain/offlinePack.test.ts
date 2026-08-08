import assert from 'node:assert/strict';
import { canStartRun, computePackReady, createEmptyPack, withProgress } from './offlinePack';

const empty = createEmptyPack('r1');
assert.equal(canStartRun(empty), false);
assert.equal(computePackReady(empty), false);

let pack = withProgress(empty, { geometry: true, storiesText: true });
assert.equal(pack.ready, false);
assert.ok(pack.progress > 0);

pack = withProgress(pack, { mapTiles: true });
assert.equal(pack.ready, true);
assert.equal(canStartRun(pack), true);

// Audio optional
pack = withProgress(pack, { audio: false });
assert.equal(canStartRun(pack), true);

assert.equal(canStartRun(null), false);

// Pack parcial (p.ej. red caída mid-download) no habilita START
const partial = withProgress(createEmptyPack('r2'), {
  geometry: true,
  storiesText: true,
});
assert.equal(partial.ready, false);
assert.equal(canStartRun(partial), false);

console.log('offlinePack tests: ok');
