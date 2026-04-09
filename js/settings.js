// Settings panel logic
// ======================

import { state } from './state.js';

export function initSettings() {
  const panel = document.getElementById('settings-panel');
  const toggleBtn = document.getElementById('settings-toggle');

  // Toggle settings panel visibility
  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', panel.classList.contains('open'));
  });

  // Spin duration slider
  const durationSlider = document.getElementById('spin-duration');
  const durationLabel = document.getElementById('spin-duration-label');
  durationSlider.value = state.settings.spinDurationMs;
  durationLabel.textContent = (state.settings.spinDurationMs / 1000).toFixed(1) + 's';

  durationSlider.addEventListener('input', () => {
    const ms = parseInt(durationSlider.value, 10);
    durationLabel.textContent = (ms / 1000).toFixed(1) + 's';
    state.updateSettings({ spinDurationMs: ms });
  });

  // Confetti toggle
  const confettiCheck = document.getElementById('setting-confetti');
  confettiCheck.checked = state.settings.showConfetti;
  confettiCheck.addEventListener('change', () => {
    state.updateSettings({ showConfetti: confettiCheck.checked });
  });

  // Sound toggle
  const soundCheck = document.getElementById('setting-sound');
  soundCheck.checked = state.settings.soundEnabled;
  soundCheck.addEventListener('change', () => {
    state.updateSettings({ soundEnabled: soundCheck.checked });
  });

  // Transparent background toggle
  const transparentCheck = document.getElementById('setting-transparent');
  transparentCheck.checked = state.settings.transparentBackground;
  transparentCheck.addEventListener('change', () => {
    state.updateSettings({ transparentBackground: transparentCheck.checked });
    applyTransparent(transparentCheck.checked);
  });

  // Show controls toggle
  const controlsCheck = document.getElementById('setting-controls');
  controlsCheck.checked = state.showControls;
  controlsCheck.addEventListener('change', () => {
    state.setShowControls(controlsCheck.checked);
    applyControlsVisibility(controlsCheck.checked);
  });

  // Export JSON
  document.getElementById('export-btn').addEventListener('click', () => {
    const json = state.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diannewheel-config.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import JSON
  const importInput = document.getElementById('import-input');
  document.getElementById('import-btn').addEventListener('click', () => {
    importInput.click();
  });
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state.importJSON(reader.result);
        showNotice('Configuration imported!');
      } catch (err) {
        showNotice('Invalid JSON file', true);
      }
    };
    reader.readAsText(file);
    importInput.value = '';
  });

  // Reset all
  document.getElementById('reset-all-btn').addEventListener('click', () => {
    if (confirm('Reset everything to defaults? This cannot be undone.')) {
      state.resetAll();
      // Re-sync UI controls
      durationSlider.value = state.settings.spinDurationMs;
      durationLabel.textContent = (state.settings.spinDurationMs / 1000).toFixed(1) + 's';
      confettiCheck.checked = state.settings.showConfetti;
      soundCheck.checked = state.settings.soundEnabled;
      transparentCheck.checked = state.settings.transparentBackground;
      controlsCheck.checked = state.showControls;
      applyTransparent(false);
      applyControlsVisibility(true);
      showNotice('Reset to defaults');
    }
  });

  // Clear history
  document.getElementById('clear-history-btn').addEventListener('click', () => {
    state.clearHistory();
  });

  // Apply initial states
  applyTransparent(state.settings.transparentBackground);
  applyControlsVisibility(state.showControls);
}

function applyTransparent(on) {
  document.body.classList.toggle('transparent-bg', on);
}

export function applyControlsVisibility(show) {
  // Toggle overlay mode on body — CSS handles hiding everything
  document.body.classList.toggle('overlay-mode', !show);
  // Trigger wheel resize after layout shift
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
}

function showNotice(msg, isError = false) {
  const el = document.getElementById('notice');
  el.textContent = msg;
  el.className = `notice show ${isError ? 'error' : 'success'}`;
  setTimeout(() => { el.className = 'notice'; }, 2500);
}
