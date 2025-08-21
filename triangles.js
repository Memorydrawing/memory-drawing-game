import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, startBtn, result;
let playing = false;
let state = 'idle';
let vertices = [];
let remaining = [];
let guesses = [];
let guessesGreyed = false;
let attemptCount = 0;

const SHOW_COLOR_TIME = 2000;
const NEW_TRIANGLE_DELAY = 3000;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function generateTriangle() {
  const margin = 40;
  let pts, area;
  do {
    pts = Array.from({ length: 3 }, () => ({
      x: Math.random() * (canvas.width - 2 * margin) + margin,
      y: Math.random() * (canvas.height - 2 * margin) + margin
    }));
    area = Math.abs(
      pts[0].x * (pts[1].y - pts[2].y) +
      pts[1].x * (pts[2].y - pts[0].y) +
      pts[2].x * (pts[0].y - pts[1].y)
    ) / 2;
  } while (area < 100); // ensure not too small
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

function drawTriangle(show = true) {
  clearCanvas(ctx);
  if (show) {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    ctx.lineTo(vertices[1].x, vertices[1].y);
    ctx.lineTo(vertices[2].x, vertices[2].y);
    ctx.closePath();
    ctx.stroke();
    vertices.forEach(v => {
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
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

function finishCycle() {
  state = 'waiting';
  const success = guesses.every(g => g.grade === 'green');
  drawTriangle(true);
  setTimeout(() => {
    guessesGreyed = true;
    drawTriangle(true);
    attemptCount++;
    if (success) {
      result.textContent = `Completed in ${attemptCount} ${attemptCount === 1 ? 'try' : 'tries'}!`;
      setTimeout(() => {
        result.textContent = '';
        attemptCount = 0;
        startTriangle();
      }, NEW_TRIANGLE_DELAY);
    } else {
      state = 'preview';
    }
  }, SHOW_COLOR_TIME);
}

function pointerDown(e) {
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  if (state === 'preview') {
    guesses = [];
    guessesGreyed = false;
    remaining = [0, 1, 2];
    const { idx, dist } = nearestVertex(pos);
    const grade = gradeDistance(dist);
    guesses.push({ x: pos.x, y: pos.y, grade });
    playSound(audioCtx, grade);
    remaining.splice(remaining.indexOf(idx), 1);
    state = 'guess';
    clearCanvas(ctx);
    drawGuesses();
  } else if (state === 'guess') {
    const { idx, dist } = nearestVertex(pos);
    const grade = gradeDistance(dist);
    guesses.push({ x: pos.x, y: pos.y, grade });
    playSound(audioCtx, grade);
    remaining.splice(remaining.indexOf(idx), 1);
    clearCanvas(ctx);
    drawGuesses();
    if (remaining.length === 0) {
      finishCycle();
    }
  }
}

function startTriangle() {
  generateTriangle();
  guesses = [];
  guessesGreyed = false;
  remaining = [0, 1, 2];
  state = 'preview';
  drawTriangle(true);
}

function startGame() {
  audioCtx.resume();
  playing = true;
  startBtn.disabled = true;
  result.textContent = '';
  attemptCount = 0;
  startTriangle();
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');
  canvas.addEventListener('pointerdown', pointerDown);
  startBtn.addEventListener('click', startGame);
});
