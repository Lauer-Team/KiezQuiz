#!/usr/bin/env node
/**
 * SEO compatibility checks: save key unchanged, deep-link lastCity guard.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const saveManagerSrc = fs.readFileSync(path.join(root, 'src/saveManager.js'), 'utf8');
const gameSrc = fs.readFileSync(path.join(root, 'src/game/KiezQuizGame.js'), 'utf8');
const initSrc = fs.readFileSync(path.join(root, 'src/game/init.js'), 'utf8');
const bootSrc = fs.readFileSync(path.join(root, 'src/bootView.js'), 'utf8');
const routerSrc = fs.readFileSync(path.join(root, 'src/viewRouter.js'), 'utf8');

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
assert(gameSrc.includes('hadProgress') && gameSrc.includes('prevLastCity'), 'deep link guards lastCity for returning players');
assert(gameSrc.includes('.trim().toLowerCase()'), 'deep link normalizes city param');
assert(initSrc.includes('game.init();') && initSrc.includes('void (async'), 'game init not blocked on auth');
assert(gameSrc.includes('_sessionCityOverride'), 'deep link session city override');
assert(initSrc.includes('} else if (_previousAuthUser) {'), 'guest auth does not reset on duplicate null session');
assert(!initSrc.includes('_previousAuthUser !== undefined'), 'removed duplicate null-session reset');
assert(gameSrc.includes('_loadedMapCityId'), 'map tracks loaded city for resync');
assert(gameSrc.includes('history.replaceState'), 'deep link cleans URL after load');
assert(bootSrc.includes('kiezViewRouter'), 'bootView delegates to viewRouter');
assert(routerSrc.includes('kiezquiz_save_v2'), 'viewRouter reads v2 save');
assert(routerSrc.includes('cityFromPathname'), 'viewRouter detects city from pathname');
assert(routerSrc.includes('hasV1Save'), 'viewRouter detects v1 migration candidates');
assert(fs.existsSync(path.join(root, 'index.html')), 'index.html exists');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(indexHtml.includes('src/viewRouter.js'), 'index.html loads viewRouter.js');
assert(bootSrc.includes('kiezHubShell'), 'bootView injects hub shell before paint');
assert(routerSrc.includes('isHomePath'), 'viewRouter always opens hub on homepage');
assert(indexHtml.includes('src/ui/hubShell.js'), 'index.html loads hubShell.js');
assert(indexHtml.includes('src/bootView.js'), 'index.html loads bootView.js');
assert(indexHtml.includes('src/versionGuard.js'), 'index.html loads versionGuard.js');
assert(indexHtml.includes('src/bootstrap.js'), 'index.html loads bootstrap.js');
assert(!indexHtml.includes('src/data/hamburg_data.js'), 'city data not in initial HTML scripts');
assert(indexHtml.includes('seo-hub-fallback'), 'SEO fallback content still in DOM for crawlers');
assert(indexHtml.includes('id="hub-view"') && indexHtml.includes('hidden'), 'hub starts hidden to avoid flash');
assert(indexHtml.includes('hreflang="de"') && indexHtml.includes('hreflang="en"'), 'homepage hreflang tags');
assert(indexHtml.includes('FAQPage'), 'homepage FAQ schema');
assert(indexHtml.includes('<noscript>'), 'homepage noscript fallback');
assert(!indexHtml.includes('<!-- Inlined Map SVG -->'), 'inline Hamburg SVG removed from HTML');

const profileHtml = fs.readFileSync(path.join(root, 'profile/index.html'), 'utf8');
const profileCssIdx = profileHtml.indexOf('styles/brand.css');
const profileVgIdx = profileHtml.indexOf('versionGuard.js');
const profileHeadEnd = profileHtml.indexOf('</head>');
assert(profileVgIdx !== -1 && profileVgIdx > profileCssIdx, 'profile loads versionGuard after CSS');
assert(profileVgIdx < profileHeadEnd, 'profile versionGuard is in head');
assert(indexHtml.includes('name="kiezquiz-design"'), 'index.html has design meta');

for (const slug of ['hamburg', 'berlin', 'frankfurt']) {
  const cityHtml = fs.readFileSync(path.join(root, slug, 'index.html'), 'utf8');
  assert(cityHtml.includes('twitter:image'), `${slug} has twitter:image`);
  assert(cityHtml.includes('og:image:width'), `${slug} has og:image dimensions`);
  assert(cityHtml.includes('<base href="/">'), `${slug} has base href for assets`);
  assert(cityHtml.includes('src/viewRouter.js'), `${slug} loads viewRouter`);
  assert(cityHtml.includes('src/bootstrap.js'), `${slug} loads bootstrap`);
  assert(cityHtml.includes('FAQPage'), `${slug} has FAQ schema`);
  assert(!cityHtml.includes('Jetzt Hamburg spielen'), `${slug} is not a text-only landing page`);
}

if (failed) {
  process.exit(1);
}
const seoGen = fs.readFileSync(path.join(root, 'scripts/generate_seo_pages.py'), 'utf8');
assert(seoGen.includes('redesign.css'), 'generate_seo_pages keeps redesign.css in head template');
assert(seoGen.includes('device/phone.css'), 'generate_seo_pages keeps device/phone.css in head template');
assert(seoGen.includes('versionGuard.js'), 'generate_seo_pages keeps versionGuard.js');

if (failed) {
  process.exit(1);
}
console.log('\nAll SEO compatibility checks passed.');
