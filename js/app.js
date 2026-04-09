// Main application — wires together all modules
// ================================================

import { state } from './state.js';
import { wheel } from './wheel.js';
import { initEditor, renderList } from './editor.js';
import { initSettings, applyControlsVisibility } from './settings.js';
import { fireConfetti } from './confetti.js';
import { playTick, playWin } from './sounds.js';

// --- Initialization ---

function init() {
  // Try to restore from localStorage (best-effort)
  const loaded = state.tryLoad();
  if (!loaded || state.options.length === 0) {
    state.resetToSample();
  }

  initEditor();
  initSettings();
  renderList();
  wheel.draw();

  // Re-draw wheel on any state change
  state.subscribe(() => {
    wheel.draw();
    renderHistory();
    renderWinner();
    updateSpinButton();
  });

  // Initial renders
  renderHistory();
  renderWinner();
  updateSpinButton();

  // --- Spin triggers ---

  // On-screen Spin button (primary trigger)
  document.getElementById('spin-btn').addEventListener('click', triggerSpin);

  // Click on wheel also spins
  document.getElementById('wheel-canvas').addEventListener('click', triggerSpin);

  // Spacebar (convenience trigger for focused browser tab)
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;

    // CRITICAL: Don't steal spacebar from text inputs
    const tag = e.target.tagName;
    const editable = e.target.isContentEditable;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) {
      return; // Let the input handle it normally
    }

    e.preventDefault();
    triggerSpin();
  });

  // Expose global trigger for future automation
  // (Stream Deck, Mix It Up, Firebot, websocket, etc.)
  window.spinWheel = triggerSpin;

  // URL param: ?overlay=true activates OBS overlay mode
  // This hides all controls and shows just the wheel, centered and fullscreen.
  // Use as OBS Browser Source: http://yoursite.com/?overlay=true
  const params = new URLSearchParams(window.location.search);
  if (params.get('overlay') === 'true') {
    state.setShowControls(false);
    const ctrl = document.getElementById('setting-controls');
    if (ctrl) ctrl.checked = false;
    applyControlsVisibility(false);
  }
}

// --- Spin logic ---

function triggerSpin() {
  if (!state.canSpin) return;

  const enabled = state.enabledOptions;
  const n = enabled.length;

  // 1. Pick winner first (deterministic)
  const winnerIndex = Math.floor(Math.random() * n);
  const winner = enabled[winnerIndex];

  // 2. Start spin state
  state.startSpin();

  // 3. Animate wheel to land on winner
  const duration = state.settings.spinDurationMs;

  // Tick sounds during spin
  let tickInterval = null;
  if (state.settings.soundEnabled) {
    let tickRate = 50;
    tickInterval = setInterval(() => {
      playTick();
    }, tickRate);

    // Slow down ticks as spin decelerates
    const slowDown = setInterval(() => {
      tickRate = Math.min(tickRate + 15, 300);
      clearInterval(tickInterval);
      tickInterval = setInterval(() => playTick(), tickRate);
    }, duration / 8);

    // Stop ticks near end
    setTimeout(() => {
      clearInterval(slowDown);
      clearInterval(tickInterval);
      tickInterval = null;
    }, duration - 200);
  }

  wheel.spin(winner, winnerIndex, duration, () => {
    // Clean up any remaining tick interval
    if (tickInterval) clearInterval(tickInterval);

    // End spin — updates state, adds to history
    state.endSpin(winner);

    // Celebration effects
    if (state.settings.showConfetti) {
      fireConfetti();
    }
    if (state.settings.soundEnabled) {
      playWin();
    }
  });
}

// --- UI renderers ---

function renderWinner() {
  const banner = document.getElementById('winner-banner');
  const text = document.getElementById('winner-text');

  if (state.currentWinner) {
    text.textContent = state.currentWinner.label;
    banner.classList.add('show');
    banner.classList.remove('hidden');
  } else {
    banner.classList.remove('show');
  }
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  if (state.history.length === 0) {
    list.innerHTML = '<div class="history-empty">No spins yet</div>';
    return;
  }

  list.innerHTML = state.history.slice(0, 10).map((result, i) => {
    const time = new Date(result.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<div class="history-item ${i === 0 ? 'latest' : ''}">
      <span class="history-label">${escapeHtml(result.label)}</span>
      <span class="history-time">${timeStr}</span>
    </div>`;
  }).join('');
}

function updateSpinButton() {
  const btn = document.getElementById('spin-btn');
  if (state.isSpinning) {
    btn.disabled = true;
    btn.textContent = 'Spinning...';
  } else if (state.enabledOptions.length < 2) {
    btn.disabled = true;
    btn.textContent = 'Need 2+ options';
  } else {
    btn.disabled = false;
    btn.textContent = 'SPIN';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Boot ---

document.addEventListener('DOMContentLoaded', init);
