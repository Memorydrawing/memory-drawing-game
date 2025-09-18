import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { startCountdown } from './src/countdown.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';

const GAME_DURATION = 60000;
const LINE_WIDTH = 2;
const DEFAULT_TOLERANCE = 6;
const DEFAULT_OFF_RATIO = 0.25;
const DEFAULT_PREVIEW_DELAY = 600;
const DEFAULT_COVERAGE_THRESHOLD = 0.85;
const DEFAULT_COVERAGE_SAMPLES = 24;
const DEFAULT_MIN_SEGMENT_LENGTH = 60;

let canvas, ctx, startBtn, result, timerDisplay;
let playing = false;
let drawing = false;
let target = null;
let scoreKey = 'memory_shape';
let stats = { green: 0, red: 0 };
let startTime = 0;
let gameTimer = null;
let stopTimer = null;
let lastPos = null;
let onLineDist = 0;
let offLineDist = 0;
let config = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function buildTarget(points, closed) {
  const segments = [];
  const coverageSamples = config.coverageSamples;
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const length = distance(start, end);
    if (length > 0) {
      segments.push({ start, end, length, coverage: new Array(coverageSamples).fill(false) });
    }
  }
  if (closed) {
    const start = points[points.length - 1];
    const end = points[0];
    const length = distance(start, end);
    if (length > 0) {
      segments.push({ start, end, length, coverage: new Array(coverageSamples).fill(false) });
    }
  }
  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
  return { points, segments, closed, totalLength };
}

function randomLineTarget() {
  const margin = 40;
  const minLen = Math.max(config.minSegmentLength, 40);
  for (let i = 0; i < 50; i++) {
    const p1 = {
      x: randomInRange(margin, canvas.width - margin),
      y: randomInRange(margin, canvas.height - margin)
    };
    const p2 = {
      x: randomInRange(margin, canvas.width - margin),
      y: randomInRange(margin, canvas.height - margin)
    };
    if (distance(p1, p2) >= minLen) {
      return buildTarget([p1, p2], false);
    }
  }
  const fallback = [
    { x: margin, y: margin },
    { x: canvas.width - margin, y: canvas.height - margin }
  ];
  return buildTarget(fallback, false);
}

function randomPolygonTarget(vertexCount) {
  const margin = 80;
  const minLen = Math.max(config.minSegmentLength, 40);
  for (let attempt = 0; attempt < 60; attempt++) {
    const center = {
      x: randomInRange(margin, canvas.width - margin),
      y: randomInRange(margin, canvas.height - margin)
    };
    const maxRadius = Math.min(
      center.x - 20,
      canvas.width - center.x - 20,
      center.y - 20,
      canvas.height - center.y - 20
    );
    if (maxRadius < minLen) continue;
    const minRadius = Math.max(minLen * 0.6, maxRadius * 0.4);
    if (minRadius >= maxRadius) continue;

    const points = [];
    let angle = Math.random() * Math.PI * 2;
    const step = (Math.PI * 2) / vertexCount;
    for (let i = 0; i < vertexCount; i++) {
      angle += step + (Math.random() - 0.5) * step * 0.4;
      const radius = randomInRange(minRadius, maxRadius);
      points.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      });
    }

    let valid = true;
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      if (distance(points[i], next) < minLen) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    return buildTarget(points, true);
  }

  const radius = Math.min(canvas.width, canvas.height) / 3;
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const points = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (Math.PI * 2 * i) / vertexCount;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    });
  }
  return buildTarget(points, true);
}

function generateTarget() {
  if (config.vertexCount <= 2 && !config.closed) {
    return randomLineTarget();
  }
  return randomPolygonTarget(config.vertexCount);
}

