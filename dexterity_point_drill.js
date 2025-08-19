import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, startBtn, result;
let playing = false;
let targets = [];
let score = 0;
let gameTimer = null;
let targetRadius = 5;
let gradingTolerance = 5;
let scoreKey = 'dexterity_point_drill';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function randomTarget() {
  const margin = 20;
  return {
    x: Math.random() * (canvas.width - 2 * margin) + margin,
    y: Math.random() * (canvas.height - 2 * margin) + margin
  };
}

function drawTargets() {
  clearCanvas(ctx);
  ctx.fillStyle = 'black';
  targets.forEach(t => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, targetRadius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function startGame() {
  audioCtx.resume();
  playing = true;
  score = 0;
  result.textContent = '';
  startBtn.disabled = true;
  targets = [randomTarget(), randomTarget()];
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

function pointerDown(e) {
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const d = Math.hypot(pos.x - t.x, pos.y - t.y);
    if (d <= gradingTolerance) {
      score++;
      // Play the grading tone asynchronously so that additional
      // pointer events can be processed while the sound is playing.
      setTimeout(() => playSound(audioCtx, 'green'), 0);
      targets[i] = randomTarget();
      drawTargets();
      return;
    }
  }
  // Likewise, play the miss tone without blocking pointer input.
  setTimeout(() => playSound(audioCtx, 'red'), 0);
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  result = document.getElementById('result');
  targetRadius = Number(canvas.dataset.radius) || targetRadius;
  gradingTolerance = Number(canvas.dataset.tolerance) || targetRadius;
  scoreKey = canvas.dataset.scoreKey || scoreKey;

  canvas.addEventListener('pointerdown', pointerDown);
  startBtn.addEventListener('click', startGame);
});
