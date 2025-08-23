import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, startBtn, result;
let playing = false;
let targets = [];
let score = 0;
let gameTimer = null;
let scoreKey = 'dexterity_contours';

let drawing = false;
let activeTarget = null;
let minT = 1;
let maxT = 0;
let lastPos = null;
let offLineSegments = 0;
let totalSegments = 0;

const tolerance = 6;
const maxOffSegmentRatio = 0.15;
const LINE_WIDTH = 2;
const SAMPLE_POINTS = 50;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
  };
}

function randomCurve() {
  const margin = 40;
  const x1 = Math.random() * (canvas.width - 2 * margin) + margin;
  const y1 = Math.random() * (canvas.height - 2 * margin) + margin;
  const x2 = Math.random() * (canvas.width - 2 * margin) + margin;
  const y2 = Math.random() * (canvas.height - 2 * margin) + margin;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = len * (0.3 + Math.random() * 0.2);
  const type = Math.random() < 0.5 ? 'C' : 'S';

  const cp1 = {
    x: x1 + dx / 3 + nx * offset,
    y: y1 + dy / 3 + ny * offset
  };
  const cp2 = {
    x: x1 + 2 * dx / 3 + nx * offset * (type === 'C' ? 1 : -1),
    y: y1 + 2 * dy / 3 + ny * offset * (type === 'C' ? 1 : -1)
  };

  const points = [];
  for (let i = 0; i <= SAMPLE_POINTS; i++) {
    points.push(cubicBezier({x:x1,y:y1}, cp1, cp2, {x:x2,y:y2}, i / SAMPLE_POINTS));
  }
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
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
  audioCtx.resume();
  playing = true;
  score = 0;
  result.textContent = '';
  startBtn.disabled = true;
  targets = [randomCurve(), randomCurve()];
  drawTargets();
  gameTimer = setTimeout(endGame, 60000);
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  clearCanvas(ctx);
  let high = parseInt(localStorage.getItem(scoreKey)) || 0;
  if (score > high) {
    high = score;
    localStorage.setItem(scoreKey, high.toString());
  }
  result.textContent = `Score: ${score} (Best: ${high})`;
  startBtn.disabled = false;
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
  offLineSegments = 0;
  totalSegments = 0;
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
    targets[activeTarget] = randomCurve();
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
  scoreKey = canvas.dataset.scoreKey || scoreKey;

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointerleave', pointerUp);
  startBtn.addEventListener('click', startGame);
});

