import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { generateShape, distancePointToSegment } from './geometry.js';

export let canvas, ctx, drawModeToggle, drawModeLabel, gridSelect, result;

export let originalShape = [];
export let playerShape = [];
let isDrawing = false;
export let drawingEnabled = false;
export let lastShape = [];
export let viewTimer = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export function setPlayerShape(shape) { playerShape = shape; }
export function setOriginalShape(shape) { originalShape = shape; }
export function setDrawingEnabled(val) { drawingEnabled = val; }
export function setLastShape(shape) { lastShape = shape; }
export function setViewTimer(timer) { viewTimer = timer; }

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  drawModeToggle = document.getElementById('drawModeToggle');
  drawModeLabel = document.getElementById('drawModeLabel');
  gridSelect = document.getElementById('gridSelect');
  result = document.getElementById('result');

  if (drawModeToggle && drawModeLabel) {
    drawModeToggle.addEventListener('change', () => {
      drawModeLabel.textContent = drawModeToggle.checked ? 'Point-to-Point' : 'Freehand';
    });
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!drawingEnabled) return;
    const pos = getCanvasPos(canvas, e);
    if (drawModeToggle?.checked) {
      audioCtx.resume();
      const { color, sound, dist } = gradePoint(pos);
      playerShape.push({ ...pos, color, dist });
      playSound(audioCtx, sound);
      drawDots();
      if (playerShape.length === originalShape.length) {
        setTimeout(revealShape, 300);
      }
    } else {
      isDrawing = true;
      playerShape = [pos];
      drawFreehand();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawingEnabled || drawModeToggle?.checked || !isDrawing) return;
    const pos = getCanvasPos(canvas, e);
    playerShape.push(pos);
    drawFreehand();
  });

  canvas.addEventListener('pointerup', () => {
    if (!drawingEnabled || drawModeToggle?.checked) return;
    isDrawing = false;
    revealShape();
  });

  document.getElementById('newShapeBtn')?.addEventListener('click', newShape);
  document.getElementById('previousShapeBtn')?.addEventListener('click', previousShape);
  document.getElementById('retryShapeBtn')?.addEventListener('click', retryShape);
});

function getTimeMs() {
  const sec = parseFloat(document.getElementById("timeInput").value);
  return Math.max(1000, sec * 1000);
}

function newShape() {
  clearTimeout(viewTimer);
  const sides = parseInt(document.getElementById("sidesSelect").value);
  const time = getTimeMs();
  lastShape = originalShape.map(p => ({ ...p }));
  const size = document.getElementById("sizeSelect").value;
  originalShape = generateShape(sides, canvas.width, canvas.height, size);
  playerShape = [];
  drawingEnabled = false;
  result.textContent = "";
  clearCanvas(ctx);
  drawGrid();
  drawShape(originalShape, "black");
  viewTimer = setTimeout(() => {
    clearCanvas(ctx);
    drawGrid();
    drawGivenPoints(originalShape);
    drawingEnabled = true;
  }, time);
}

function previousShape() {
  clearTimeout(viewTimer);
  if (!lastShape.length) return;
  originalShape = lastShape.map(p => ({ ...p }));
  playerShape = [];
  drawingEnabled = false;
  result.textContent = "";
  clearCanvas(ctx);
  drawGrid();
  drawShape(originalShape, "black");
  const time = getTimeMs();
  viewTimer = setTimeout(() => {
    clearCanvas(ctx);
    drawGrid();
    drawGivenPoints(originalShape);
    drawingEnabled = true;
  }, time);
}

