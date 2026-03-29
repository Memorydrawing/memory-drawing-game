import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { createStrikeCounter } from './src/strike-counter.js';

let canvas, ctx, startBtn, result, strikeContainer;
let playing = false;
let targets = [];
let scoreKey = 'dexterity_contours';
let stats = { green: 0, red: 0 };
let startTime = 0;
let strikeCounter = null;

let drawing = false;
let activeTarget = null;
let minT = 1;
let maxT = 0;
let lastPos = null;
let offLineDist = 0;
let onLineDist = 0;

// Match grading parameters with dexterity_lines.js
const tolerance = 4;
const maxOffSegmentRatio = 0.1;
const LINE_WIDTH = 2;
const SAMPLE_POINTS = 50;
const MARGIN = 40;
const MIN_CURVE_LEN = 200;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const MAX_STRIKES = 3;

function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
  };
}

function randomCurve() {
  let x1, y1, x2, y2, dx, dy, len;
  // Ensure the endpoints are a reasonable distance apart
  do {
    x1 = Math.random() * (canvas.width - 2 * MARGIN) + MARGIN;
    y1 = Math.random() * (canvas.height - 2 * MARGIN) + MARGIN;
    x2 = Math.random() * (canvas.width - 2 * MARGIN) + MARGIN;
    y2 = Math.random() * (canvas.height - 2 * MARGIN) + MARGIN;
    dx = x2 - x1;
    dy = y2 - y1;
    len = Math.hypot(dx, dy);
  } while (len < MIN_CURVE_LEN);

  const nx = -dy / len;
  const ny = dx / len;
  // Vary the control point offset more widely to create shallower and deeper curves
  const offset = len * (0.1 + Math.random() * 0.6);
  const type = Math.random() < 0.5 ? 'C' : 'S';

  const cp1 = {
    x: x1 + dx / 3 + nx * offset,
    y: y1 + dy / 3 + ny * offset
  };
  const cp2 = {
    x: x1 + 2 * dx / 3 + nx * offset * (type === 'C' ? 1 : -1),
    y: y1 + 2 * dy / 3 + ny * offset * (type === 'C' ? 1 : -1)
  };

  // Keep the control points on the canvas so the curve doesn't go off-screen
  cp1.x = Math.min(canvas.width - MARGIN, Math.max(MARGIN, cp1.x));
  cp1.y = Math.min(canvas.height - MARGIN, Math.max(MARGIN, cp1.y));
  cp2.x = Math.min(canvas.width - MARGIN, Math.max(MARGIN, cp2.x));
  cp2.y = Math.min(canvas.height - MARGIN, Math.max(MARGIN, cp2.y));

  const points = [];
  for (let i = 0; i <= SAMPLE_POINTS; i++) {
    points.push(cubicBezier({ x: x1, y: y1 }, cp1, cp2, { x: x2, y: y2 }, i / SAMPLE_POINTS));
  }
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLengths.push(l);
    totalLength += l;
  }
  return { x1, y1, x2, y2, cp1, cp2, points, segLengths, totalLength };
}

function drawTargets() {
  clearCanvas(ctx);
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'black';
  ctx.lineWidth = LINE_WIDTH;
  targets.forEach(t => {
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.bezierCurveTo(t.cp1.x, t.cp1.y, t.cp2.x, t.cp2.y, t.x2, t.y2);
    ctx.stroke();

    const angle = Math.atan2(t.y2 - t.cp2.y, t.x2 - t.cp2.x);
    const headLen = 10;
    ctx.beginPath();
    ctx.moveTo(t.x2, t.y2);
    ctx.lineTo(
      t.x2 - headLen * Math.cos(angle - Math.PI / 6),
      t.y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      t.x2 - headLen * Math.cos(angle + Math.PI / 6),
      t.y2 - headLen * Math.sin(angle + Math.PI / 6)
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
  targets = [randomCurve()];
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

function projectPointToCurve(p, curve) {
  let closest = Infinity;
  let bestT = 0;
  let accumulated = 0;
  for (let i = 0; i < curve.points.length - 1; i++) {
    const seg = {
      x1: curve.points[i].x,
      y1: curve.points[i].y,
      x2: curve.points[i+1].x,
      y2: curve.points[i+1].y
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
  offLineDist = 0;
  onLineDist = 0;
  lastPos = pos;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const { dist } = projectPointToCurve(pos, t);
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
  const dx = pos.x - lastPos.x;
  const dy = pos.y - lastPos.y;
  const segmentLen = Math.hypot(dx, dy);

  let dist = Infinity;
  let normT = 0;
  if (activeTarget !== null) {
    ({ dist, t: normT } = projectPointToCurve(pos, targets[activeTarget]));
  } else {
    for (let i = 0; i < targets.length; i++) {
      const proj = projectPointToCurve(pos, targets[i]);
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
  ctx.lineWidth = LINE_WIDTH;
  if (dist <= tolerance && activeTarget !== null) {
    ctx.strokeStyle = 'green';
    minT = Math.min(minT, normT);
    maxT = Math.max(maxT, normT);
    onLineDist += segmentLen;
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
    const offRatio = offLineDist / total;
    const coverage = maxT - minT;
    if (coverage >= 0.9 && offRatio <= maxOffSegmentRatio) {
      playSound(audioCtx, 'green');
      stats.green += 1;
      updateScoreboard('green');
      if (strikeCounter) {
        strikeCounter.registerSuccess();
      }
      targets[activeTarget] = randomCurve();
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
  startBtn.addEventListener('click', startGame);
});

