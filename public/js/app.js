// Main application — wires together all modules
// ================================================

import { state, channelName, wheelId } from './state.js';
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

  // --- BroadcastChannel: remote control support ---
  // Allows a separate control.html tab (same origin, same browser)
  // to trigger spins and receive results. This is how the streamer
  // controls the OBS overlay from another tab.
  try {
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (e) => {
      if (e.data?.type === 'spin') triggerSpin();
    };
    // Broadcast results back so the control page can show them
    state.subscribe(() => {
      if (state.currentWinner) {
        channel.postMessage({ type: 'result', winner: state.currentWinner });
      }
    });
  } catch {
    // BroadcastChannel not supported — remote control won't work, that's OK
  }

  // Overlay mode is purely URL-driven — not persisted to localStorage.
  // Normal URL = always shows controls. ?overlay=true = always hides them.
  // This prevents visiting the overlay URL from "infecting" the control view.
  const params = new URLSearchParams(window.location.search);
  const isOverlay = params.get('overlay') === 'true';
  state.showControls = !isOverlay;  // Set directly, don't persist
  const ctrl = document.getElementById('setting-controls');
  if (ctrl) ctrl.checked = !isOverlay;
  applyControlsVisibility(!isOverlay);

  // --- API sync ---
  if (isOverlay) {
    // OVERLAY: poll for spin signals AND option changes from the editor
    startOverlayPolling();
  } else {
    // EDITOR: push option changes to the API so the overlay picks them up
    startEditorSync();
    // Also poll for spin signals (for same-browser remote control)
    startSpinPolling();
  }
}

let lastSpinTs = 0;
let lastOptionsTs = 0;

function startSpinPolling() {
  setInterval(async () => {
    if (state.isSpinning) return;
    try {
      const res = await fetch(`/api/spin?wheel=${encodeURIComponent(wheelId)}&after=${lastSpinTs}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.spin && data.ts > lastSpinTs) {
        lastSpinTs = data.ts;
        triggerSpin();
      }
    } catch {
      // API not available — silently ignore
    }
  }, 1000);
}

function startOverlayPolling() {
  // Poll for both spin signals and option changes
  setInterval(async () => {
    try {
      // Check for spin signal
      if (!state.isSpinning) {
        const spinRes = await fetch(`/api/spin?wheel=${encodeURIComponent(wheelId)}&after=${lastSpinTs}`);
        if (spinRes.ok) {
          const spinData = await spinRes.json();
          if (spinData.spin && spinData.ts > lastSpinTs) {
            lastSpinTs = spinData.ts;
            triggerSpin();
          }
        }
      }

      // Check for option updates from the editor
      const optRes = await fetch(`/api/options?wheel=${encodeURIComponent(wheelId)}`);
      if (optRes.ok) {
        const optData = await optRes.json();
        if (optData.updatedAt && optData.updatedAt > lastOptionsTs) {
          lastOptionsTs = optData.updatedAt;
          if (optData.options) {
            state.options = optData.options;
          }
          if (optData.settings) {
            Object.assign(state.settings, optData.settings);
          }
          // Trigger re-render without saving back to API
          state._notify();
        }
      }
    } catch {
      // API not available — silently ignore
    }
  }, 1000);
}

// Debounced push of options to API whenever the editor changes them
function startEditorSync() {
  let syncTimeout = null;
  state.subscribe(() => {
    // Don't sync while spinning (would push mid-spin state)
    if (state.isSpinning) return;
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      pushOptionsToAPI();
    }, 500); // debounce: wait 500ms after last change
  });
  // Push current state immediately on load
  pushOptionsToAPI();
}

async function pushOptionsToAPI() {
  try {
    await fetch('/api/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wheel: wheelId,
        options: state.options,
        settings: state.settings,
      }),
    });
  } catch {
    // API not available — silently ignore
  }
}

// --- Spin logic ---

function triggerSpin() {
  if (!state.canSpin) return;

  const enabled = state.enabledOptions;
  const n = enabled.length;

  // 1. Pick winner first (deterministic).
  // Rigged: if "marbles" is on the wheel, it wins exactly 1/5 of spins.
  // The other 4/5 is distributed uniformly across the non-marbles options.
  const marblesIdx = enabled.findIndex(o => o.label.trim().toLowerCase() === 'marbles');
  let winnerIndex;
  if (marblesIdx !== -1 && n > 1) {
    if (Math.random() < 0.2) {
      winnerIndex = marblesIdx;
    } else {
      const pool = enabled.map((_, i) => i).filter(i => i !== marblesIdx);
      winnerIndex = pool[Math.floor(Math.random() * pool.length)];
    }
  } else {
    winnerIndex = Math.floor(Math.random() * n);
  }
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
