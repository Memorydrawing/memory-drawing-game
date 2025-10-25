import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { startCountdown } from './src/countdown.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';

let canvas, ctx, startBtn, result, timerDisplay;
let playing = false;
let target = null;
let gameTimer = null;
let stopTimer = null;
let scoreKey = 'dexterity_ellipses';
let stats = { green: 0, yellow: 0, red: 0 };
let startTime = 0;

let drawing = false;
let lastPos = null;
let onLineDist = 0;
let offLineDist = 0;
let coverage = [];
let attemptedContact = false;

const LINE_WIDTH = 2;
const TRACE_WIDTH = 2;
const TOLERANCE = 6;
const MAX_OFF_RATIO = 0.12;
const COVERAGE_THRESHOLD = 0.86;
const COVER_BUCKETS = 90;
const ELLIPSE_SEGMENTS = 160;
const MARGIN = 55;
const MIN_RATIO = 0.65;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function buildEllipsePoints(center, radiusX, radiusY, rotation, segments) {
  const cosPhi = Math.cos(rotation);
  const sinPhi = Math.sin(rotation);
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const x = center.x + radiusX * cosT * cosPhi - radiusY * sinT * sinPhi;
    const y = center.y + radiusX * cosT * sinPhi + radiusY * sinT * cosPhi;
    points.push({ x, y });
  }
  return points;
}

function computeSegmentData(points) {
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const length = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLengths.push(length);
    totalLength += length;
  }
  return { segLengths, totalLength };
}

function randomEllipse() {
  const minCanvasDim = Math.min(canvas.width, canvas.height);
  const minRadius = minCanvasDim * 0.18;
  const maxRadius = minCanvasDim * 0.36;

  for (let attempt = 0; attempt < 80; attempt++) {
    const major = randomInRange(minRadius, maxRadius);
    const ratio = randomInRange(MIN_RATIO, 1);
    const minor = Math.max(minRadius * MIN_RATIO, major * ratio);

    const radiusX = major;
    const radiusY = minor;
    const center = {
      x: randomInRange(MARGIN + radiusX, canvas.width - MARGIN - radiusX),
      y: randomInRange(MARGIN + radiusY, canvas.height - MARGIN - radiusY)
    };

    if (
      center.x - radiusX < MARGIN ||
      center.x + radiusX > canvas.width - MARGIN ||
      center.y - radiusY < MARGIN ||
      center.y + radiusY > canvas.height - MARGIN
    ) {
      continue;
    }

    const rotation = randomInRange(0, Math.PI);
    const points = buildEllipsePoints(center, radiusX, radiusY, rotation, ELLIPSE_SEGMENTS);
    const { segLengths, totalLength } = computeSegmentData(points);
    if (totalLength < minRadius * Math.PI * 2 * 0.5) {
      continue;
    }
    return { center, radiusX, radiusY, rotation, points, segLengths, totalLength };
  }

  const fallbackRadius = minCanvasDim * 0.28;
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const rotation = 0;
  const points = buildEllipsePoints(center, fallbackRadius, fallbackRadius * 0.85, rotation, ELLIPSE_SEGMENTS);
  const { segLengths, totalLength } = computeSegmentData(points);
  return { center, radiusX: fallbackRadius, radiusY: fallbackRadius * 0.85, rotation, points, segLengths, totalLength };
}

