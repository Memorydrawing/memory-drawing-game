import { getCanvasPos, clearCanvas, playSound, startCountdown } from './src/utils.js';

let canvas, ctx, startBtn, result, ppiInput, timerEl;

let playing = false;
let drawing = false;
let startPos = null;
let endTime = 0;
let stopTimer = null;
let stats = null;
let currentArrow = null;
let path = [];

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const DPR = window.devicePixelRatio || 1;
const tmp = document.createElement('div');
tmp.style.width = '1in';
tmp.style.position = 'absolute';
tmp.style.visibility = 'hidden';
document.body.appendChild(tmp);
let PPI = tmp.offsetWidth;   // CSS pixels per inch
document.body.removeChild(tmp);

// Show the approximate physical PPI to the user but store CSS pixels per inch internally.
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');
  ppiInput = document.getElementById('ppiInput');
  timerEl = document.createElement('div');
  timerEl.className = 'timer';
  timerEl.textContent = '60.00';
  canvas.parentNode.insertBefore(timerEl, canvas);

  ppiInput.value = (PPI * DPR).toFixed(1);
  ppiInput.addEventListener('input', () => {
    const val = parseFloat(ppiInput.value);
    if (!isNaN(val) && val > 0) {
      PPI = val / DPR; // convert physical PPI to CSS pixels per inch
      if (playing) drawArrow();
    }
  });

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  startBtn.addEventListener('click', startGame);
});

function drawArrow() {
  const len = 40;
  const head = 10;
  const margin = PPI + len + head;
  currentArrow = {
    x: Math.random() * (canvas.width - 2 * margin) + margin,
    y: Math.random() * (canvas.height - 2 * margin) + margin,
    angle: Math.random() * Math.PI * 2
  };
  const endX = currentArrow.x + Math.cos(currentArrow.angle) * len;
  const endY = currentArrow.y + Math.sin(currentArrow.angle) * len;
  clearCanvas(ctx);
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(currentArrow.x, currentArrow.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX + Math.cos(currentArrow.angle + Math.PI * 5 / 6) * head,
             endY + Math.sin(currentArrow.angle + Math.PI * 5 / 6) * head);
  ctx.lineTo(endX + Math.cos(currentArrow.angle - Math.PI * 5 / 6) * head,
             endY + Math.sin(currentArrow.angle - Math.PI * 5 / 6) * head);
  ctx.closePath();
  ctx.fill();
}


function flashCorrectLine(callback) {
  const correctX = currentArrow.x + Math.cos(currentArrow.angle) * PPI;
  const correctY = currentArrow.y + Math.sin(currentArrow.angle) * PPI;
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(currentArrow.x, currentArrow.y);
  ctx.lineTo(correctX, correctY);
  ctx.stroke();
  ctx.restore();
  setTimeout(() => {
    clearCanvas(ctx);
    callback();
  }, 300);
}

function pointerDown(e) {
  if (!playing) return;
  drawing = true;
  startPos = getCanvasPos(canvas, e);
  path = [startPos];
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.moveTo(startPos.x, startPos.y);
}

function pointerMove(e) {
  if (!drawing) return;
  const pos = getCanvasPos(canvas, e);
  path.push(pos);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function pointerUp(e) {
  if (!drawing) return;
  drawing = false;
  const pos = getCanvasPos(canvas, e);
  path.push(pos);
  const d = Math.hypot(pos.x - startPos.x, pos.y - startPos.y);
  const inches = d / PPI;
  const err = Math.abs(inches - 1);
  stats.totalErr += err;
  stats.totalPoints++;
  let grade = 'red';
  if (err <= 1 / 32) {
    grade = 'green';
    stats.green++;
  } else if (err <= 1 / 16) {
    grade = 'yellow';
    stats.yellow++;
  } else {
    stats.red++;
  }

  // Remove the arrow and the initially drawn line before displaying the grade
  clearCanvas(ctx);

  ctx.save();
  ctx.strokeStyle = grade === 'yellow' ? 'orange' : grade;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
  ctx.restore();
  playSound(audioCtx, grade);
  flashCorrectLine(() => {
    if (Date.now() < endTime) {
      drawArrow();
    } else {
      endGame();
    }
  });
}

function startGame() {
  audioCtx.resume();
  stats = { totalErr: 0, totalPoints: 0, green: 0, yellow: 0, red: 0 };
  playing = true;
  result.textContent = '';
  startBtn.disabled = true;
  endTime = Date.now() + 60000;
  stopTimer = startCountdown(60000, timerEl, endGame);
  drawArrow();
}

function endGame() {
  if (!playing) return;
  playing = false;
  if (stopTimer) {
    stopTimer();
    stopTimer = null;
  }
  clearCanvas(ctx);
  const avg = stats.totalPoints ? stats.totalErr / stats.totalPoints : 0;
  result.textContent = `Average error: ${avg.toFixed(3)} in | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
  startBtn.disabled = false;
}

