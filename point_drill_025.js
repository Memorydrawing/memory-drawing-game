import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { hideStartButton } from './src/start-button.js';

let canvas, ctx, feedbackCanvas, feedbackCtx, startBtn, result;

let playing = false;
let awaitingClick = false;
let target = null;
let endTime = 0;
let gameTimer = null;
let stats = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const RESULT_DISPLAY_TIME = 300;

function drawTarget() {
  const margin = 20;
  target = {
    x: Math.random() * (canvas.width - 2 * margin) + margin,
    y: Math.random() * (canvas.height - 2 * margin) + margin
  };
  clearCanvas(ctx);
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
  ctx.fill();
  awaitingClick = true;
  setTimeout(() => {
    clearCanvas(ctx);
  }, 250);
}


function showPoints(pos, prevTarget, grade) {
  feedbackCtx.save();
  const color = grade === 'yellow' ? 'orange' : grade;
  feedbackCtx.fillStyle = color;
  feedbackCtx.beginPath();
  feedbackCtx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  feedbackCtx.fill();
  feedbackCtx.fillStyle = 'blue';
  feedbackCtx.beginPath();
  feedbackCtx.arc(prevTarget.x, prevTarget.y, 5, 0, Math.PI * 2);
  feedbackCtx.fill();
  feedbackCtx.restore();
  setTimeout(() => {
    clearCanvas(feedbackCtx);
  }, RESULT_DISPLAY_TIME);
}

function pointerDown(e) {
  if (!awaitingClick) return;
  awaitingClick = false;
  const pos = getCanvasPos(canvas, e);
  const d = Math.hypot(pos.x - target.x, pos.y - target.y);
  stats.totalErr += d;
  stats.totalPoints++;
  let grade = 'red';
  if (d <= 5) {
    grade = 'green';
    stats.green++;
  } else if (d <= 10) {
    grade = 'yellow';
    stats.yellow++;
  } else {
    stats.red++;
  }
  const prevTarget = target;
  playSound(audioCtx, grade);
  if (Date.now() < endTime) {
    drawTarget();
  }
  showPoints(pos, prevTarget, grade);
  if (Date.now() >= endTime) {
    setTimeout(endGame, RESULT_DISPLAY_TIME);
  }
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  stats = { totalErr: 0, totalPoints: 0, green: 0, yellow: 0, red: 0 };
  playing = true;
  awaitingClick = false;
  result.textContent = '';
  startBtn.disabled = true;
  endTime = Date.now() + 60000;
  gameTimer = setTimeout(endGame, 60000);
  drawTarget();
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  clearCanvas(ctx);
  const avg = stats.totalPoints ? stats.totalErr / stats.totalPoints : 0;
  result.textContent = `Average error: ${avg.toFixed(1)} px | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  canvas.parentNode.insertBefore(wrapper, canvas);
  wrapper.appendChild(canvas);

  feedbackCanvas = document.createElement('canvas');
  feedbackCanvas.width = canvas.width;
  feedbackCanvas.height = canvas.height;
  feedbackCanvas.style.width = getComputedStyle(canvas).width;
  feedbackCanvas.style.height = getComputedStyle(canvas).height;
  feedbackCanvas.style.position = 'absolute';
  feedbackCanvas.style.left = '0';
  feedbackCanvas.style.top = '0';
  feedbackCanvas.style.pointerEvents = 'none';
  feedbackCanvas.style.background = 'transparent';
  feedbackCanvas.style.border = 'none';
  wrapper.appendChild(feedbackCanvas);

  ctx = canvas.getContext('2d');
  feedbackCtx = feedbackCanvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');
  wrapper.appendChild(startBtn);
  startBtn.style.position = 'absolute';
  startBtn.style.top = '50%';
  startBtn.style.left = '50%';
  startBtn.style.transform = 'translate(-50%, -50%)';

  canvas.addEventListener('pointerdown', pointerDown);
  startBtn.addEventListener('click', startGame);
});