function drawTargetShape() {
  clearCanvas(ctx);
  if (!target) return;
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.ellipse(target.center.x, target.center.y, target.radiusX, target.radiusY, target.rotation, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function projectPointToSegment(p, seg) {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const projX = seg.x1 + t * dx;
  const projY = seg.y1 + t * dy;
  const dist = Math.hypot(p.x - projX, p.y - projY);
  return { dist, t };
}

function projectPointToCurve(p, curve) {
  if (!curve || curve.totalLength === 0) {
    return { dist: Infinity, t: 0 };
  }
  let closest = Infinity;
  let bestT = 0;
  let accumulated = 0;
  for (let i = 0; i < curve.points.length - 1; i++) {
    const seg = {
      x1: curve.points[i].x,
      y1: curve.points[i].y,
      x2: curve.points[i + 1].x,
      y2: curve.points[i + 1].y
    };
    const proj = projectPointToSegment(p, seg);
    if (proj.dist < closest) {
      closest = proj.dist;
      bestT = (accumulated + proj.t * curve.segLengths[i]) / curve.totalLength;
    }
    accumulated += curve.segLengths[i];
  }
  return { dist: closest, t: bestT };
}

function markCoverage(t) {
  if (!coverage.length) return;
  const idx = Math.max(0, Math.min(COVER_BUCKETS - 1, Math.floor(t * COVER_BUCKETS)));
  coverage[idx] = true;
  const fractional = t * COVER_BUCKETS - idx;
  if (fractional > 0.6 && idx + 1 < COVER_BUCKETS) {
    coverage[idx + 1] = true;
  } else if (fractional < 0.4 && idx - 1 >= 0) {
    coverage[idx - 1] = true;
  }
}

function coverageRatio() {
  if (!coverage.length) return 0;
  const covered = coverage.reduce((sum, filled) => sum + (filled ? 1 : 0), 0);
  return covered / coverage.length;
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  stats = { green: 0, yellow: 0, red: 0 };
  startScoreboard(canvas);
  startTime = Date.now();
  result.textContent = '';
  startBtn.disabled = true;
  target = randomEllipse();
  coverage = new Array(COVER_BUCKETS).fill(false);
  attemptedContact = false;
  if (stopTimer) {
    stopTimer();
    stopTimer = null;
  }
  if (gameTimer) {
    clearTimeout(gameTimer);
    gameTimer = null;
  }
  drawTargetShape();
  stopTimer = startCountdown(timerDisplay, 60000);
  gameTimer = setTimeout(endGame, 60000);
}

function endGame() {
  if (!playing) return;
  playing = false;
  if (gameTimer) {
    clearTimeout(gameTimer);
    gameTimer = null;
  }
  if (stopTimer) {
    stopTimer();
    stopTimer = null;
  }
  clearCanvas(ctx);
  const elapsed = Date.now() - startTime;
  const { score: finalScore, accuracyPct, speed } = calculateScore(
    { green: stats.green, yellow: 0, red: stats.red },
    elapsed
  );
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, finalScore);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = `Score: ${finalScore} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  } else {
    result.textContent = `Score: ${finalScore} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  }
  startBtn.disabled = false;
  startBtn.style.display = '';
  target = null;
  drawing = false;
  coverage = [];
  attemptedContact = false;
}

function pointerDown(e) {
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  drawing = true;
  lastPos = pos;
  onLineDist = 0;
  offLineDist = 0;
  coverage = new Array(COVER_BUCKETS).fill(false);
  attemptedContact = false;
  drawTargetShape();
  canvas.setPointerCapture(e.pointerId);
}

function pointerMove(e) {
  if (!playing || !drawing) return;
  const pos = getCanvasPos(canvas, e);
  const dx = pos.x - lastPos.x;
  const dy = pos.y - lastPos.y;
  const segmentLen = Math.hypot(dx, dy);
  if (segmentLen === 0) return;

  const prevProj = projectPointToCurve(lastPos, target);
  const proj = projectPointToCurve(pos, target);
  const avgDist = (prevProj.dist + proj.dist) / 2;

  ctx.beginPath();
  ctx.moveTo(lastPos.x, lastPos.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.lineWidth = TRACE_WIDTH;
  if (avgDist <= TOLERANCE) {
    ctx.strokeStyle = 'green';
    onLineDist += segmentLen;
    attemptedContact = true;
    if (prevProj.dist <= TOLERANCE) markCoverage(prevProj.t);
    if (proj.dist <= TOLERANCE) markCoverage(proj.t);
  } else {
    ctx.strokeStyle = 'red';
    offLineDist += segmentLen;
  }
  ctx.stroke();

  lastPos = pos;
}

function completeAttempt(success) {
  playSound(audioCtx, success ? 'green' : 'red');
  if (success) {
    stats.green += 1;
    updateScoreboard('green');
    target = randomEllipse();
  } else {
    stats.red += 1;
    updateScoreboard('red');
  }
  coverage = new Array(COVER_BUCKETS).fill(false);
  onLineDist = 0;
  offLineDist = 0;
  attemptedContact = false;
  drawTargetShape();
}

function pointerUp(e) {
  if (!playing || !drawing) return;
  drawing = false;
  try {
    if (e?.pointerId != null) {
      canvas.releasePointerCapture(e.pointerId);
    }
  } catch (err) {
    // ignore capture release errors
  }

  const total = onLineDist + offLineDist;
  if (total === 0 || !attemptedContact) {
    completeAttempt(false);
    lastPos = null;
    return;
  }

  const offRatio = offLineDist / total;
  const coverageOk = coverageRatio() >= COVERAGE_THRESHOLD;
  const success = coverageOk && offRatio <= MAX_OFF_RATIO;
  completeAttempt(success);
  lastPos = null;
}

function pointerCancel(e) {
  pointerUp(e);
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  overlayStartButton(canvas, startBtn);
  result = document.getElementById('result');
  timerDisplay = document.getElementById('timer');
  scoreKey = canvas.dataset.scoreKey || scoreKey;

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointerleave', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  startBtn.addEventListener('click', startGame);
});
