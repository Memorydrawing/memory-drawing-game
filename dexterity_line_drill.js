import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, startBtn, result;
let playing = false;
let targets = [];
let score = 0;
let gameTimer = null;

let drawing = false;
let activeTarget = null;
let minT = 1;
let maxT = 0;
let lastPos = null;
let offLineSegments = 0;
let totalSegments = 0;

const tolerance = 4;
const maxOffSegmentRatio = 0.1;

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
  ctx.lineWidth = 2;
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
  drawing = true;
  activeTarget = null;
  minT = 1;
  maxT = 0;
  offLineSegments = 0;
  totalSegments = 0;
  lastPos = pos;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const { dist } = projectPointToSegment(pos, t);
    if (dist <= tolerance) {
      activeTarget = i;
      break;
    }
  }

  drawTargets();
  canvas.setPointerCapture(e.pointerId);
}

function pointerMove(e) {
  if (!playing || !drawing) return;
  const pos = getCanvasPos(canvas, e);

  let dist = Infinity;
  let normT = 0;
  if (activeTarget !== null) {
    ({ dist, t: normT } = projectPointToSegment(pos, targets[activeTarget]));
  } else {
    for (let i = 0; i < targets.length; i++) {
      const proj = projectPointToSegment(pos, targets[i]);
      if (proj.dist <= tolerance) {
        activeTarget = i;
        dist = proj.dist;
        normT = proj.t;
        break;
      }
    }
  }

  ctx.beginPath();
  ctx.moveTo(lastPos.x, lastPos.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.lineWidth = 2;
  if (dist <= tolerance && activeTarget !== null) {
    ctx.strokeStyle = 'green';
    minT = Math.min(minT, normT);
    maxT = Math.max(maxT, normT);
    totalSegments++;
  } else {
    ctx.strokeStyle = 'red';
    if (activeTarget !== null) {
      offLineSegments++;
      totalSegments++;
    }
  }
  ctx.stroke();
  lastPos = pos;
}

function pointerUp(e) {
  if (!playing || !drawing) return;
  drawing = false;
  canvas.releasePointerCapture(e.pointerId);
  const offRatio = totalSegments > 0 ? offLineSegments / totalSegments : 1;
  const coverage = maxT - minT;
  if (activeTarget !== null && coverage >= 0.9 && offRatio <= maxOffSegmentRatio) {
    score++;
    playSound(audioCtx, 'green');
    targets[activeTarget] = randomLine();
    drawTargets();
  } else {
    playSound(audioCtx, 'red');
  }
  activeTarget = null;
  lastPos = null;
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