function retryShape() {
  clearTimeout(viewTimer);
  const time = getTimeMs();
  const ghostShape = playerShape.map(p => ({ x: p.x, y: p.y }));
  playerShape = [];
  drawingEnabled = false;
  result.textContent = "";
  clearCanvas(ctx);
  drawGrid();
  drawShape(originalShape, "black");
  if (ghostShape.length) {
    if (drawModeToggle?.checked) {
      ghostShape.forEach(pt => drawDot(pt, "#ccc"));
    } else if (ghostShape.length === 1) {
      drawDot(ghostShape[0], "#ccc");
    } else if (ghostShape.length > 1) {
      ctx.beginPath();
      ctx.moveTo(ghostShape[0].x, ghostShape[0].y);
      for (let i = 1; i < ghostShape.length; i++) {
        ctx.lineTo(ghostShape[i].x, ghostShape[i].y);
      }
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  viewTimer = setTimeout(() => {
    clearCanvas(ctx);
    drawGrid();
    drawGivenPoints(originalShape);
    drawingEnabled = true;
  }, time);
}

export function drawGrid() {
  const gridVal = parseInt(gridSelect.value);
  if (gridVal < 2) return;
  const spacing = canvas.width / gridVal;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < gridVal; i++) {
    let pos = spacing * i;
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(canvas.width, pos); ctx.stroke();
  }
}

export function drawShape(points, color) {
  if (points.length === 1) { drawDot(points[0], color); return; }
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
}

export function drawGivenPoints(points) {
  const extremes = {
    top: points.reduce((a, b) => (a.y < b.y ? a : b)),
    bottom: points.reduce((a, b) => (a.y > b.y ? a : b)),
    left: points.reduce((a, b) => (a.x < b.x ? a : b)),
    right: points.reduce((a, b) => (a.x > b.x ? a : b))
  };
  if (document.getElementById("giveHighest").checked) drawDot(extremes.top, "blue");
  if (document.getElementById("giveLowest").checked) drawDot(extremes.bottom, "blue");
  if (document.getElementById("giveLeftmost").checked) drawDot(extremes.left, "blue");
  if (document.getElementById("giveRightmost").checked) drawDot(extremes.right, "blue");
}

function drawDot(pt, color) {
  ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
}

function gradePoint(p) {
  const dist = originalShape.reduce((min, q) => {
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    return d < min ? d : min;
  }, Infinity);
  let color = 'red';
  let sound = 'red';
  if (dist <= 5) { color = 'green'; sound = 'green'; }
  else if (dist <= 10) { color = 'orange'; sound = 'yellow'; }
  return { color, sound, dist };
}

function drawDots() {
  clearCanvas(ctx); drawGrid();
  drawGivenPoints(originalShape);
  playerShape.forEach(pt => drawDot(pt, pt.color || "red"));
}

export function revealShape() {
  drawingEnabled = false;
  clearCanvas(ctx);
  drawGrid();
  drawShape(originalShape, "black");
  if (drawModeToggle.checked) {
    evaluatePointToPoint();
  } else {
    evaluateFreehand();
  }
  document.dispatchEvent(new CustomEvent('shapeRevealed'));
}

function evaluatePointToPoint() {
  let totalDist = 0;
  playerShape.forEach((p, i) => {
    totalDist += p.dist ?? 0;
    drawDot(p, p.color || "red");
    ctx.fillStyle = p.color || "red";
    ctx.font = "16px sans-serif";
    ctx.fillText(i + 1, p.x + 6, p.y - 6);
  });
  const avg = playerShape.length ? totalDist / playerShape.length : 0;
  let best = parseFloat(localStorage.getItem('p2pBest'));
  if (isNaN(best) || avg < best) {
    best = avg;
    localStorage.setItem('p2pBest', best.toString());
  }
  result.textContent = `Average error: ${avg.toFixed(1)} px (Best: ${best.toFixed(1)} px)`;
}

function evaluateFreehand() {
  if (playerShape.length < 2) {
    result.textContent = "No drawing to grade.";
    return;
  }
  let totalDist = 0;
  for (let i = 1; i < playerShape.length; i++) {
    const p = playerShape[i];
    const d = distanceToPolygon(p, originalShape);
    totalDist += d;
    let color = "red";
    if (d <= 5) color = "green";
    else if (d <= 10) color = "orange";
    ctx.beginPath();
    ctx.moveTo(playerShape[i - 1].x, playerShape[i - 1].y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const avg = totalDist / (playerShape.length - 1);
  let best = parseFloat(localStorage.getItem('freehandBest'));
  if (isNaN(best) || avg < best) {
    best = avg;
    localStorage.setItem('freehandBest', best.toString());
  }
  result.textContent = `Average error: ${avg.toFixed(1)} px (Best: ${best.toFixed(1)} px)`;
}

function distanceToPolygon(p, poly) {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const d = distancePointToSegment(p, a, b);
    if (d < min) min = d;
  }
  return min;
}

function drawFreehand() {
  clearCanvas(ctx); drawGrid(); drawGivenPoints(originalShape);
  if (playerShape.length < 2) return;
  ctx.beginPath(); ctx.moveTo(playerShape[0].x, playerShape[0].y);
  for (let i = 1; i < playerShape.length; i++) ctx.lineTo(playerShape[i].x, playerShape[i].y);
  ctx.strokeStyle = "red"; ctx.lineWidth = 1.5; ctx.stroke();
}
