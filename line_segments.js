import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, startBtn, result, strikeElems;
let playing = false;
let state = 'idle';
let vertices = [];
let remaining = [];
let guesses = [];
let guessesGreyed = false;
let attemptCount = 0;
let strikes = 0;
let shapesCompleted = 0;
let attemptHasRed = false;

const SHOW_COLOR_TIME = 500;
const NEW_SEGMENT_DELAY = 3000;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function generateSegment() {
  const margin = 40;
  const minLen = 60;
  let pts, length;
  do {
    pts = Array.from({ length: 2 }, () => ({
      x: Math.random() * (canvas.width - 2 * margin) + margin,
      y: Math.random() * (canvas.height - 2 * margin) + margin
    }));
    length = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  } while (length < minLen);
  vertices = pts;
}

function drawGuesses() {
  guesses.forEach(g => {
    const color = guessesGreyed ? 'grey' : g.grade === 'yellow' ? 'orange' : g.grade;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSegment(show = true) {
  clearCanvas(ctx);
  if (show) {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    ctx.lineTo(vertices[1].x, vertices[1].y);
    ctx.stroke();
  }
  drawGuesses();
}

function gradeDistance(d) {
  if (d <= 5) return 'green';
  if (d <= 10) return 'yellow';
  return 'red';
}

function nearestVertex(pos) {
  let minIdx = remaining[0];
  let minDist = Infinity;
  remaining.forEach(idx => {
    const v = vertices[idx];
    const d = Math.hypot(pos.x - v.x, pos.y - v.y);
    if (d < minDist) {
      minDist = d;
      minIdx = idx;
    }
  });
  return { idx: minIdx, dist: minDist };
}

function updateStrikes() {
  strikeElems.forEach((el, idx) => {
    el.checked = idx < strikes;
  });
}

function endGame() {
  playing = false;
  startBtn.disabled = false;
  result.textContent = `Struck out! You completed ${shapesCompleted} ${shapesCompleted === 1 ? 'segment' : 'segments'}.`;
}

function finishCycle() {
  state = 'waiting';
  const success = guesses.every(g => g.grade === 'green');
  attemptCount++;
  drawSegment(true);
  if (success) {
    shapesCompleted++;
    result.textContent = `Completed in ${attemptCount} ${attemptCount === 1 ? 'try' : 'tries'}!`;
    setTimeout(() => {
      guessesGreyed = true;
      drawSegment(true);
    }, SHOW_COLOR_TIME);
    setTimeout(() => {
      result.textContent = '';
      attemptCount = 0;
      strikes = 0;
      updateStrikes();
      startSegment();
    }, NEW_SEGMENT_DELAY);
  } else {
    if (attemptHasRed) {
      strikes++;
      updateStrikes();
      if (strikes >= 3) {
        endGame();
        return;
      }
    }
    setTimeout(() => {
      guessesGreyed = true;
      drawSegment(true);
      state = 'preview';
    }, SHOW_COLOR_TIME);
  }
}

function pointerDown(e) {
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  if (state === 'preview') {
    guesses = [];
    guessesGreyed = false;
    remaining = [0, 1];
    attemptHasRed = false;
    const { idx, dist } = nearestVertex(pos);
    const grade = gradeDistance(dist);
    guesses.push({ x: pos.x, y: pos.y, grade });
    if (grade === 'red') attemptHasRed = true;
    playSound(audioCtx, grade);
    remaining.splice(remaining.indexOf(idx), 1);
    state = 'guess';
    clearCanvas(ctx);
    drawGuesses();
  } else if (state === 'guess') {
    const { idx, dist } = nearestVertex(pos);
    const grade = gradeDistance(dist);
    guesses.push({ x: pos.x, y: pos.y, grade });
    if (grade === 'red') attemptHasRed = true;
    playSound(audioCtx, grade);
    remaining.splice(remaining.indexOf(idx), 1);
    clearCanvas(ctx);
    drawGuesses();
    if (remaining.length === 0) {
      finishCycle();
    }
  }
}

function startSegment() {
  generateSegment();
  guesses = [];
  guessesGreyed = false;
  remaining = [0, 1];
  state = 'preview';
  drawSegment(true);
}

function startGame() {
  audioCtx.resume();
  playing = true;
  startBtn.disabled = true;
  result.textContent = '';
  attemptCount = 0;
  strikes = 0;
  shapesCompleted = 0;
  updateStrikes();
  startSegment();
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');
  strikeElems = Array.from(document.querySelectorAll('#strikes .strike'));
  canvas.addEventListener('pointerdown', pointerDown);
  startBtn.addEventListener('click', startGame);
});
