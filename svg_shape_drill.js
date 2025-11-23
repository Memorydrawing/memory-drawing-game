import { getCanvasPos, clearCanvas, preventDoubleTapZoom, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { createStrikeCounter } from './src/strike-counter.js';
import { startScoreboard, updateScoreboard, getCurrentScore } from './src/scoreboard.js';
import { distancePointToSegment } from './geometry.js';
import { getCategories, getShapesForCategory } from './svg-shapes.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const result = document.getElementById('result');
const categorySelect = document.getElementById('categorySelect');
const shapeLabel = document.getElementById('shapeLabel');
const strikeContainer = document.getElementById('strikeContainer');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const HIT_TOLERANCE = 10;
const MIN_SAMPLES_FOR_SCORING = 12;
const MAX_STRIKES = 3;

let strikeCounter = null;
let currentShape = null;
let playing = false;
let drawing = false;
let playerStroke = [];
let strokeGrades = [];
let lastPointerId = null;

function init() {
  preventDoubleTapZoom(canvas);
  overlayStartButton(canvas, startBtn);
  strikeCounter = createStrikeCounter(strikeContainer, MAX_STRIKES);
  populateCategories();
  attachPointerHandlers();
  startBtn.addEventListener('click', startDrill);
}

function populateCategories() {
  const categories = getCategories();
  categories.forEach(({ key, label }) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = label;
    categorySelect.appendChild(option);
  });
  if (categories.length) {
    categorySelect.value = categories[0].key;
  }
  categorySelect.addEventListener('change', () => {
    if (!playing) return;
    loadNextShape();
  });
}

function attachPointerHandlers() {
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
}

function startDrill() {
  hideStartButton(startBtn);
  result.textContent = '';
  startScoreboard(canvas);
  strikeCounter.reset();
  playing = true;
  loadNextShape();
}

function pickShape() {
  const shapes = getShapesForCategory(categorySelect.value || 'anatomy');
  if (shapes.length === 0) return null;
  const index = Math.floor(Math.random() * shapes.length);
  return shapes[index];
}

async function loadNextShape() {
  const shapeEntry = pickShape();
  if (!shapeEntry) {
    result.textContent = 'No shapes available. Add SVGs to svg-shapes.js to begin.';
    return;
  }

  try {
    currentShape = await loadSvgShape(shapeEntry);
    shapeLabel.textContent = `${shapeEntry.name} (${categorySelect.selectedOptions[0]?.textContent || ''})`;
    playerStroke = [];
    strokeGrades = [];
    drawing = false;
    render();
  } catch (err) {
    console.error(err);
    result.textContent = `Could not load shape: ${err.message}`;
  }
}

