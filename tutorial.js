import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, nextBtn;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const center = { x: 0, y: 0 };
const DOT_RADIUS = 10;
let dots = [];
let message = '';
let messageColor = '';

function drawDots() {
  clearCanvas(ctx);
  const offset = 40;
  const y = center.y;
  dots = [
    { x: center.x - offset, y, grade: 'green' },
    { x: center.x + offset, y, grade: 'red' }
  ];
  dots.forEach(d => {
    ctx.fillStyle = d.grade;
    ctx.beginPath();
    ctx.arc(d.x, d.y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
  if (message) {
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = messageColor;
    ctx.fillText(message, center.x, y + 40);
  }
}

function handleTap(e) {
  const pos = getCanvasPos(canvas, e);
  for (const d of dots) {
    if (Math.hypot(pos.x - d.x, pos.y - d.y) <= DOT_RADIUS) {
      audioCtx.resume();
      playSound(audioCtx, d.grade);
      message = d.grade === 'green' ? 'Accurate' : 'Inaccurate';
      messageColor = d.grade;
      drawDots();
      break;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('tutorialCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  nextBtn = document.getElementById('nextBtn');
  center.x = canvas.width / 2;
  center.y = canvas.height / 2;
  drawDots();
  canvas.addEventListener('pointerdown', handleTap);
  nextBtn?.addEventListener('click', () => {
    window.location.href = 'drills.html';
  });
});

