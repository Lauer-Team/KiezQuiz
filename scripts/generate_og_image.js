#!/usr/bin/env node
/** Render scripts/generate_og_image.html to assets/og-image.jpg (1200×630). */
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'scripts', 'generate_og_image.html');
const OUT = path.join(ROOT, 'assets', 'og-image.jpg');

async function main() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (_) {
    playwright = require('playwright-core');
  }

  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file://' + HTML, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const buffer = await page.screenshot({ type: 'jpeg', quality: 92 });
  fs.writeFileSync(OUT, buffer);
  await browser.close();
  console.log('Wrote', OUT, '(' + buffer.length + ' bytes)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
