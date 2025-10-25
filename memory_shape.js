import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';

const LINE_WIDTH = 2;
const DEFAULT_TOLERANCE = 6;
const DEFAULT_OFF_RATIO = 0.25;
const DEFAULT_PREVIEW_DELAY = 600;
const DEFAULT_COVERAGE_THRESHOLD = 0.85;
const DEFAULT_COVERAGE_SAMPLES = 24;
const DEFAULT_MIN_SEGMENT_LENGTH = 60;
const DEFAULT_ELLIPSE_SEGMENTS = 96;
const DEFAULT_ELLIPSE_MARGIN = 50;
const DEFAULT_ELLIPSE_MIN_RATIO = 0.65;
const MAX_STRIKES = 3;
const DESATURATED_COLORS = {
  green: '#6ca96c',
  red: '#b06c6c'
};

let canvas, ctx, startBtn, result, strikeElems;
let playing = false;
let drawing = false;
let target = null;
let scoreKey = 'memory_shape';
let stats = { green: 0, red: 0 };
let sessionStart = 0;
let strikes = 0;
let showingFeedback = false;
let feedbackTimeout = null;
let lastPos = null;
let onLineDist = 0;
let offLineDist = 0;
let config = null;
let currentPath = [];

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function buildTarget(points, closed, meta = null) {
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
  return { points, segments, closed, totalLength, meta };
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

function randomEllipseTarget() {
  const margin = config.ellipseMargin ?? DEFAULT_ELLIPSE_MARGIN;
  const minCanvasDim = Math.min(canvas.width, canvas.height);
  const minRadiusRaw = config.ellipseMinRadius ?? minCanvasDim * 0.18;
  const maxRadiusRaw = config.ellipseMaxRadius ?? minCanvasDim * 0.38;
  const minRadius = Math.max(20, Math.min(minRadiusRaw, maxRadiusRaw));
  const maxRadius = Math.max(minRadiusRaw, maxRadiusRaw);
  const minRatio = Math.max(0.3, Math.min(config.ellipseMinRatio ?? DEFAULT_ELLIPSE_MIN_RATIO, 1));
  const rawMaxRatio = Math.min(1, config.ellipseMaxRatio ?? 1);
  const maxRatio = Math.max(minRatio, rawMaxRatio);
  const segments = config.ellipseSegments ?? DEFAULT_ELLIPSE_SEGMENTS;

  for (let attempt = 0; attempt < 80; attempt++) {
    const major = randomInRange(minRadius, maxRadius);
    const ratio = randomInRange(minRatio, maxRatio);
    const minor = Math.max(minRadius * minRatio, major * ratio);

    const radiusX = major;
    const radiusY = minor;
    const center = {
      x: randomInRange(margin + radiusX, canvas.width - margin - radiusX),
      y: randomInRange(margin + radiusY, canvas.height - margin - radiusY)
    };

    if (
      center.x - radiusX < margin ||
      center.x + radiusX > canvas.width - margin ||
      center.y - radiusY < margin ||
      center.y + radiusY > canvas.height - margin
    ) {
      continue;
    }

    const rotation = randomInRange(0, Math.PI);
    const points = buildEllipsePoints(center, radiusX, radiusY, rotation, segments);
    const targetMeta = { type: 'ellipse', center, radiusX, radiusY, rotation };
    const ellipseTarget = buildTarget(points, true, targetMeta);
    if (ellipseTarget.totalLength >= config.minSegmentLength * 4) {
      return ellipseTarget;
    }
  }

  const fallbackRadius = minCanvasDim * 0.3;
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const rotation = 0;
  const points = buildEllipsePoints(center, fallbackRadius, fallbackRadius * 0.85, rotation, segments);
  return buildTarget(points, true, {
    type: 'ellipse',
    center,
    radiusX: fallbackRadius,
    radiusY: fallbackRadius * 0.85,
    rotation
  });
}

function generateTarget() {
  if (config.shapeType === 'ellipse') {
    return randomEllipseTarget();
  }
  if (config.vertexCount <= 2 && !config.closed) {
    return randomLineTarget();
  }
  return randomPolygonTarget(config.vertexCount);
}

function drawTarget(shape = target, color = 'black') {
  if (!shape || shape.points.length === 0) return;
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  if (shape.meta?.type === 'ellipse') {
    const { center, radiusX, radiusY, rotation } = shape.meta;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    if (config?.fillShape) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    if (shape.closed) {
      ctx.closePath();
    }
    if (config?.fillShape && shape.closed) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.restore();
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
  currentPath = [];
}

function updateStrikes() {
  if (!strikeElems || strikeElems.length === 0) return;
  strikeElems.forEach((el, idx) => {
    el.checked = idx < strikes;
  });
}

function drawAttemptPath(path, desaturated = false) {
  if (!path || path.length === 0) return;
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  path.forEach(segment => {
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    const baseColor = segment.color || 'black';
    ctx.strokeStyle = desaturated ? DESATURATED_COLORS[baseColor] || baseColor : baseColor;
    ctx.stroke();
  });
  ctx.restore();
}

function showGradingFeedback(prevTarget, attemptPath, callback) {
  showingFeedback = true;
  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout);
  }
  clearCanvas(ctx);
  drawTarget(prevTarget);
  drawAttemptPath(attemptPath, true);
  feedbackTimeout = setTimeout(() => {
    showingFeedback = false;
    feedbackTimeout = null;
    if (callback) callback();
  }, config.previewDelay);
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  showingFeedback = false;
  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout);
    feedbackTimeout = null;
  }
  stats = { green: 0, red: 0 };
  strikes = 0;
  startScoreboard(canvas);
  sessionStart = Date.now();
  result.textContent = '';
  startBtn.disabled = true;
  target = generateTarget();
  clearCanvas(ctx);
  drawTarget();
  updateStrikes();
}

