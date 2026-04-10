// Centralized state management for DianneWheel
// ===============================================
// Pattern: single mutable state object + listener callbacks.
// All mutations go through methods here so any trigger source
// (button, keyboard, window.spinWheel, future websocket) produces
// consistent behavior.

import { generateId, sampleEntries, defaultSettings } from './utils.js';

/**
 * Read the ?wheel= URL param to determine which wheel instance this is.
 * Each wheel ID gets its own localStorage key and BroadcastChannel,
 * so multiple wheels (e.g. "val", "horror") are fully independent.
 */
const params = new URLSearchParams(window.location.search);
export const wheelId = params.get('wheel') || 'default';
export const storageKey = wheelId === 'default'
  ? 'diannewheel_state'
  : `diannewheel_state_${wheelId}`;
export const channelName = wheelId === 'default'
  ? 'diannewheel'
  : `diannewheel_${wheelId}`;

class AppState {
  constructor() {
    this.options = [];
    this.settings = defaultSettings();
    this.history = [];
    this.currentWinner = null;
    this.isSpinning = false;
    this.showControls = true;
    this.wheelId = wheelId;
    this._listeners = new Set();
    this._storageAvailable = null; // lazy check
  }

  // --- Listener pattern ---

  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   * Listeners receive the full state reference — they decide what to re-render.
   */
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn(this); } catch (e) { console.error('State listener error:', e); }
    }
    this._trySave();
  }

  // --- Options CRUD ---

  addOption(label) {
    const trimmed = (label || '').trim();
    if (!trimmed) return null;
    const entry = {
      id: generateId(),
      label: trimmed,
      color: undefined,
      weight: 1,
      enabled: true,
    };
    this.options.push(entry);
    this._notify();
    return entry;
  }

  removeOption(id) {
    this.options = this.options.filter(o => o.id !== id);
    this._notify();
  }

  updateOption(id, changes) {
    const opt = this.options.find(o => o.id === id);
    if (!opt) return;
    Object.assign(opt, changes);
    this._notify();
  }

  toggleOption(id) {
    const opt = this.options.find(o => o.id === id);
    if (!opt) return;
    opt.enabled = !opt.enabled;
    this._notify();
  }

  reorderOptions(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [moved] = this.options.splice(fromIndex, 1);
    this.options.splice(toIndex, 0, moved);
    this._notify();
  }

  clearAllOptions() {
    this.options = [];
    this._notify();
  }

  resetToSample() {
    this.options = sampleEntries();
    this._notify();
  }

  // --- Enabled entries helper ---

  get enabledOptions() {
    return this.options.filter(o => o.enabled);
  }

  get canSpin() {
    return !this.isSpinning && this.enabledOptions.length >= 2;
  }

  // --- Spin state ---

  startSpin() {
    this.isSpinning = true;
    this.currentWinner = null;
    this._notify();
  }

  endSpin(winner) {
    this.isSpinning = false;
    this.currentWinner = {
      optionId: winner.id,
      label: winner.label,
      timestamp: new Date().toISOString(),
    };
    this.history.unshift(this.currentWinner);
    // Keep last 20 results
    if (this.history.length > 20) this.history.length = 20;
    this._notify();
  }

  clearHistory() {
    this.history = [];
    this.currentWinner = null;
    this._notify();
  }

  // --- Settings ---

  updateSettings(changes) {
    Object.assign(this.settings, changes);
    this._notify();
  }

  // --- Controls visibility ---

  setShowControls(show) {
    this.showControls = show;
    this._notify();
  }

  // --- Persistence (best-effort localStorage) ---

  _isStorageAvailable() {
    if (this._storageAvailable !== null) return this._storageAvailable;
    try {
      const key = '__dw_test__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      this._storageAvailable = true;
    } catch {
      this._storageAvailable = false;
    }
    return this._storageAvailable;
  }

  _trySave() {
    if (!this._isStorageAvailable()) return;
    try {
      const data = {
        options: this.options,
        settings: this.settings,
        history: this.history,
        // showControls intentionally NOT saved — overlay mode is URL-driven
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // Silently fail — storage is optional
    }
  }

  tryLoad() {
    if (!this._isStorageAvailable()) return false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.options && Array.isArray(data.options)) {
        this.options = data.options;
      }
      if (data.settings) {
        this.settings = { ...defaultSettings(), ...data.settings };
      }
      if (data.history && Array.isArray(data.history)) {
        this.history = data.history;
      }
      // showControls intentionally NOT loaded — overlay mode is URL-driven
      return true;
    } catch {
      return false;
    }
  }

  // --- JSON export/import (manual persistence) ---

  exportJSON() {
    return JSON.stringify({
      options: this.options,
      settings: this.settings,
      history: this.history,
    }, null, 2);
  }

  importJSON(jsonString) {
    const data = JSON.parse(jsonString); // caller should catch
    if (data.options && Array.isArray(data.options)) {
      this.options = data.options;
    }
    if (data.settings) {
      this.settings = { ...defaultSettings(), ...data.settings };
    }
    if (data.history && Array.isArray(data.history)) {
      this.history = data.history;
    }
    this._notify();
  }

  // --- Full reset ---

  resetAll() {
    this.options = sampleEntries();
    this.settings = defaultSettings();
    this.history = [];
    this.currentWinner = null;
    this.isSpinning = false;
    this.showControls = true;
    this._notify();
  }
}

// Singleton — all modules import the same instance
export const state = new AppState();
