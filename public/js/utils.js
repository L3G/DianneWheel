// Utility functions for DianneWheel
// ===================================

/**
 * Generate a short unique ID (8 chars, alphanumeric).
 * No external dependency — uses crypto.getRandomValues for good entropy.
 */
export function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

/**
 * Curated color palette — visually distinct, high-contrast, streamer-friendly.
 * These cycle predictably so the wheel always looks good regardless of entry count.
 */
export const PALETTE = [
  '#FF6B6B', // coral red
  '#4ECDC4', // teal
  '#FFE66D', // warm yellow
  '#A78BFA', // lavender purple
  '#FB923C', // orange
  '#38BDF8', // sky blue
  '#F472B6', // pink
  '#34D399', // emerald
  '#FACC15', // gold
  '#818CF8', // indigo
  '#F87171', // light red
  '#22D3EE', // cyan
  '#C084FC', // violet
  '#FB7185', // rose
  '#2DD4BF', // teal-green
  '#FCD34D', // amber
  '#60A5FA', // blue
  '#A3E635', // lime
  '#E879F9', // fuchsia
  '#94A3B8', // slate
];

/**
 * Get the color for an entry at a given index, falling back to the palette cycle.
 */
export function getColor(entry, index) {
  return entry.color || PALETTE[index % PALETTE.length];
}

/**
 * Pick a contrasting text color (black or white) for a given background hex.
 * Uses relative luminance calculation per WCAG guidelines.
 */
export function contrastText(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a2e' : '#ffffff';
}

/**
 * Default sample entries for first-time use or reset.
 */
export function sampleEntries() {
  return [
    { id: generateId(), label: 'Play a horror game', enabled: true },
    { id: generateId(), label: 'Song request', enabled: true },
    { id: generateId(), label: 'Tell a scary story', enabled: true },
    { id: generateId(), label: '10 pushups', enabled: true },
    { id: generateId(), label: 'Viewer picks next game', enabled: true },
    { id: generateId(), label: 'Speed run challenge', enabled: true },
    { id: generateId(), label: 'No commentary round', enabled: true },
    { id: generateId(), label: 'Wheel picks again!', enabled: true },
  ];
}

/**
 * Default settings.
 */
export function defaultSettings() {
  return {
    spinDurationMs: 5000,
    showConfetti: true,
    soundEnabled: true,
    transparentBackground: false,
    equalProbability: true,
  };
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
