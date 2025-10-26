import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { generateShape, distancePointToSegment } from './geometry.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';

let canvas, ctx, startBtn, result, strikeElems;
let playing = false;
let state = 'idle';
let segments = [];
let polyline = [];
let playerShape = [];
let segmentGrades = [];
let isDrawing = false;
let attemptCount = 0;
let correctSamples = 0;
let totalSamples = 0;
let strikes = 0;
let shapesCompleted = 0;
let totalAttempts = 0;
let scoreKey = 'complex_shapes';
let stats = { green: 0, yellow: 0, red: 0 };
let startTime = 0;

const SHOW_COLOR_TIME = 500;
const NEW_SHAPE_DELAY = 1000;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function gradeDistance(d) {
  if (d <= 4) return 'green';
  if (d <= 8) return 'yellow';
  return 'red';
}

function formatEndMessage(finalScore, accuracyPct, speed, stats, highScore) {
  const bestPart = typeof highScore === 'number' ? ` (Best: ${highScore})` : '';
  return (
    `Struck out! Final score ${finalScore}${bestPart} | Accuracy: ${accuracyPct.toFixed(1)}% | ` +
    `Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`
  );
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

function sampleCubicPoints(p0, p1, p2, p3) {
  const pts = [p0];
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

function curveIntersects(points) {
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
  const sides = 2 + Math.floor(Math.random() * 2); // up to 3 sides
  // Bias toward larger shapes by weighting 'medium' and 'big' sizes
  const sizes = ['small', 'medium', 'medium', 'big', 'big'];
  const size = sizes[Math.floor(Math.random() * sizes.length)];
  const verts = generateShape(sides, canvas.width, canvas.height, size);
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
      const nx = dy / len;
      const ny = -dx / len;
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const offset = (Math.random() * 0.2 + 0.1) * len;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const cp = { x: mid.x + nx * offset * dir, y: mid.y + ny * offset * dir };
      segments.push({ type, start, end, cp });
      sampleQuadratic(start, cp, end);
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
      } while (curveIntersects(pts) && attempts < 10);
      segments.push({ type, start, end, cp1, cp2 });
      if (polyline.length === 0) polyline.push(start);
      pts.slice(1).forEach(p => polyline.push(p));
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
    ctx.fillStyle = 'black';
    ctx.fill();
  }

  if (playerShape.length > 1) {
    for (let i = 1; i < playerShape.length; i++) {
      const grade = segmentGrades[i - 1];
      const color = grade === 'yellow' ? 'orange' : grade;
      ctx.beginPath();
      ctx.moveTo(playerShape[i - 1].x, playerShape[i - 1].y);
      ctx.lineTo(playerShape[i].x, playerShape[i].y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
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
  if (playerShape.length < 2) return 0;
  drawComplexShape(true);
  const coverage = Math.min(totalSamples / polyline.length, 1);
  const pathAccuracy = correctSamples / Math.max(totalSamples, 1);
  return pathAccuracy * coverage;
}

function updateStrikes() {
  strikeElems.forEach((el, idx) => {
    el.checked = idx < strikes;
  });
}

function endGame() {
  playing = false;
  const elapsed = Date.now() - startTime;
  const { score: finalScore, accuracyPct, speed } = calculateScore(stats, elapsed);
  if (window.leaderboard) {
    window.leaderboard.handleScore(scoreKey, finalScore, accuracyPct, speed);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = formatEndMessage(finalScore, accuracyPct, speed, stats, high);
  } else {
    result.textContent = formatEndMessage(finalScore, accuracyPct, speed, stats);
  }
}

function startShape() {
  generateComplexShape();
  playerShape = [];
  segmentGrades = [];
  isDrawing = false;
  state = 'preview';
  drawComplexShape(true);
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  startBtn.disabled = true;
  result.textContent = '';
  attemptCount = 0;
  strikes = 0;
  shapesCompleted = 0;
  totalAttempts = 0;
  stats = { green: 0, yellow: 0, red: 0 };
  startTime = Date.now();
  scoreKey = canvas.dataset.scoreKey || scoreKey;
  updateStrikes();
  startScoreboard(canvas);
  startShape();
}

function pointerDown(e) {
  if (!playing || state !== 'preview') return;
  const pos = getCanvasPos(canvas, e);
  isDrawing = true;
  state = 'draw';
  playerShape = [pos];
  segmentGrades = [];
  correctSamples = 0;
  totalSamples = 0;
  clearCanvas(ctx);
}

function pointerMove(e) {
  if (!isDrawing || state !== 'draw') return;
  const pos = getCanvasPos(canvas, e);
  const prev = playerShape[playerShape.length - 1];
  playerShape.push(pos);
  const d = distanceToPath(pos);
  const grade = gradeDistance(d);
  segmentGrades.push(grade);
  ctx.beginPath();
  ctx.moveTo(prev.x, prev.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = grade === 'yellow' ? 'orange' : grade;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  totalSamples++;
  if (d <= 4) correctSamples++;
}

function pointerUp() {
  if (!isDrawing || state !== 'draw') return;
  isDrawing = false;
  state = 'waiting';
  const accuracy = evaluateDrawing();
  const grade = accuracy >= 0.92 ? 'green' : accuracy >= 0.85 ? 'yellow' : 'red';
  const hadRed = segmentGrades.includes('red');
  playSound(audioCtx, grade);
  if (grade === 'green') stats.green++;
  else if (grade === 'yellow') stats.yellow++;
  else stats.red++;
  updateScoreboard(grade);
  attemptCount++;

  if (hadRed) {
    strikes++;
    updateStrikes();
    if (strikes >= 3) {
      endGame();
      return;
    }
  }

  if (accuracy >= 0.92) {
    shapesCompleted++;
    totalAttempts += attemptCount;
    result.textContent = `Completed in ${attemptCount} ${attemptCount === 1 ? 'try' : 'tries'}!`;
    setTimeout(() => {
      playerShape = [];
      segmentGrades = [];
      drawComplexShape(true);
    }, SHOW_COLOR_TIME);
    setTimeout(() => {
      result.textContent = '';
      attemptCount = 0;
      strikes = 0;
      updateStrikes();
      startShape();
    }, NEW_SHAPE_DELAY);
  } else {
    result.textContent = `Accuracy: ${(accuracy * 100).toFixed(1)}%`;
    setTimeout(() => {
      playerShape = [];
      segmentGrades = [];
      drawComplexShape(true);
      state = 'preview';
    }, SHOW_COLOR_TIME);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  overlayStartButton(canvas, startBtn);
  result = document.getElementById('result');
  strikeElems = Array.from(document.querySelectorAll('#strikes .strike'));
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  startBtn.addEventListener('click', startGame);
});
