import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { generateShape, distancePointToSegment } from './geometry.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { createStrikeCounter } from './src/strike-counter.js';

let canvas, ctx, startBtn, result, strikeContainer;
let playing = false;
let drawing = false;
let shapes = [];
let activeShapeIndex = -1;
let playerShape = [];
let stats = { green: 0, red: 0 };
let startTime = 0;
let scoreKey = 'dexterity_complex_shapes';
let correctSamples = 0;
let totalSamples = 0;
let strikeCounter = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const SAMPLE_STEP = 0.05;
const MAX_STRIKES = 3;

function gradeDistance(d) {
  return d <= 4 ? 'green' : 'red';
}

function sampleLine(polyline, p0, p1) {
  if (polyline.length === 0) polyline.push(p0);
  for (let t = SAMPLE_STEP; t <= 1; t += SAMPLE_STEP) {
    polyline.push({
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t
    });
  }
}

function sampleQuadratic(polyline, p0, p1, p2) {
  if (polyline.length === 0) polyline.push(p0);
  for (let t = SAMPLE_STEP; t <= 1; t += SAMPLE_STEP) {
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    polyline.push({ x, y });
  }
}

function sampleCubicPoints(p0, p1, p2, p3) {
  const pts = [p0];
  for (let t = SAMPLE_STEP; t <= 1; t += SAMPLE_STEP) {
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
    pts.push({ x, y });
  }
  return pts;
}

function segmentsIntersect(a, b, c, d) {
  const det = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return (
    det(a, b, c) * det(a, b, d) < 0 &&
    det(c, d, a) * det(c, d, b) < 0
  );
}

function curveIntersects(polyline, points) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    for (let j = 0; j < polyline.length - 1; j++) {
      const c = polyline[j];
      const d = polyline[j + 1];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

function generateComplexShape() {
  const sides = 3 + Math.floor(Math.random() * 2);
  const sizes = ['small', 'medium', 'medium', 'big', 'big'];
  const size = sizes[Math.floor(Math.random() * sizes.length)];
  const verts = generateShape(sides, canvas.width, canvas.height, size);
  const segments = [];
  const polyline = [];

  for (let i = 0; i < verts.length; i++) {
    const start = verts[i];
    const end = verts[(i + 1) % verts.length];
    const type = ['I', 'C', 'S'][Math.floor(Math.random() * 3)];
    if (type === 'I') {
      segments.push({ type, start, end });
      sampleLine(polyline, start, end);
    } else if (type === 'C') {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dy / len;
      const ny = -dx / len;
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const offset = (Math.random() * 0.2 + 0.1) * len;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const cp = { x: mid.x + nx * offset * dir, y: mid.y + ny * offset * dir };
      segments.push({ type, start, end, cp });
      sampleQuadratic(polyline, start, cp, end);
    } else {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dy / len;
      const ny = -dx / len;
      let cp1, cp2, pts;
      let attempts = 0;
      do {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const offset1 = (Math.random() * 0.25 + 0.1) * len;
        const offset2 = (Math.random() * 0.25 + 0.1) * len;
        cp1 = {
          x: start.x + dx / 3 + nx * offset1 * dir,
          y: start.y + dy / 3 + ny * offset1 * dir
        };
        cp2 = {
          x: start.x + (2 * dx) / 3 - nx * offset2 * dir,
          y: start.y + (2 * dy) / 3 - ny * offset2 * dir
        };
        pts = sampleCubicPoints(start, cp1, cp2, end);
        attempts++;
      } while (curveIntersects(polyline, pts) && attempts < 10);
      segments.push({ type, start, end, cp1, cp2 });
      if (polyline.length === 0) polyline.push(start);
      pts.slice(1).forEach(p => polyline.push(p));
    }
  }

  return { segments, polyline };
}

function drawShapes() {
  clearCanvas(ctx);
  shapes.forEach(({ segments }) => {
    if (!segments.length) return;
    ctx.save();
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
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
  });
}

function distanceToPath(p, path) {
  let min = Infinity;
  if (!path || path.length < 2) return min;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const d = distancePointToSegment(p, a, b);
    if (d < min) min = d;
  }
  return min;
}

function evaluateDrawing(shape) {
  if (playerShape.length < 2) return 0;
  const coverage = Math.min(totalSamples / Math.max(shape.polyline.length, 1), 1);
  const pathAccuracy = correctSamples / Math.max(totalSamples, 1);
  return pathAccuracy * coverage;
}

function resetDrawing() {
  drawing = false;
  playerShape = [];
  correctSamples = 0;
  totalSamples = 0;
  activeShapeIndex = -1;
}

function ensureShapeCount() {
  const targetCount = 2;
  while (shapes.length < targetCount) {
    shapes.push(generateComplexShape());
  }
}

