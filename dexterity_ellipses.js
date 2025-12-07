import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { createStrikeCounter } from './src/strike-counter.js';

let canvas, ctx, startBtn, result, strikeContainer;
let playing = false;
let targets = [];
let scoreKey = 'dexterity_ellipses';
let stats = { green: 0, red: 0 };
let startTime = 0;
let strikeCounter = null;

let drawing = false;
let activeTarget = null;
let lastPos = null;
let offLineDist = 0;
let onLineDist = 0;
let coveredSamples = new Set();

const tolerance = 6;
const maxOffSegmentRatio = 0.12;
const LINE_WIDTH = 2.5;
const SAMPLE_POINTS = 180;
const MARGIN = 60;
const MIN_RADIUS = 60;
const MIN_MINOR_RADIUS = 30;
const MIN_ASPECT_RATIO = 0.35;
const MAX_RADIUS = 170;
const COVERAGE_THRESHOLD = 0.85;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const MAX_STRIKES = 3;

function randomEllipse() {
  const rotation = Math.random() * Math.PI;
  const majorRadius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
  const aspectRatio = MIN_ASPECT_RATIO + Math.random() * (1 - MIN_ASPECT_RATIO);
  let radiusX = majorRadius;
  let radiusY = Math.max(MIN_MINOR_RADIUS, majorRadius * aspectRatio);

  if (Math.random() < 0.5) {
    [radiusX, radiusY] = [radiusY, radiusX];
  }
  const maxX = canvas.width - MARGIN - radiusX;
  const minX = MARGIN + radiusX;
  const maxY = canvas.height - MARGIN - radiusY;
  const minY = MARGIN + radiusY;
  const cx = Math.random() * (maxX - minX) + minX;
  const cy = Math.random() * (maxY - minY) + minY;

  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const points = [];
  for (let i = 0; i <= SAMPLE_POINTS; i++) {
    const theta = (i / SAMPLE_POINTS) * Math.PI * 2;
    const localX = radiusX * Math.cos(theta);
    const localY = radiusY * Math.sin(theta);
    const x = cx + localX * cosR - localY * sinR;
    const y = cy + localX * sinR + localY * cosR;
    points.push({ x, y });
  }

  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLengths.push(l);
    totalLength += l;
  }

  return {
    cx,
    cy,
    radiusX,
    radiusY,
    rotation,
    points,
    segLengths,
    totalLength,
    sampleCount: SAMPLE_POINTS
  };
}

function drawTargets() {
  clearCanvas(ctx);
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'black';
  ctx.lineWidth = LINE_WIDTH;
  targets.forEach(t => {
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy, t.radiusX, t.radiusY, t.rotation, 0, Math.PI * 2);
    ctx.stroke();

    const p1 = t.points[t.points.length - 2];
    const p2 = t.points[t.points.length - 1];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const headLen = 10;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(
      p2.x - headLen * Math.cos(angle - Math.PI / 6),
      p2.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      p2.x - headLen * Math.cos(angle + Math.PI / 6),
      p2.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  });
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  stats = { green: 0, red: 0 };
  startScoreboard(canvas);
  startTime = Date.now();
  result.textContent = '';
  startBtn.disabled = true;
  strikeCounter = createStrikeCounter(strikeContainer, MAX_STRIKES);
  targets = [randomEllipse()];
  drawTargets();
}

function endGame(reason = 'complete') {
  if (!playing) return;
  playing = false;
  clearCanvas(ctx);
  const elapsed = Date.now() - startTime;
  const { score: finalScore, accuracyPct, speed } = calculateScore(
    { green: stats.green, red: stats.red },
    elapsed
  );
  const prefix = reason === 'strikes' ? 'Out of strikes! ' : '';
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, finalScore);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = `${prefix}Score: ${finalScore} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  } else {
    result.textContent = `${prefix}Score: ${finalScore} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  }
  startBtn.disabled = false;
  startBtn.style.display = '';
}

function projectPointToEllipse(p, ellipse) {
  let closest = Infinity;
  let bestT = 0;
  let bestIndex = 0;
  let accumulated = 0;
  for (let i = 0; i < ellipse.points.length - 1; i++) {
    const seg = {
      x1: ellipse.points[i].x,
      y1: ellipse.points[i].y,
      x2: ellipse.points[i + 1].x,
      y2: ellipse.points[i + 1].y
    };
    const proj = projectPointToSegment(p, seg);
    if (proj.dist < closest) {
      closest = proj.dist;
      bestT = (accumulated + proj.t * ellipse.segLengths[i]) / ellipse.totalLength;
      bestIndex = i;
    }
    accumulated += ellipse.segLengths[i];
  }
  return { dist: closest, t: bestT, index: bestIndex };
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
  offLineDist = 0;
  onLineDist = 0;
  lastPos = pos;
  coveredSamples = new Set();

  for (let i = 0; i < targets.length; i++) {
    const proj = projectPointToEllipse(pos, targets[i]);
    if (proj.dist <= tolerance) {
      activeTarget = i;
      markCoverage(targets[i], proj.index);
      break;
    }
  }

  drawTargets();
  canvas.setPointerCapture(e.pointerId);
}

function markCoverage(target, index) {
  if (!target) return;
  const mod = target.sampleCount;
  coveredSamples.add(index % mod);
  coveredSamples.add((index + 1) % mod);
}

function pointerMove(e) {
  if (!playing || !drawing) return;
  const pos = getCanvasPos(canvas, e);
  const dx = pos.x - lastPos.x;
  const dy = pos.y - lastPos.y;
  const segmentLen = Math.hypot(dx, dy);

  let projResult = null;
  if (activeTarget !== null) {
    projResult = projectPointToEllipse(pos, targets[activeTarget]);
  } else {
    for (let i = 0; i < targets.length; i++) {
      const proj = projectPointToEllipse(pos, targets[i]);
      if (proj.dist <= tolerance) {
        activeTarget = i;
        projResult = proj;
        break;
      }
    }
  }

  ctx.beginPath();
  ctx.moveTo(lastPos.x, lastPos.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.lineWidth = LINE_WIDTH;

  if (projResult && projResult.dist <= tolerance && activeTarget !== null) {
    ctx.strokeStyle = 'green';
    onLineDist += segmentLen;
    markCoverage(targets[activeTarget], projResult.index);
  } else {
    ctx.strokeStyle = 'red';
    if (activeTarget !== null) {
      offLineDist += segmentLen;
    }
  }
  ctx.stroke();
  lastPos = pos;
}

function pointerUp(e) {
  if (!playing || !drawing) return;
  drawing = false;
  canvas.releasePointerCapture(e.pointerId);
  const total = onLineDist + offLineDist;
  if (total > 0 && activeTarget !== null) {
    const offRatio = total > 0 ? offLineDist / total : 1;
    const coverage = coveredSamples.size / targets[activeTarget].sampleCount;
    if (coverage >= COVERAGE_THRESHOLD && offRatio <= maxOffSegmentRatio) {
      playSound(audioCtx, 'green');
      stats.green += 1;
      updateScoreboard('green');
      if (strikeCounter) {
        strikeCounter.registerSuccess();
      }
      targets[activeTarget] = randomEllipse();
      drawTargets();
    } else {
      playSound(audioCtx, 'red');
      stats.red += 1;
      updateScoreboard('red');
      if (strikeCounter && strikeCounter.registerFailure()) {
        endGame('strikes');
      }
    }
  }
  activeTarget = null;
  lastPos = null;
  onLineDist = 0;
  offLineDist = 0;
  coveredSamples = new Set();
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
  canvas.addEventListener('pointerleave', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  startBtn.addEventListener('click', startGame);
});
