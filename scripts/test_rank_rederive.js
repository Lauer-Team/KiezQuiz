#!/usr/bin/env node
/**
 * Rank threshold change: XP/trophies/boroughs must be preserved; level re-derived only.
 * Run: node scripts/test_rank_rederive.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RANK_THRESHOLDS = [
  { level: 1, minXp: 0, maxXp: 99 },
  { level: 2, minXp: 100, maxXp: 249 },
  { level: 3, minXp: 250, maxXp: 499 },
  { level: 4, minXp: 500, maxXp: 799 },
  { level: 5, minXp: 800, maxXp: 1199 },
  { level: 6, minXp: 1200, maxXp: 1699 },
  { level: 7, minXp: 1700, maxXp: 2299 },
  { level: 8, minXp: 2300, maxXp: 2999 },
  { level: 9, minXp: 3000, maxXp: 3999 },
  { level: 10, minXp: 4000, maxXp: Infinity }
];

function calculateLevel(xp) {
  let currentLvl = 1;
  for (const rank of RANK_THRESHOLDS) {
    if (xp >= rank.minXp) currentLvl = rank.level;
  }
  return currentLvl;
}

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
      getCity: (id) => ({ id, status: 'playable', progression: BEZIRKE, totalTrophies: 11 })
    }
  }
};

function load(file) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}

load('src/cityRegistry.js');
load('src/saveManager.js');

const save = {
  saveVersion: 2,
  global: { xp: 500, streak: 1, bestStreak: 1, rankSeen: 2, muted: false },
  lastCity: 'hamburg',
  cities: {
    hamburg: {
      unlockedRegionIndex: 2,
      progressionMode: true,
      highScore: 500,
      trophies: ['master_altona', 'neuwerk_island'],
      regionProgress: { Altona: ['Ottensen'] },
      gameHistory: []
    }
  },
  savedAt: new Date().toISOString()
};

localStorage.setItem('kiezquiz_save_v2', JSON.stringify(save));
const loaded = ctx.window.saveManager.loadSave();

const fails = [];
function ok(cond, msg) {
  if (!cond) fails.push(msg);
}

ok(loaded.global.xp === 500, 'stored XP unchanged after load');
ok(calculateLevel(loaded.global.xp) === 4, '500 XP maps to global level 4 (not reset)');
ok(loaded.cities.hamburg.trophies.length === 2, 'trophies preserved');
ok(loaded.cities.hamburg.unlockedRegionIndex === 2, 'unlocked borough index preserved');
ok(loaded.cities.hamburg.regionProgress.Altona.length === 1, 'district progress preserved');

if (fails.length) {
  console.error('Rank re-derive test FAILED:');
  fails.forEach((f) => console.error(' -', f));
  process.exit(1);
}
console.log('Rank re-derive test passed.');
