#!/usr/bin/env node
/**
 * Leaderboard "better run" logic — must match SQL _is_better_run / submit_best_score.
 * Run: node scripts/test_leaderboard_rank.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function sqlIsBetterRun(a, b) {
  if (!b) return true;
  const ac = a.correct | 0;
  const bc = b.correct | 0;
  const ai = a.incorrect | 0;
  const bi = b.incorrect | 0;
  const ad = a.durationSec | 0;
  const bd = b.durationSec | 0;
  if (ac > bc) return true;
  if (ac < bc) return false;
  if (ai < bi) return true;
  if (ai > bi) return false;
  return ad < bd;
}

const ctx = { window: {}, console };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/leaderboard.js'), 'utf8'), ctx, {
  filename: 'leaderboard.js'
});

const { isBetterRun } = ctx.window.kiezLeaderboard;

let failed = 0;
function assert(label, got, expected) {
  if (got !== expected) {
    console.error(`FAIL: ${label} — got ${got}, expected ${expected}`);
    failed += 1;
  } else {
    console.log(`ok: ${label}`);
  }
}

assert('higher correct wins', isBetterRun({ correct: 10, incorrect: 2, durationSec: 60 }, { correct: 9, incorrect: 0, durationSec: 10 }), true);
assert('lower correct loses', isBetterRun({ correct: 8, incorrect: 0, durationSec: 5 }, { correct: 9, incorrect: 5, durationSec: 100 }), false);
assert('same correct, fewer incorrect', isBetterRun({ correct: 10, incorrect: 1, durationSec: 90 }, { correct: 10, incorrect: 2, durationSec: 10 }), true);
assert('same correct, more incorrect loses', isBetterRun({ correct: 10, incorrect: 3, durationSec: 5 }, { correct: 10, incorrect: 2, durationSec: 200 }), false);
assert('tie score, faster time', isBetterRun({ correct: 10, incorrect: 2, durationSec: 50 }, { correct: 10, incorrect: 2, durationSec: 51 }), true);
assert('tie score, slower time loses', isBetterRun({ correct: 10, incorrect: 2, durationSec: 52 }, { correct: 10, incorrect: 2, durationSec: 51 }), false);
assert('no existing always better', isBetterRun({ correct: 1, incorrect: 9, durationSec: 999 }, null), true);

assert('matches SQL higher correct', isBetterRun({ correct: 10, incorrect: 2, durationSec: 60 }, { correct: 9, incorrect: 0, durationSec: 10 }), sqlIsBetterRun({ correct: 10, incorrect: 2, durationSec: 60 }, { correct: 9, incorrect: 0, durationSec: 10 }));
assert('matches SQL fewer incorrect', isBetterRun({ correct: 10, incorrect: 1, durationSec: 90 }, { correct: 10, incorrect: 2, durationSec: 10 }), sqlIsBetterRun({ correct: 10, incorrect: 1, durationSec: 90 }, { correct: 10, incorrect: 2, durationSec: 10 }));
assert('matches SQL faster time', isBetterRun({ correct: 10, incorrect: 2, durationSec: 50 }, { correct: 10, incorrect: 2, durationSec: 51 }), sqlIsBetterRun({ correct: 10, incorrect: 2, durationSec: 50 }, { correct: 10, incorrect: 2, durationSec: 51 }));

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll leaderboard rank tests passed.');
