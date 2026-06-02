/* KiezQuiz confetti, overlays, path helpers */
function snapCoord(n) {
  return Math.round(n * 10) / 10;
}

function segmentKey(x1, y1, x2, y2) {
  const a = `${snapCoord(x1)},${snapCoord(y1)}`;
  const b = `${snapCoord(x2)},${snapCoord(y2)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function parsePathSegments(d) {
  const segments = [];
  if (!d) return segments;

  const parts = d.trim().split(/(?=[MLZ])/i);
  let startPoint = null;
  let current = null;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const cmd = trimmed[0].toUpperCase();
    const nums = trimmed.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);

    if (cmd === 'M') {
      current = [nums[0], nums[1]];
      startPoint = [...current];
      for (let i = 2; i + 1 < nums.length; i += 2) {
        segments.push([current[0], current[1], nums[i], nums[i + 1]]);
        current = [nums[i], nums[i + 1]];
      }
    } else if (cmd === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        segments.push([current[0], current[1], nums[i], nums[i + 1]]);
        current = [nums[i], nums[i + 1]];
      }
    } else if (cmd === 'Z' && current && startPoint) {
      segments.push([current[0], current[1], startPoint[0], startPoint[1]]);
    }
  }
  return segments;
}

function launchSadEffects(soundManager) {
  if (soundManager) soundManager.playSad();
  const overlay = document.createElement('div');
  overlay.className = 'sad-overlay';
  document.body.appendChild(overlay);
  for (let i = 0; i < 18; i++) {
    const drop = document.createElement('div');
    drop.className = 'sad-raindrop';
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * 0.8}s`;
    drop.style.setProperty('--fall-dur', `${0.9 + Math.random() * 0.6}s`);
    overlay.appendChild(drop);
  }
  setTimeout(() => overlay.remove(), 2200);
}

let overlayScrollLockY = 0;

function openOverlayModal(html, { closeOnBackdrop = false } = {}) {
  const modal = document.createElement('div');
  modal.className = 'overlay-modal';
  modal.innerHTML = html;
  overlayScrollLockY = window.scrollY;
  document.body.style.top = `-${overlayScrollLockY}px`;
  document.body.classList.add('overlay-open');
  document.body.appendChild(modal);
  if (closeOnBackdrop) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOverlayModal(modal);
    });
  }
  return modal;
}

function closeOverlayModal(modal) {
  modal.remove();
  if (!document.querySelector('.overlay-modal')) {
    document.body.classList.remove('overlay-open');
    document.body.style.top = '';
    window.scrollTo(0, overlayScrollLockY);
  }
}

function closeTopOverlayModal() {
  const modals = document.querySelectorAll('.overlay-modal');
  const top = modals[modals.length - 1];
  if (top) closeOverlayModal(top);
  return !!top;
}

function setupGlobalEscapeHandler() {
  if (document.documentElement.dataset.kqEscapeBound === 'true') return;
  document.documentElement.dataset.kqEscapeBound = 'true';
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (closeTopOverlayModal()) {
      e.preventDefault();
      return;
    }
    const game = window.kiezQuizGame || window.hamburgGame;
    if (game?.view === 'city' && game.mapNav) {
      e.preventDefault();
      game.mapNav.reset();
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalEscapeHandler);
  } else {
    setupGlobalEscapeHandler();
  }
}

function launchConfetti(soundManager) {
  if (soundManager) soundManager.playApplause();
  const container = document.createElement('div');
  container.className = 'confetti-container';
  const colors = ['#22c55e', '#00a2ff', '#fbbf24', '#a855f7', '#ef4444', '#14b8a6'];
  for (let i = 0; i < 70; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.background = colors[i % colors.length];
    particle.style.animationDelay = `${Math.random() * 0.35}s`;
    particle.style.setProperty('--x-drift', `${(Math.random() - 0.5) * 140}px`);
    container.appendChild(particle);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 2600);
}

// Zoom & Pan System for interactive SVG