function findNearestShape(pos) {
  let bestIndex = -1;
  let bestDistance = Infinity;
  shapes.forEach((shape, index) => {
    const d = distanceToPath(pos, shape.polyline);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = index;
    }
  });
  return { index: bestIndex, distance: bestDistance };
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  stats = { green: 0, red: 0 };
  startScoreboard(canvas);
  result.textContent = 'Trace both shapes carefully. They will only disappear after a clean outline.';
  startBtn.disabled = true;
  strikeCounter = createStrikeCounter(strikeContainer, MAX_STRIKES);
  startTime = Date.now();
  shapes = [];
  ensureShapeCount();
  drawShapes();
}

function endGame(reason = 'complete') {
  if (!playing) return;
  playing = false;
  clearCanvas(ctx);
  const elapsed = Date.now() - startTime;
  const { score: finalScore } = calculateScore(stats, elapsed);
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, finalScore);
    const high = window.leaderboard.getHighScore(scoreKey);
    const prefix = reason === 'strikes' ? 'Out of strikes! ' : '';
    const suffix =
      reason === 'strikes'
        ? 'Press Start to tackle more shapes.'
        : "Time's up—press Start to tackle more shapes.";
    result.textContent = `${prefix}Score: ${finalScore} (Best: ${high}). ${suffix}`;
  } else {
    const prefix = reason === 'strikes' ? 'Out of strikes! ' : '';
    const suffix =
      reason === 'strikes'
        ? 'Press Start to tackle more shapes.'
        : "Time's up—press Start to tackle more shapes.";
    result.textContent = `${prefix}Score: ${finalScore}. ${suffix}`;
  }
  resetDrawing();
  startBtn.disabled = false;
  startBtn.style.display = '';
}

function pointerDown(e) {
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  const { index, distance } = findNearestShape(pos);
  if (index === -1 || distance > 20) {
    if (result) {
      result.textContent = 'Start your trace directly on a shape to select it.';
    }
    return;
  }
  drawing = true;
  activeShapeIndex = index;
  playerShape = [pos];
  correctSamples = 0;
  totalSamples = 0;
  canvas.setPointerCapture(e.pointerId);
}

function pointerMove(e) {
  if (!playing || !drawing) return;
  const shape = shapes[activeShapeIndex];
  if (!shape) return;
  const pos = getCanvasPos(canvas, e);
  const prev = playerShape[playerShape.length - 1];
  playerShape.push(pos);
  const d = distanceToPath(pos, shape.polyline);
  const grade = gradeDistance(d);
  ctx.beginPath();
  ctx.moveTo(prev.x, prev.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = grade;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  totalSamples++;
  if (d <= 4) correctSamples++;
}

function pointerUp(e) {
  if (!playing || !drawing) return;
  drawing = false;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch (err) {
    // ignore release errors
  }

  const shape = shapes[activeShapeIndex];
  const accuracy = shape ? evaluateDrawing(shape) : 0;
  const grade = accuracy >= 0.9 ? 'green' : accuracy >= 0.8 ? 'close' : 'red';
  if (grade === 'green') {
    stats.green += 1;
  } else if (grade === 'red') {
    stats.red += 1;
  }
  updateScoreboard(grade === 'green' ? 'green' : 'red');
  playSound(audioCtx, grade === 'green' ? 'green' : 'red');

  if (grade === 'green') {
    if (strikeCounter) {
      strikeCounter.registerSuccess();
    }
  } else if (grade === 'red') {
    if (strikeCounter && strikeCounter.registerFailure()) {
      endGame('strikes');
    }
  }

  if (result) {
    if (grade === 'green' && shape) {
      result.textContent = 'Great trace! Keep clearing the remaining shapes.';
    } else if (grade === 'close') {
      result.textContent = 'Close! Trace the full outline without drifting to clear it.';
    } else {
      result.textContent = 'Try again. Start on the shape and stay on its edge to clear it.';
    }
  }

  if (grade === 'green' && shape) {
    shapes.splice(activeShapeIndex, 1);
    ensureShapeCount();
  }

  if (playing) {
    setTimeout(() => {
      if (!playing) return;
      drawShapes();
    }, 200);
  }

  resetDrawing();
}

function pointerCancel(e) {
  if (!drawing) return;
  pointerUp(e);
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  overlayStartButton(canvas, startBtn);
  result = document.getElementById('result');
  strikeContainer = document.getElementById('strikes');
  scoreKey = canvas.dataset.scoreKey || scoreKey;

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointerleave', pointerCancel);
  canvas.addEventListener('pointercancel', pointerCancel);
  startBtn.addEventListener('click', startGame);
});
