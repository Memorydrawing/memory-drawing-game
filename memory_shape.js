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
const DEFAULT_CONTOUR_MIN_LENGTH = 180;
const DEFAULT_ELLIPSE_SEGMENTS = 64;
const CONTOUR_SAMPLE_POINTS = 60;
const CONTOUR_MARGIN = 40;
const LINE_ARROW_SIZE = 10;
const MAX_STRIKES = 3;
const DESATURATED_COLORS = {
  green: '#6ca96c',
  red: '#b06c6c',
  yellow: '#bfa76c'
};

const DEFAULT_GRACE_OFF_RATIO_BUFFER = 0.1;
const DEFAULT_GRACE_COVERAGE_BUFFER = 0.1;

let canvas, ctx, startBtn, result, strikeElems, strikeContainer;
let playing = false;
let drawing = false;
let target = null;
let scoreKey = 'memory_shape';
let stats = { green: 0, yellow: 0, red: 0 };
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x:
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x,
    y:
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y
  };
}

function buildTarget(points, closed, options = {}) {
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
  return {
    points,
    segments,
    closed,
    totalLength,
    type: options.type || (closed ? 'polygon' : 'polyline'),
    meta: options.meta || null
  };
}

function cloneTarget(source) {
  if (!source) return null;
  const clonedPoints = source.points.map(point => ({ x: point.x, y: point.y }));
  const meta = source.meta ? JSON.parse(JSON.stringify(source.meta)) : null;
  return buildTarget(clonedPoints, source.closed, { type: source.type, meta });
}

function randomLineTarget() {
  const margin = 20;
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
      return buildTarget([p1, p2], false, {
        type: 'line',
        meta: { start: p1, end: p2 }
      });
    }
  }
  const fallback = [
    { x: margin, y: margin },
    { x: canvas.width - margin, y: canvas.height - margin }
  ];
  return buildTarget(fallback, false, {
    type: 'line',
    meta: { start: fallback[0], end: fallback[1] }
  });
}

function randomContourTarget() {
  const minLen = Math.max(config.minSegmentLength, DEFAULT_CONTOUR_MIN_LENGTH);
  for (let attempt = 0; attempt < 60; attempt++) {
    const start = {
      x: randomInRange(CONTOUR_MARGIN, canvas.width - CONTOUR_MARGIN),
      y: randomInRange(CONTOUR_MARGIN, canvas.height - CONTOUR_MARGIN)
    };
    const end = {
      x: randomInRange(CONTOUR_MARGIN, canvas.width - CONTOUR_MARGIN),
      y: randomInRange(CONTOUR_MARGIN, canvas.height - CONTOUR_MARGIN)
    };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len < minLen) continue;

    const nx = -dy / len;
    const ny = dx / len;
    const offset = len * (0.15 + Math.random() * 0.55);
    const sameSide = Math.random() < 0.5;

    let cp1 = {
      x: start.x + dx / 3 + nx * offset,
      y: start.y + dy / 3 + ny * offset
    };
    let cp2 = {
      x: start.x + (2 * dx) / 3 + nx * offset * (sameSide ? 1 : -1),
      y: start.y + (2 * dy) / 3 + ny * offset * (sameSide ? 1 : -1)
    };

    cp1 = {
      x: clamp(cp1.x, CONTOUR_MARGIN, canvas.width - CONTOUR_MARGIN),
      y: clamp(cp1.y, CONTOUR_MARGIN, canvas.height - CONTOUR_MARGIN)
    };
    cp2 = {
      x: clamp(cp2.x, CONTOUR_MARGIN, canvas.width - CONTOUR_MARGIN),
      y: clamp(cp2.y, CONTOUR_MARGIN, canvas.height - CONTOUR_MARGIN)
    };

    const points = [];
    for (let i = 0; i <= CONTOUR_SAMPLE_POINTS; i++) {
      const t = i / CONTOUR_SAMPLE_POINTS;
      points.push(cubicBezierPoint(start, cp1, cp2, end, t));
    }

    return buildTarget(points, false, {
      type: 'contour',
      meta: { start, cp1, cp2, end }
    });
  }

  const start = { x: CONTOUR_MARGIN, y: canvas.height / 2 };
  const end = { x: canvas.width - CONTOUR_MARGIN, y: canvas.height / 2 };
  const cpOffset = (end.x - start.x) / 4;
  const cp1 = { x: start.x + cpOffset, y: start.y - cpOffset };
  const cp2 = { x: end.x - cpOffset, y: end.y + cpOffset };
  const points = [];
  for (let i = 0; i <= CONTOUR_SAMPLE_POINTS; i++) {
    const t = i / CONTOUR_SAMPLE_POINTS;
    points.push(cubicBezierPoint(start, cp1, cp2, end, t));
  }
  return buildTarget(points, false, {
    type: 'contour',
    meta: { start, cp1, cp2, end }
  });
}