function endGame() {
  if (!playing) return;
  playing = false;
  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout);
    feedbackTimeout = null;
  }
  clearCanvas(ctx);
  const elapsed = sessionStart ? Date.now() - sessionStart : 0;
  const { score: finalScore, accuracyPct, speed } = calculateScore(
    { green: stats.green, yellow: 0, red: stats.red },
    elapsed
  );
  const prefix = strikes >= MAX_STRIKES ? 'Struck out! ' : '';
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, finalScore);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = `${prefix}Score: ${finalScore} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  } else {
    result.textContent = `${prefix}Score: ${finalScore} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  }
  strikes = Math.min(strikes, MAX_STRIKES);
  updateStrikes();
  startBtn.disabled = false;
  startBtn.style.display = '';
  target = null;
  sessionStart = 0;
  resetDrawingState();
}

function pointerDown(e) {
  if (!playing || showingFeedback) return;
  const pos = getCanvasPos(canvas, e);
  drawing = true;
  lastPos = pos;
  onLineDist = 0;
  offLineDist = 0;
  currentPath = [];
  clearCanvas(ctx);
  canvas.setPointerCapture(e.pointerId);
}

function pointerMove(e) {
  if (!playing || !drawing || showingFeedback) return;
  const pos = getCanvasPos(canvas, e);
  const dx = pos.x - lastPos.x;
  const dy = pos.y - lastPos.y;
  const segmentLen = Math.hypot(dx, dy);
  if (segmentLen === 0) return;

  const lastProjection = projectPointToSegments(lastPos, target);
  const projection = projectPointToSegments(pos, target);
  const avgDist = (lastProjection.dist + projection.dist) / 2;
  const onShape = avgDist <= config.tolerance;

  const from = { x: lastPos.x, y: lastPos.y };
  const to = { x: pos.x, y: pos.y };

  ctx.beginPath();
  ctx.moveTo(lastPos.x, lastPos.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.lineWidth = LINE_WIDTH;
  const segmentColor = onShape ? 'green' : 'red';
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

  currentPath.push({ start: from, end: to, color: segmentColor });

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

function finishAttempt(e) {
  if (!playing || !drawing) return;
  if (e?.pointerId != null) {
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {
      // ignore release errors
    }
  }
  drawing = false;

  const prevTarget = target;
  const attemptPath = currentPath.map(segment => ({
    start: { x: segment.start.x, y: segment.start.y },
    end: { x: segment.end.x, y: segment.end.y },
    color: segment.color
  }));

  const success = gradeAttempt();
  if (!success) {
    strikes = Math.min(MAX_STRIKES, strikes + 1);
    updateStrikes();
  } else {
    strikes = 0;
    updateStrikes();
  }

  const shouldEnd = !success && strikes >= MAX_STRIKES;
  const nextTarget = success
    ? generateTarget()
    : buildTarget(
        prevTarget.points.map(point => ({ x: point.x, y: point.y })),
        prevTarget.closed,
        prevTarget.meta ? { ...prevTarget.meta } : null
      );
  target = nextTarget;
  resetDrawingState();

  showGradingFeedback(prevTarget, attemptPath, () => {
    if (shouldEnd) {
      endGame();
      return;
    }
    if (!playing) return;
    clearCanvas(ctx);
    drawTarget(target);
  });
}

function pointerUp(e) {
  finishAttempt(e);
}

function pointerCancel(e) {
  finishAttempt(e);
}

function initConfig() {
  const vertexCount = parseInt(canvas.dataset.vertexCount || '2', 10);
  const shapeType = canvas.dataset.shapeType || 'polygon';
  const closedAttr = canvas.dataset.closed;
  let closed = closedAttr !== 'false' && !(vertexCount <= 2 && closedAttr !== 'true');
  if (shapeType === 'ellipse') {
    closed = true;
  }
  const ellipseSegments = parseInt(canvas.dataset.ellipseSegments || '', 10);
  const ellipseMargin = parseFloat(canvas.dataset.ellipseMargin || '');
  const ellipseMinRadius = parseFloat(canvas.dataset.ellipseMinRadius || '');
  const ellipseMaxRadius = parseFloat(canvas.dataset.ellipseMaxRadius || '');
  const ellipseMinRatio = parseFloat(canvas.dataset.ellipseMinRatio || '');
  const ellipseMaxRatio = parseFloat(canvas.dataset.ellipseMaxRatio || '');
  config = {
    vertexCount: vertexCount > 0 ? vertexCount : 2,
    closed,
    tolerance: parseFloat(canvas.dataset.tolerance) || DEFAULT_TOLERANCE,
    offRatioLimit: parseFloat(canvas.dataset.offRatio) || DEFAULT_OFF_RATIO,
    previewDelay: parseInt(canvas.dataset.previewDelay, 10) || DEFAULT_PREVIEW_DELAY,
    coverageThreshold: parseFloat(canvas.dataset.coverageThreshold) || DEFAULT_COVERAGE_THRESHOLD,
    coverageSamples: parseInt(canvas.dataset.coverageSamples, 10) || DEFAULT_COVERAGE_SAMPLES,
    minSegmentLength: parseFloat(canvas.dataset.minSegmentLength) || DEFAULT_MIN_SEGMENT_LENGTH,
    fillShape: canvas.dataset.fillShape === 'true',
    shapeType,
    ellipseSegments: Number.isFinite(ellipseSegments) && ellipseSegments > 12 ? ellipseSegments : undefined,
    ellipseMargin: Number.isFinite(ellipseMargin) && ellipseMargin >= 0 ? ellipseMargin : undefined,
    ellipseMinRadius: Number.isFinite(ellipseMinRadius) && ellipseMinRadius > 0 ? ellipseMinRadius : undefined,
    ellipseMaxRadius: Number.isFinite(ellipseMaxRadius) && ellipseMaxRadius > 0 ? ellipseMaxRadius : undefined,
    ellipseMinRatio: Number.isFinite(ellipseMinRatio) && ellipseMinRatio > 0 ? ellipseMinRatio : undefined,
    ellipseMaxRatio: Number.isFinite(ellipseMaxRatio) && ellipseMaxRatio > 0 ? ellipseMaxRatio : undefined
  };
}

function setup() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');
  strikeElems = Array.from(document.querySelectorAll('#strikes .strike'));
  overlayStartButton(canvas, startBtn);
  scoreKey = canvas.dataset.scoreKey || scoreKey;
  initConfig();
  updateStrikes();

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  startBtn.addEventListener('click', startGame);
}

document.addEventListener('DOMContentLoaded', setup);
