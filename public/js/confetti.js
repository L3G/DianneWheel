// Confetti celebration effect
// =============================
// Lightweight canvas-based confetti — no external library needed.
// Particles burst from center and drift down with gravity and drag.

const PARTICLE_COUNT = 80;
const GRAVITY = 0.003;
const DRAG = 0.97;
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA',
  '#FB923C', '#38BDF8', '#F472B6', '#34D399',
  '#FACC15', '#818CF8',
];

let canvas = null;
let ctx = null;
let particles = [];
let animationId = null;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    pointer-events: none; z-index: 9999;
  `;
  document.body.appendChild(canvas);
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createParticle() {
  const angle = Math.random() * Math.PI * 2;
  const speed = 4 + Math.random() * 8;
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 15,
    opacity: 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  };
}

function animate() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  let alive = false;
  for (const p of particles) {
    p.vy += GRAVITY;
    p.vx *= DRAG;
    p.vy *= DRAG;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotationSpeed;
    p.opacity -= 0.005;

    if (p.opacity <= 0) continue;
    alive = true;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;

    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (alive) {
    animationId = requestAnimationFrame(animate);
  } else {
    cleanup();
  }
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (canvas && canvas.parentElement) {
    canvas.parentElement.removeChild(canvas);
    canvas = null;
    ctx = null;
  }
  particles = [];
}

export function fireConfetti() {
  cleanup();
  ensureCanvas();
  resize();
  particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
  animationId = requestAnimationFrame(animate);
}
