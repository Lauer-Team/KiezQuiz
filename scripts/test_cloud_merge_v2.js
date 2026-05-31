#!/usr/bin/env node
/**
 * Cloud merge smoke test (no browser).
 * Run: node scripts/test_cloud_merge_v2.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const BEZIRKE = [
  { name: 'Altona', xpNeeded: 0 },
  { name: 'Eimsbüttel', xpNeeded: 50 },
  { name: 'Hamburg-Nord', xpNeeded: 150 }
];

const ctx = {
  console,
  window: {
    KQ_DATA: { cities: [], BEZIRKE_PROGRESSION: BEZIRKE },
    cityRegistry: {
      getBezirkeProgression: () => BEZIRKE,
      segmentToLevelKey: (seg) => (seg === 'BEZIRKE' ? 'bezirke' : 'stadtteile'),
      levelKeyToSegment: (k) => (k === 'bezirke' ? 'BEZIRKE' : 'STADTTEILE'),
      getCity: () => ({ progression: BEZIRKE })
    },
    saveManager: null
  }
};

function load(file) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}

load('src/cityRegistry.js');
load('src/saveManager.js');
vm.runInNewContext(
  fs.readFileSync(path.join(root, 'src/cloudSync.js'), 'utf8') + '\nwindow.CloudSync = CloudSync;',
  ctx,
  { filename: 'src/cloudSync.js' }
);

const sync = new ctx.window.CloudSync({ isConfigured: () => false, isLoggedIn: () => false }, null);

const local = {
  saveVersion: 2,
  global: { xp: 500, streak: 3, bestStreak: 5, rankSeen: 2, muted: false },
  lastCity: 'hamburg',
  cities: {
    hamburg: {
      unlockedRegionIndex: 1,
      progressionMode: true,
      highScore: 100,
      trophies: ['master_altona'],
      regionProgress: { Altona: ['Ottensen'] },
      gameHistory: []
    }
  },
  savedAt: '2026-01-01T00:00:00.000Z'
};

const cloud = {
  saveVersion: 2,
  global: { xp: 800, streak: 2, bestStreak: 10, rankSeen: 3, muted: true },
  lastCity: 'hamburg',
  cities: {
    hamburg: {
      unlockedRegionIndex: 2,
      progressionMode: true,
      highScore: 200,
      trophies: ['neuwerk_island', 'island_finder'],
      regionProgress: { Altona: ['Altona-Altstadt'], Eimsbüttel: ['Eppendorf'] },
      gameHistory: [{ date: '2026-02-01T00:00:00.000Z', mode: 'QUIZ', correct: 5, total: 10, percent: 50 }]
    }
  },
  savedAt: '2026-02-01T00:00:00.000Z'
};

const merged = sync.mergeSaves(local, cloud);
const fails = [];

function ok(cond, msg) {
  if (!cond) fails.push(msg);
}

ok(merged.global.xp === 800, 'global xp = max');
ok(merged.global.bestStreak === 10, 'global bestStreak = max');
ok(merged.cities.hamburg.unlockedRegionIndex === 2, 'city unlock index = max');
ok(merged.cities.hamburg.trophies.includes('master_altona'), 'local trophy kept');
ok(merged.cities.hamburg.trophies.includes('neuwerk_island'), 'cloud trophy kept');
ok(!merged.cities.hamburg.trophies.includes('island_finder'), 'island_finder aliased');
ok(merged.cities.hamburg.regionProgress.Altona.length === 2, 'regionProgress union');
ok(merged.cities.hamburg.highScore === 200, 'highScore = max');

if (fails.length) {
  console.error('Cloud merge test FAILED:');
  fails.forEach((f) => console.error(' -', f));
  process.exit(1);
}
console.log('Cloud merge test passed.');