function randomEllipseTarget() {
  const minAxis = Math.max(config.minSegmentLength * 0.75, 60);
  const padding = minAxis + 40;
  const segments = config.ellipseSegments || DEFAULT_ELLIPSE_SEGMENTS;

  for (let attempt = 0; attempt < 80; attempt++) {
    const minX = padding;
    const maxX = canvas.width - padding;
    const minY = padding;
    const maxY = canvas.height - padding;
    if (maxX <= minX || maxY <= minY) {
      break;
    }

    const center = {
      x: randomInRange(minX, maxX),
      y: randomInRange(minY, maxY)
    };

    const maxRadiusX = Math.min(center.x - 20, canvas.width - center.x - 20);
    const maxRadiusYAvail = Math.min(center.y - 20, canvas.height - center.y - 20);

    if (maxRadiusX <= minAxis || maxRadiusYAvail <= minAxis * 0.6) {
      continue;
    }

    const radiusX = randomInRange(minAxis, maxRadiusX);
    const minRadiusYBase = Math.max(minAxis * 0.6, 30);
    const maxRadiusYBase = Math.min(radiusX * 1.2, maxRadiusYAvail);
    if (maxRadiusYBase <= minRadiusYBase) {
      continue;
    }
    const radiusY = randomInRange(minRadiusYBase, maxRadiusYBase);
    const rotation = randomInRange(0, Math.PI);

    const cosRot = Math.cos(rotation);
    const sinRot = Math.sin(rotation);
    const points = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      points.push({
        x: center.x + radiusX * cos * cosRot - radiusY * sin * sinRot,
        y: center.y + radiusX * cos * sinRot + radiusY * sin * cosRot
      });
    }

    return buildTarget(points, true, {
      type: 'ellipse',
      meta: { center, radiusX, radiusY, rotation }
    });
  }

  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const radiusX = Math.min(canvas.width, canvas.height) / 3;
  const radiusY = radiusX * 0.7;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push({
      x: center.x + radiusX * Math.cos(theta),
      y: center.y + radiusY * Math.sin(theta)
    });
  }
  return buildTarget(points, true, {
    type: 'ellipse',
    meta: { center, radiusX, radiusY, rotation: 0 }
  });
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
  if (config.shapeType === 'contour') {
    return randomContourTarget();
  }
  if (config.shapeType === 'ellipse') {
    return randomEllipseTarget();
  }
  if (config.shapeType === 'line' || (config.vertexCount <= 2 && !config.closed)) {
    return randomLineTarget();
  }
  return randomPolygonTarget(config.vertexCount);
}