function drawTarget(shape = target, color = 'black') {
  if (!shape || shape.points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  for (let i = 1; i < shape.points.length; i++) {
    ctx.lineTo(shape.points[i].x, shape.points[i].y);
  }
  if (shape.closed) {
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
}

function drawTargetPreview(previous) {
  if (!previous) return;
  drawTarget(previous, 'gray');
}

function projectPointToSegments(point, shape) {
  let bestDist = Infinity;
  let bestIdx = -1;
  let bestT = 0;
  shape.segments.forEach((seg, idx) => {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((point.x - seg.start.x) * dx + (point.y - seg.start.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const projX = seg.start.x + t * dx;
    const projY = seg.start.y + t * dy;
    const dist = Math.hypot(point.x - projX, point.y - projY);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = idx;
      bestT = t;
    }
  });
  return { dist: bestDist, idx: bestIdx, t: bestT };
}

function markCoverage(segmentIndex, t) {
  const seg = target?.segments[segmentIndex];
  if (!seg) return;
  const bins = seg.coverage;
  const count = bins.length;
  if (!count) return;
  const position = Math.max(0, Math.min(count - 1, Math.floor(t * count)));
  bins[position] = true;
  if (t * count - position > 0.5 && position + 1 < count) {
    bins[position + 1] = true;
  }
}

function segmentCoverage(seg) {
  const bins = seg.coverage;
  if (!bins || !bins.length) return 0;
  const covered = bins.reduce((sum, filled) => sum + (filled ? 1 : 0), 0);
  return covered / bins.length;
}

function resetDrawingState() {
  drawing = false;
  lastPos = null;
  onLineDist = 0;
  offLineDist = 0;
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
  target = generateTarget();
  clearCanvas(ctx);
  drawTarget();
  stopTimer = startCountdown(timerDisplay, GAME_DURATION);
  gameTimer = setTimeout(endGame, GAME_DURATION);
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  if (stopTimer) stopTimer();
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
  resetDrawingState();
}

function pointerDown(e) {
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  drawing = true;
  lastPos = pos;
  onLineDist = 0;
  offLineDist = 0;
  clearCanvas(ctx);
  canvas.setPointerCapture(e.pointerId);
}

function pointerMove(e) {
  if (!playing || !drawing) return;
  const pos = getCanvasPos(canvas, e);
  const dx = pos.x - lastPos.x;
  const dy = pos.y - lastPos.y;
  const segmentLen = Math.hypot(dx, dy);
  if (segmentLen === 0) return;

  const lastProjection = projectPointToSegments(lastPos, target);
  const projection = projectPointToSegments(pos, target);
  const avgDist = (lastProjection.dist + projection.dist) / 2;
  const onShape = avgDist <= config.tolerance;

  ctx.beginPath();
  ctx.moveTo(lastPos.x, lastPos.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.lineWidth = LINE_WIDTH;
  if (onShape) {
    ctx.strokeStyle = 'green';
    onLineDist += segmentLen;
    if (lastProjection.dist <= config.tolerance) {
      markCoverage(lastProjection.idx, lastProjection.t);
    }
    if (projection.dist <= config.tolerance) {
      markCoverage(projection.idx, projection.t);
    }
  } else {
    ctx.strokeStyle = 'red';
    offLineDist += segmentLen;
  }
  ctx.stroke();

  lastPos = pos;
}

function gradeAttempt() {
  const total = onLineDist + offLineDist;
  if (total === 0) {
    playSound(audioCtx, 'red');
    stats.red += 1;
    updateScoreboard('red');
    return false;
  }
  const offRatio = offLineDist / total;
  const coverageOk = target.segments.every(seg => segmentCoverage(seg) >= config.coverageThreshold);
  const success = coverageOk && offRatio <= config.offRatioLimit;
  playSound(audioCtx, success ? 'green' : 'red');
  if (success) {
    stats.green += 1;
    updateScoreboard('green');
  } else {
    stats.red += 1;
    updateScoreboard('red');
  }
  return success;
}

function pointerUp(e) {
  if (!playing || !drawing) return;
  canvas.releasePointerCapture(e.pointerId);
  drawing = false;
  gradeAttempt();
  const prevTarget = target;
  target = generateTarget();
  clearCanvas(ctx);
  drawTarget();
  drawTargetPreview(prevTarget);
  setTimeout(() => {
    if (!playing) return;
    clearCanvas(ctx);
    drawTarget();
  }, config.previewDelay);
  resetDrawingState();
}

function pointerCancel(e) {
  if (!playing || !drawing) return;
  if (e.pointerId != null) {
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {
      // ignore release errors
    }
  }
  drawing = false;
  gradeAttempt();
  const prevTarget = target;
  target = generateTarget();
  clearCanvas(ctx);
  drawTarget();
  drawTargetPreview(prevTarget);
  setTimeout(() => {
    if (!playing) return;
    clearCanvas(ctx);
    drawTarget();
  }, config.previewDelay);
  resetDrawingState();
}

function initConfig() {
  const vertexCount = parseInt(canvas.dataset.vertexCount || '2', 10);
  const closedAttr = canvas.dataset.closed;
  const closed = closedAttr !== 'false' && !(vertexCount <= 2 && closedAttr !== 'true');
  config = {
    vertexCount: vertexCount > 0 ? vertexCount : 2,
    closed,
    tolerance: parseFloat(canvas.dataset.tolerance) || DEFAULT_TOLERANCE,
    offRatioLimit: parseFloat(canvas.dataset.offRatio) || DEFAULT_OFF_RATIO,
    previewDelay: parseInt(canvas.dataset.previewDelay, 10) || DEFAULT_PREVIEW_DELAY,
    coverageThreshold: parseFloat(canvas.dataset.coverageThreshold) || DEFAULT_COVERAGE_THRESHOLD,
    coverageSamples: parseInt(canvas.dataset.coverageSamples, 10) || DEFAULT_COVERAGE_SAMPLES,
    minSegmentLength: parseFloat(canvas.dataset.minSegmentLength) || DEFAULT_MIN_SEGMENT_LENGTH
  };
}

function setup() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');
  timerDisplay = document.getElementById('timer');
  overlayStartButton(canvas, startBtn);
  scoreKey = canvas.dataset.scoreKey || scoreKey;
  initConfig();

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  startBtn.addEventListener('click', startGame);
}

document.addEventListener('DOMContentLoaded', setup);