async function loadSvgShape(entry) {
  const response = await fetch(entry.src);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${entry.src}`);
  }
  const svgText = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  const pathEls = Array.from(doc.querySelectorAll('path'));
  if (!svgEl || pathEls.length === 0) {
    throw new Error('SVG is missing <path> data.');
  }

  const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  tempSvg.setAttribute('width', '0');
  tempSvg.setAttribute('height', '0');
  tempSvg.style.position = 'absolute';
  tempSvg.style.left = '-9999px';
  tempSvg.style.top = '-9999px';
  document.body.appendChild(tempSvg);

  const sampledPoints = [];
  const combinedPath = new Path2D();
  let bbox = null;

  pathEls.forEach((original) => {
    const clone = original.cloneNode(true);
    tempSvg.appendChild(clone);
    combinedPath.addPath(new Path2D(original.getAttribute('d')));

    const segBBox = clone.getBBox();
    bbox = mergeBBox(bbox, segBBox);

    const length = clone.getTotalLength();
    const step = Math.max(2, length / 120);
    for (let dist = 0; dist <= length; dist += step) {
      const pt = clone.getPointAtLength(dist);
      sampledPoints.push({ x: pt.x, y: pt.y });
    }
  });

  tempSvg.remove();

  const transform = computeTransform(bbox);
  const transformedPoints = sampledPoints.map((pt) => transformPoint(pt, transform));

  return { entry, path: combinedPath, bbox, transform, points: transformedPoints };
}

function mergeBBox(current, next) {
  if (!next) return current;
  if (!current) return {
    x: next.x,
    y: next.y,
    width: next.width,
    height: next.height
  };
  const minX = Math.min(current.x, next.x);
  const minY = Math.min(current.y, next.y);
  const maxX = Math.max(current.x + current.width, next.x + next.width);
  const maxY = Math.max(current.y + current.height, next.y + next.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function computeTransform(bbox) {
  const padding = 40;
  const scale = Math.min(
    (canvas.width - padding * 2) / bbox.width,
    (canvas.height - padding * 2) / bbox.height
  );
  const offsetX = (canvas.width - bbox.width * scale) / 2 - bbox.x * scale;
  const offsetY = (canvas.height - bbox.height * scale) / 2 - bbox.y * scale;
  return { scale, offsetX, offsetY };
}

function transformPoint(pt, transform) {
  return {
    x: pt.x * transform.scale + transform.offsetX,
    y: pt.y * transform.scale + transform.offsetY
  };
}

function handlePointerDown(e) {
  if (!playing || !currentShape) return;
  drawing = true;
  lastPointerId = e.pointerId;
  playerStroke = [];
  strokeGrades = [];
  canvas.setPointerCapture(e.pointerId);
  addPoint(getCanvasPos(canvas, e));
}

function handlePointerMove(e) {
  if (!drawing || e.pointerId !== lastPointerId) return;
  addPoint(getCanvasPos(canvas, e));
}

function handlePointerUp(e) {
  if (!drawing || (lastPointerId !== null && e.pointerId !== lastPointerId)) return;
  drawing = false;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch (err) {
    // Ignore if the pointer was not captured (e.g., touch cancel).
  }
  if (playerStroke.length === 0) return;
  finalizeStroke();
}

function addPoint(pos) {
  const prev = playerStroke[playerStroke.length - 1];
  if (prev && pos.x === prev.x && pos.y === prev.y) return;
  playerStroke.push(pos);
  if (playerStroke.length > 1) {
    const grade = gradePoint(pos);
    strokeGrades.push(grade);
    updateScoreboard(grade);
  }
  render();
}

function gradePoint(point) {
  const distance = nearestDistanceToShape(point);
  const grade = distance <= HIT_TOLERANCE ? 'green' : 'red';
  playSound(audioCtx, grade);
  return grade;
}

function nearestDistanceToShape(point) {
  if (!currentShape?.points?.length) return Infinity;
  let min = Infinity;
  for (let i = 1; i < currentShape.points.length; i++) {
    const a = currentShape.points[i - 1];
    const b = currentShape.points[i];
    const dist = distancePointToSegment(point, a, b);
    if (dist < min) min = dist;
  }
  return min;
}

function finalizeStroke() {
  if (!strokeGrades.length) return;
  const greens = strokeGrades.filter((g) => g === 'green').length;
  const accuracy = greens / strokeGrades.length;
  const enoughSamples = strokeGrades.length >= MIN_SAMPLES_FOR_SCORING;
  const passed = accuracy >= 0.7 && enoughSamples;

  const ended = passed ? strikeCounter.registerSuccess() : strikeCounter.registerFailure();
  result.textContent = passed
    ? `Good job! Accuracy ${(accuracy * 100).toFixed(1)}%.`
    : `Keep working that contour. Accuracy ${(accuracy * 100).toFixed(1)}%.`;

  if (ended) {
    finishDrill();
  } else {
    setTimeout(loadNextShape, 700);
  }
}

function finishDrill() {
  playing = false;
  startBtn.style.display = 'block';
  startBtn.textContent = 'Restart';
  const score = getCurrentScore();
  result.textContent = `Session over. Final score ${score}. Tap restart to keep drilling.`;
}

function render() {
  clearCanvas(ctx);
  if (currentShape) {
    ctx.save();
    ctx.translate(currentShape.transform.offsetX, currentShape.transform.offsetY);
    ctx.scale(currentShape.transform.scale, currentShape.transform.scale);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#444';
    ctx.globalAlpha = 0.4;
    ctx.stroke(currentShape.path);
    ctx.restore();
  }

  if (playerStroke.length > 1) {
    for (let i = 1; i < playerStroke.length; i++) {
      ctx.beginPath();
      ctx.moveTo(playerStroke[i - 1].x, playerStroke[i - 1].y);
      ctx.lineTo(playerStroke[i].x, playerStroke[i].y);
      ctx.strokeStyle = strokeGrades[i - 1] === 'green' ? '#00aa55' : '#d33';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
}

init();
