#!/usr/bin/env node
/**
 * Quick migration smoke test (no browser).
 * Run: node scripts/test_migration_v2.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const store = {};
const localStorage = {
  getItem(k) { return store[k] ?? null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};

const BEZIRKE = [
  { name: 'Altona', xpNeeded: 0 },
  { name: 'Eimsbüttel', xpNeeded: 50 }
];

const ctx = {
  localStorage,
  console,
  window: {
    KQ_DATA: { cities: [], BEZIRKE_PROGRESSION: BEZIRKE },
    cityRegistry: {
      getBezirkeProgression: () => BEZIRKE,
      segmentToLevelKey: (seg) => (seg === 'BEZIRKE' ? 'bezirke' : 'stadtteile'),
      levelKeyToSegment: (k) => (k === 'bezirke' ? 'BEZIRKE' : 'STADTTEILE'),
      getCity: () => ({ progression: BEZIRKE })
    }
  }
};
ctx.window.saveManager = null;

function load(file) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInNewContext(code, ctx, { filename: file });
}

load('src/cityRegistry.js');
load('src/saveManager.js');

// Simulate v1 user
localStorage.setItem('hh_xp', '500');
localStorage.setItem('hh_streak', '3');
localStorage.setItem('hh_best_streak', '7');
localStorage.setItem('hh_highscore', '500');
localStorage.setItem('hh_unlocked_bz_idx', '2');
localStorage.setItem('hh_trophies', JSON.stringify(['neuwerk_island', 'island_finder', 'master_altona']));
localStorage.setItem('hh_progress_Altona', JSON.stringify(['Altona', 'Ottensen']));
localStorage.setItem('hh_segment', 'STADTTEILE');
localStorage.setItem('hh_mode', 'EXPLORER');

const save = ctx.window.saveManager.loadSave();

const asserts = [];
function ok(cond, msg) {
  if (!cond) asserts.push(msg);
}

ok(save.saveVersion === 2, 'saveVersion should be 2');
ok(save.global.xp === 500, 'global xp migrated');
ok(save.lastCity === 'hamburg', 'lastCity hamburg for migrated user');
ok(save.cities.hamburg.trophies.includes('neuwerk_island'), 'neuwerk_island kept');
ok(!save.cities.hamburg.trophies.includes('island_finder'), 'island_finder aliased away');
ok(save.cities.hamburg.regionProgress.Altona.length === 2, 'region progress migrated');
ok(localStorage.getItem('hh_xp') === '500', 'legacy hh_xp kept as backup');
ok(localStorage.getItem('kiezquiz_save_v2'), 'v2 key written');
ok(ctx.window.saveManager.getInitialView(save) === 'city', 'migrated user starts in city');

if (asserts.length) {
  console.error('Migration test FAILED:');
  asserts.forEach((a) => console.error(' -', a));
  process.exit(1);
}
console.log('Migration test passed (' + Object.keys(asserts).length + ' checks).');
