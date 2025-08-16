import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, startBtn, result;
let playing = false;
let targets = [];
let score = 0;
let gameTimer = null;

let drawing = false;
let activeTarget = null;
let progress = 0;

const tolerance = 10;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function randomLine() {
  const margin = 20;
  let x1, y1, x2, y2, dist;
  do {
    x1 = Math.random() * (canvas.width - 2 * margin) + margin;
    y1 = Math.random() * (canvas.height - 2 * margin) + margin;
    x2 = Math.random() * (canvas.width - 2 * margin) + margin;
    y2 = Math.random() * (canvas.height - 2 * margin) + margin;
    dist = Math.hypot(x2 - x1, y2 - y1);
  } while (dist < 20);
  return { x1, y1, x2, y2 };
}

function drawTargets() {
  clearCanvas(ctx);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 5;
  targets.forEach(t => {
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();
  });
}

function startGame() {
  audioCtx.resume();
  playing = true;
  score = 0;
  result.textContent = '';
  startBtn.disabled = true;
  targets = [randomLine(), randomLine()];
  drawTargets();
  gameTimer = setTimeout(endGame, 60000);
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  clearCanvas(ctx);
  result.textContent = `Score: ${score}`;
  startBtn.disabled = false;
}

function projectPointToSegment(p, seg) {
  const { x1, y1, x2, y2 } = seg;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = ((p.x - x1) * dx + (p.y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dist = Math.hypot(p.x - projX, p.y - projY);
  return { dist, t };
}

function pointerDown(e) {
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  for (let i = 0; i < targets.length; i++) {
    const { dist, t } = projectPointToSegment(pos, targets[i]);
    if (dist <= tolerance && t <= 0.1) {
      drawing = true;
      activeTarget = i;
      progress = t;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
  }
  playSound(audioCtx, 'red');
}

function pointerMove(e) {
  if (!playing || !drawing) return;
  const pos = getCanvasPos(canvas, e);
  const { dist, t } = projectPointToSegment(pos, targets[activeTarget]);
  if (dist <= tolerance) {
    progress = Math.max(progress, t);
  }
}

function pointerUp(e) {
  if (!playing || !drawing) return;
  drawing = false;
  canvas.releasePointerCapture(e.pointerId);
  if (progress >= 0.9) {
    score++;
    playSound(audioCtx, 'green');
    targets[activeTarget] = randomLine();
    drawTargets();
  } else {
    playSound(audioCtx, 'red');
  }
  activeTarget = null;
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointerleave', pointerUp);
  startBtn.addEventListener('click', startGame);
});