function drawArrowhead(endpoint, angle, color) {
  const headLen = LINE_ARROW_SIZE;
  ctx.beginPath();
  ctx.moveTo(endpoint.x, endpoint.y);
  ctx.lineTo(
    endpoint.x - headLen * Math.cos(angle - Math.PI / 6),
    endpoint.y - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    endpoint.x - headLen * Math.cos(angle + Math.PI / 6),
    endpoint.y - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawTarget(shape = target, color = 'black') {
  if (!shape || shape.points.length === 0) return;
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeStyle = color;

  if (shape.type === 'contour' && shape.meta) {
    const { start, cp1, cp2, end } = shape.meta;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
    ctx.stroke();
    const angle = Math.atan2(end.y - cp2.y, end.x - cp2.x);
    drawArrowhead(end, angle, color);
  } else if (shape.type === 'ellipse' && shape.meta) {
    const { center, radiusX, radiusY, rotation } = shape.meta;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radiusX, radiusY, rotation || 0, 0, Math.PI * 2);
    if (config?.fillShape) {
      ctx.fillStyle = color;
      ctx.fill();
    }
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
    ctx.stroke();

    if (!shape.closed && shape.type === 'line' && shape.meta) {
      const { start, end } = shape.meta;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      drawArrowhead(end, angle, color);
    }
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

function markSegmentRange(segmentIndex, startT, endT) {
  const seg = target?.segments[segmentIndex];
  if (!seg) return;
  const bins = seg.coverage;
  const count = bins.length;
  if (!count) return;

  const lowT = Math.min(startT, endT);
  const highT = Math.max(startT, endT);
  let start = Math.floor(clamp(lowT, 0, 1) * count);
  let end = Math.floor(clamp(highT, 0, 1) * count);
  start = Math.max(0, Math.min(count - 1, start));
  end = Math.max(0, Math.min(count - 1, end));

  for (let i = start; i <= end; i++) {
    bins[i] = true;
  }

  const fractionalEnd = clamp(highT, 0, 1) * count - end;
  if (fractionalEnd > 0.5 && end + 1 < count) {
    bins[end + 1] = true;
  }
}

function markCoverageRange(prevProjection, projection) {
  if (!target || !prevProjection || !projection) return;
  const prevIdx = prevProjection.idx;
  const nextIdx = projection.idx;
  if (prevIdx === -1 && nextIdx === -1) return;

  if (prevIdx === nextIdx) {
    if (prevIdx !== -1) {
      markSegmentRange(prevIdx, prevProjection.t, projection.t);
    }
    return;
  }

  if (prevIdx !== -1) {
    markSegmentRange(prevIdx, prevProjection.t, prevIdx < nextIdx ? 1 : 0);
  }

  if (nextIdx !== -1) {
    markSegmentRange(nextIdx, nextIdx > prevIdx ? 0 : 1, projection.t);
  }

  if (prevIdx === -1 || nextIdx === -1) {
    return;
  }

  const step = prevIdx < nextIdx ? 1 : -1;
  for (let i = prevIdx + step; i !== nextIdx; i += step) {
    markSegmentRange(i, 0, 1);
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
  if (!strikeContainer) return;
  if (!strikeElems || strikeElems.length === 0) {
    strikeElems = Array.from(strikeContainer.querySelectorAll('.strike-box'));
  }
  strikeElems.forEach((el, idx) => {
    el.classList.toggle('filled', idx < strikes);
  });
  strikeContainer.setAttribute('aria-label', `Strikes: ${Math.min(strikes, MAX_STRIKES)} of ${MAX_STRIKES}`);
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
  stats = { green: 0, yellow: 0, red: 0 };
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
    { green: stats.green, yellow: stats.yellow, red: stats.red },
    elapsed
  );
  const prefix = strikes >= MAX_STRIKES ? 'Struck out! ' : '';
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, finalScore);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = `${prefix}Score: ${finalScore} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
  } else {
    result.textContent = `${prefix}Score: ${finalScore} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
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
    const lastWithin = lastProjection.dist <= config.tolerance;
    const currentWithin = projection.dist <= config.tolerance;
    if (lastWithin) {
      markSegmentRange(lastProjection.idx, lastProjection.t, lastProjection.t);
    }
    if (currentWithin) {
      markSegmentRange(projection.idx, projection.t, projection.t);
    }
    if (lastWithin && currentWithin) {
      markCoverageRange(lastProjection, projection);
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
  let grade = 'red';
  const contourMode = config.shapeType === 'contour';
  if (total > 0) {
    const offRatio = offLineDist / total;
    const totalCoveredLength = target.segments.reduce(
      (sum, seg) => sum + segmentCoverage(seg) * seg.length,
      0
    );
    const totalLength = target.totalLength || 0;
    const coverageRatio = totalLength > 0 ? totalCoveredLength / totalLength : 0;
    const coverageOk = coverageRatio >= config.coverageThreshold;
    const graceCoverageThreshold = Math.max(0, config.coverageThreshold - config.graceCoverageBuffer);
    const coverageGrace = coverageRatio >= graceCoverageThreshold;
    const success = coverageOk && offRatio <= config.offRatioLimit;
    const nearMiss =
      !contourMode &&
      !success &&
      coverageGrace &&
      offRatio <= config.offRatioLimit + config.graceOffRatioBuffer;
    if (success) {
      grade = 'green';
    } else if (nearMiss) {
      grade = 'yellow';
    }
  }

  playSound(audioCtx, grade);
  if (grade === 'green') {
    stats.green += 1;
    updateScoreboard('green');
  } else if (grade === 'yellow') {
    stats.yellow += 1;
    updateScoreboard('orange');
  } else {
    stats.red += 1;
    updateScoreboard('red');
  }
  return grade;
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

  const grade = gradeAttempt();
  const success = grade === 'green';
  const nearMiss = grade === 'yellow';
  const attemptPath = currentPath.map(segment => ({
    start: { x: segment.start.x, y: segment.start.y },
    end: { x: segment.end.x, y: segment.end.y },
    color: nearMiss ? 'yellow' : segment.color
  }));
  if (success) {
    strikes = 0;
  } else if (!nearMiss) {
    strikes = Math.min(MAX_STRIKES, strikes + 1);
  }
  updateStrikes();

  const shouldEnd = grade === 'red' && strikes >= MAX_STRIKES;
  const nextTarget = success || nearMiss ? generateTarget() : cloneTarget(prevTarget);
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
  const closedAttr = canvas.dataset.closed;
  const shapeTypeAttr = (canvas.dataset.shapeType || '').toLowerCase();
  let closed = closedAttr !== 'false' && !(vertexCount <= 2 && closedAttr !== 'true');
  if (shapeTypeAttr === 'line' || shapeTypeAttr === 'contour') {
    closed = false;
  } else if (shapeTypeAttr === 'ellipse') {
    closed = true;
  }
  const derivedShapeType =
    shapeTypeAttr || (closed ? 'polygon' : vertexCount <= 2 ? 'line' : 'polyline');
  const graceOffRatioAttr = parseFloat(canvas.dataset.graceOffBuffer);
  const graceCoverageAttr = parseFloat(canvas.dataset.graceCoverageBuffer);
  config = {
    vertexCount: vertexCount > 0 ? vertexCount : 2,
    closed,
    tolerance: parseFloat(canvas.dataset.tolerance) || DEFAULT_TOLERANCE,
    offRatioLimit: parseFloat(canvas.dataset.offRatio) || DEFAULT_OFF_RATIO,
    previewDelay: parseInt(canvas.dataset.previewDelay, 10) || DEFAULT_PREVIEW_DELAY,
    coverageThreshold: parseFloat(canvas.dataset.coverageThreshold) || DEFAULT_COVERAGE_THRESHOLD,
    coverageSamples: parseInt(canvas.dataset.coverageSamples, 10) || DEFAULT_COVERAGE_SAMPLES,
    minSegmentLength: parseFloat(canvas.dataset.minSegmentLength) ||
      (derivedShapeType === 'contour' ? DEFAULT_CONTOUR_MIN_LENGTH : DEFAULT_MIN_SEGMENT_LENGTH),
    fillShape: canvas.dataset.fillShape === 'true',
    shapeType: derivedShapeType,
    ellipseSegments: parseInt(canvas.dataset.ellipseSegments, 10) || DEFAULT_ELLIPSE_SEGMENTS,
    graceOffRatioBuffer: Number.isFinite(graceOffRatioAttr) && graceOffRatioAttr >= 0
      ? graceOffRatioAttr
      : DEFAULT_GRACE_OFF_RATIO_BUFFER,
    graceCoverageBuffer: Number.isFinite(graceCoverageAttr) && graceCoverageAttr >= 0
      ? graceCoverageAttr
      : DEFAULT_GRACE_COVERAGE_BUFFER
  };
}

function setup() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');
  strikeContainer = document.getElementById('strikes');
  strikeElems = strikeContainer ? Array.from(strikeContainer.querySelectorAll('.strike-box')) : [];
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
