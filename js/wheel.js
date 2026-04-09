// Wheel rendering and spin animation
// =====================================
// Uses HTML5 Canvas for smooth 60fps animation.
// Deterministic spin: winner is chosen first, then the animation
// targets the exact angle that places that winner under the pointer.

import { state } from './state.js';
import { getColor, contrastText } from './utils.js';

const TAU = Math.PI * 2;

class Wheel {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.rotation = 0; // current rotation in radians
    this.animationId = null;
    this.dpr = window.devicePixelRatio || 1;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const container = this.canvas.parentElement;
    // Use clientWidth since aspect-ratio: 1 guarantees square container
    const size = container.clientWidth || 400;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.size = size;
    this.cx = size / 2;
    this.cy = size / 2;
    this.radius = size / 2 - 8; // small margin for visual breathing room
    this.draw();
  }

  /**
   * Draw the wheel at the current rotation angle.
   * Called on every frame during animation and after any state change.
   */
  draw() {
    const ctx = this.ctx;
    const entries = state.enabledOptions;
    const n = entries.length;

    ctx.clearRect(0, 0, this.size, this.size);

    if (n === 0) {
      this._drawEmpty();
      return;
    }

    const sliceAngle = TAU / n;

    // Draw slices
    for (let i = 0; i < n; i++) {
      const startAngle = this.rotation + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const color = getColor(entries[i], i);

      // Slice fill
      ctx.beginPath();
      ctx.moveTo(this.cx, this.cy);
      ctx.arc(this.cx, this.cy, this.radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Slice border
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      this._drawLabel(entries[i].label, startAngle, sliceAngle, color, n);
    }

    // Center circle (overlay)
    this._drawCenter();
  }

  _drawEmpty() {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius, 0, TAU);
    ctx.fillStyle = '#2a2a3e';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add at least 2 options', this.cx, this.cy - 10);
    ctx.fillText('to spin the wheel', this.cx, this.cy + 14);
  }

  _drawLabel(text, startAngle, sliceAngle, bgColor, totalSlices) {
    const ctx = this.ctx;
    const midAngle = startAngle + sliceAngle / 2;

    // Position label at ~65% radius for readability
    const labelRadius = this.radius * 0.65;
    const x = this.cx + Math.cos(midAngle) * labelRadius;
    const y = this.cy + Math.sin(midAngle) * labelRadius;

    ctx.save();
    ctx.translate(x, y);

    // Rotate text to follow the slice direction
    let textAngle = midAngle;
    // Flip text on left side so it's never upside-down
    if (midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2) {
      textAngle += Math.PI;
    }
    ctx.rotate(textAngle);

    // Scale font size based on number of slices
    const maxLen = Math.min(text.length, 20);
    let fontSize = Math.max(10, Math.min(18, this.radius / (totalSlices * 0.6)));
    // Also shrink for long labels
    if (maxLen > 12) fontSize *= 0.85;

    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = contrastText(bgColor);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate if too long
    const display = text.length > 22 ? text.slice(0, 20) + '…' : text;
    ctx.fillText(display, 0, 0);

    ctx.restore();
  }

  _drawCenter() {
    const ctx = this.ctx;
    const r = this.radius * 0.12;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;

    // Outer ring
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, r + 3, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Inner circle
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, r, 0, TAU);
    const gradient = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, r);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#4f46e5');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }

  // --- Spin animation ---

  /**
   * Spin the wheel to land on a specific winner.
   * @param {object} winner - The chosen entry object
   * @param {number} winnerIndex - Index in enabledOptions
   * @param {number} durationMs - Animation duration
   * @param {function} onComplete - Called when animation ends
   */
  spin(winner, winnerIndex, durationMs, onComplete) {
    const entries = state.enabledOptions;
    const n = entries.length;
    const sliceAngle = TAU / n;

    // The pointer is at the top (12 o'clock = -π/2 in canvas coords).
    // We need the middle of the winner's slice to end up under the pointer.
    //
    // At rotation=0, slice i occupies [i*sliceAngle, (i+1)*sliceAngle].
    // Its midpoint is at angle (i + 0.5) * sliceAngle from 3 o'clock.
    // The pointer is at -π/2 (top).
    //
    // Target rotation: the pointer angle minus the slice midpoint,
    // plus enough full rotations for visual drama.

    const sliceMid = (winnerIndex + 0.5) * sliceAngle;
    const pointerAngle = -Math.PI / 2;

    // Base target: where rotation must end so sliceMid aligns with pointer
    let targetRotation = pointerAngle - sliceMid;

    // Normalize to positive
    targetRotation = ((targetRotation % TAU) + TAU) % TAU;

    // Add random offset within the slice (so it doesn't always hit dead center)
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.7;
    targetRotation += jitter;

    // Add 5-8 full rotations for visual spin
    const extraRotations = (5 + Math.floor(Math.random() * 4)) * TAU;
    const totalRotation = targetRotation + extraRotations;

    // Calculate delta from current rotation
    const startRotation = this.rotation;
    const delta = totalRotation;

    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease-out quint: decelerating spin, feels like real friction
      const eased = 1 - Math.pow(1 - progress, 5);

      this.rotation = startRotation + delta * eased;
      this.draw();

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        // Normalize rotation to avoid huge floating point numbers over time
        this.rotation = this.rotation % TAU;
        this.animationId = null;
        onComplete();
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Cancel any running animation (safety valve).
   */
  cancelAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export const wheel = new Wheel('wheel-canvas');
