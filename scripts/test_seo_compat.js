#!/usr/bin/env node
/**
 * SEO compatibility checks: save key unchanged, deep-link lastCity guard.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const saveManagerSrc = fs.readFileSync(path.join(root, 'src/saveManager.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const bootSrc = fs.readFileSync(path.join(root, 'src/bootView.js'), 'utf8');

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
}

assert(saveManagerSrc.includes("const SAVE_KEY = 'kiezquiz_save_v2'"), 'SAVE_KEY unchanged');
assert(!saveManagerSrc.includes('clearSave()') || saveManagerSrc.includes('function clearSave'), 'clearSave still present');
assert(appSrc.includes('hadProgress') && appSrc.includes('prevLastCity'), 'deep link guards lastCity for returning players');
assert(appSrc.includes('.trim().toLowerCase()'), 'deep link normalizes city param');
assert(appSrc.includes('game.init();') && appSrc.includes('void (async'), 'game init not blocked on auth');
assert(appSrc.includes('_sessionCityOverride'), 'deep link session city override');
assert(appSrc.includes('} else if (_previousAuthUser) {'), 'guest auth does not reset on duplicate null session');
assert(!appSrc.includes('_previousAuthUser !== undefined'), 'removed duplicate null-session reset');
assert(appSrc.includes('_loadedMapCityId'), 'map tracks loaded city for resync');
assert(appSrc.includes('history.replaceState'), 'deep link cleans URL after load');
assert(bootSrc.includes('kiezquiz_save_v2'), 'bootView reads v2 save');
assert(bootSrc.includes('hasV1Save'), 'bootView detects v1 migration candidates');
assert(fs.existsSync(path.join(root, 'index.html')), 'index.html exists');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(indexHtml.includes('src/bootView.js'), 'index.html loads bootView.js');
assert(indexHtml.includes('seo-hub-fallback'), 'SEO fallback content still in DOM for crawlers');
assert(indexHtml.includes('id="hub-view"') && indexHtml.includes('hidden'), 'hub starts hidden to avoid flash');

if (failed) {
  process.exit(1);
}
console.log('\nAll SEO compatibility checks passed.');
