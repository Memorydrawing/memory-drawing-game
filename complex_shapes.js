import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { generateShape, distancePointToSegment } from './geometry.js';

let canvas, ctx, startBtn, result;
let playing = false;
let state = 'idle';
let segments = [];
let polyline = [];
let playerShape = [];
let isDrawing = false;

const PREVIEW_TIME = 2000;
const NEW_SHAPE_DELAY = 3000;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function gradeDistance(d) {
  if (d <= 5) return 'green';
  if (d <= 10) return 'yellow';
  return 'red';
}

function sampleLine(p0, p1) {
  if (polyline.length === 0) polyline.push(p0);
  for (let t = 0.05; t <= 1; t += 0.05) {
    polyline.push({
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t
    });
  }
}

function sampleQuadratic(p0, p1, p2) {
  if (polyline.length === 0) polyline.push(p0);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    polyline.push({ x, y });
  }
}

function sampleCubic(p0, p1, p2, p3) {
  if (polyline.length === 0) polyline.push(p0);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const x =
      (1 - t) * (1 - t) * (1 - t) * p0.x +
      3 * (1 - t) * (1 - t) * t * p1.x +
      3 * (1 - t) * t * t * p2.x +
      t * t * t * p3.x;
    const y =
      (1 - t) * (1 - t) * (1 - t) * p0.y +
      3 * (1 - t) * (1 - t) * t * p1.y +
      3 * (1 - t) * t * t * p2.y +
      t * t * t * p3.y;
    polyline.push({ x, y });
  }
}

function generateComplexShape() {
  const sides = 3 + Math.floor(Math.random() * 2); // 3 or 4
  const verts = generateShape(sides, canvas.width, canvas.height);
  segments = [];
  polyline = [];

  for (let i = 0; i < verts.length; i++) {
    const start = verts[i];
    const end = verts[(i + 1) % verts.length];
    const type = ['I', 'C', 'S'][Math.floor(Math.random() * 3)];
    if (type === 'I') {
      segments.push({ type, start, end });
      sampleLine(start, end);
    } else if (type === 'C') {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const offset = (Math.random() * 0.5 + 0.2) * len;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const cp = { x: mid.x + nx * offset * dir, y: mid.y + ny * offset * dir };
      segments.push({ type, start, end, cp });
      sampleQuadratic(start, cp, end);
    } else {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const offset = (Math.random() * 0.5 + 0.2) * len;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const cp1 = {
        x: start.x + dx / 3 + nx * offset * dir,
        y: start.y + dy / 3 + ny * offset * dir
      };
      const cp2 = {
        x: start.x + (2 * dx) / 3 - nx * offset * dir,
        y: start.y + (2 * dy) / 3 - ny * offset * dir
      };
      segments.push({ type, start, end, cp1, cp2 });
      sampleCubic(start, cp1, cp2, end);
    }
  }
}

function drawComplexShape(show = true) {
  clearCanvas(ctx);
  if (show) {
    ctx.beginPath();
    ctx.moveTo(segments[0].start.x, segments[0].start.y);
    segments.forEach(seg => {
      if (seg.type === 'I') {
        ctx.lineTo(seg.end.x, seg.end.y);
      } else if (seg.type === 'C') {
        ctx.quadraticCurveTo(seg.cp.x, seg.cp.y, seg.end.x, seg.end.y);
      } else {
        ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
      }
    });
    ctx.closePath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (isDrawing && playerShape.length > 1) {
    ctx.beginPath();
    ctx.moveTo(playerShape[0].x, playerShape[0].y);
    for (let i = 1; i < playerShape.length; i++) {
      ctx.lineTo(playerShape[i].x, playerShape[i].y);
    }
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function distanceToPath(p) {
  let min = Infinity;
  for (let i = 0; i < polyline.length; i++) {
    const a = polyline[i];
    const b = polyline[(i + 1) % polyline.length];
    const d = distancePointToSegment(p, a, b);
    if (d < min) min = d;
  }
  return min;
}

function evaluateDrawing() {
  if (playerShape.length < 2) return;
  let total = 0;
  for (let i = 1; i < playerShape.length; i++) {
    const p = playerShape[i];
    const d = distanceToPath(p);
    total += d;
    let color = 'red';
    if (d <= 5) color = 'green';
    else if (d <= 10) color = 'orange';
    ctx.beginPath();
    ctx.moveTo(playerShape[i - 1].x, playerShape[i - 1].y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const avg = total / (playerShape.length - 1);
  result.textContent = `Average error: ${avg.toFixed(1)} px`;
  playSound(audioCtx, gradeDistance(avg));
}

function startShape() {
  generateComplexShape();
  playerShape = [];
  isDrawing = false;
  state = 'preview';
  drawComplexShape(true);
  setTimeout(() => {
    clearCanvas(ctx);
    state = 'draw';
  }, PREVIEW_TIME);
}

function startGame() {
  audioCtx.resume();
  playing = true;
  startBtn.disabled = true;
  result.textContent = '';
  startShape();
}

function pointerDown(e) {
  if (!playing || state !== 'draw') return;
  const pos = getCanvasPos(canvas, e);
  isDrawing = true;
  playerShape = [pos];
  drawComplexShape(false);
}

function pointerMove(e) {
  if (!isDrawing || state !== 'draw') return;
  const pos = getCanvasPos(canvas, e);
  playerShape.push(pos);
  drawComplexShape(false);
}

function pointerUp() {
  if (!isDrawing || state !== 'draw') return;
  isDrawing = false;
  drawComplexShape(true);
  evaluateDrawing();
  setTimeout(startShape, NEW_SHAPE_DELAY);
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
  startBtn.addEventListener('click', startGame);
});
