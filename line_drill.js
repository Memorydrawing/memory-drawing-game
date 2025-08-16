import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, startBtn, result;
let playing = false;
let drawing = false;
let currentLine = null;
let path = [];
let score = 0;
let gameTimer = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const TOLERANCE = 5;

function drawLine() {
  const { x1, y1, x2, y2 } = currentLine;
  clearCanvas(ctx);
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function newLine() {
  const margin = 40;
  const length = Math.random() * 200 + 50;
  const angle = Math.random() * Math.PI * 2;
  const x1 = Math.random() * (canvas.width - 2 * margin) + margin;
  const y1 = Math.random() * (canvas.height - 2 * margin) + margin;
  const x2 = x1 + Math.cos(angle) * length;
  const y2 = y1 + Math.sin(angle) * length;
  currentLine = { x1, y1, x2, y2 };
  drawLine();
}

function startGame() {
  audioCtx.resume();
  score = 0;
  playing = true;
  result.textContent = '';
  startBtn.disabled = true;
  gameTimer = setTimeout(endGame, 60000);
  newLine();
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  clearCanvas(ctx);
  result.textContent = `Lines correct: ${score}`;
  startBtn.disabled = false;
}

function pointerDown(e) {
  if (!playing) return;
  drawing = true;
  path = [getCanvasPos(canvas, e)];
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
}

function pointerMove(e) {
  if (!drawing) return;
  const pos = getCanvasPos(canvas, e);
  path.push(pos);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = 'black';
  ctx.stroke();
}

function pointerUp(e) {
  if (!drawing) return;
  drawing = false;
  const pos = getCanvasPos(canvas, e);
  path.push(pos);
  if (!playing) {
    clearCanvas(ctx);
    return;
  }
  if (checkPath()) {
    score++;
    playSound(audioCtx, 'green');
    newLine();
  } else {
    playSound(audioCtx, 'red');
    drawLine();
  }
}

function checkPath() {
  const { x1, y1, x2, y2 } = currentLine;
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len = Math.hypot(vx, vy);
  const ux = vx / len;
  const uy = vy / len;
  let minS = Infinity;
  let maxS = -Infinity;
  for (const p of path) {
    const sx = p.x - x1;
    const sy = p.y - y1;
    const s = sx * ux + sy * uy;
    const dist = Math.abs(sx * uy - sy * ux);
    if (dist > TOLERANCE) return false;
    if (s < minS) minS = s;
    if (s > maxS) maxS = s;
  }
  return minS <= TOLERANCE && maxS >= len - TOLERANCE;
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  startBtn.addEventListener('click', startGame);
});
