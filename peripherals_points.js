import { getCanvasPos, clearCanvas, playSound, preventDoubleTapZoom } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { createStrikeCounter } from './src/strike-counter.js';

let canvas, ctx, startBtn, result, timerDisplay;
let playing = false;
let target = null;
let targetRadius = 5;
let gradingTolerance = 5;
let scoreKey = 'peripherals_points';
let stats = null;
let startTime = 0;
let strikeCounter = null;

const MAX_STRIKES = 3;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function drawScene() {
  if (!ctx) return;
  clearCanvas(ctx);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(centerX, centerY, Math.max(6, targetRadius + 2), 0, Math.PI * 2);
  ctx.fill();

  if (target) {
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(target.x, target.y, targetRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function randomTarget() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const margin = targetRadius + 10;
  const maxRadius = Math.min(centerX, centerY, canvas.width - centerX, canvas.height - centerY) - margin;
  const minRadius = Math.min(maxRadius, Math.max(50, margin));

  if (maxRadius <= margin) {
    return {
      x: Math.random() * (canvas.width - 2 * margin) + margin,
      y: Math.random() * (canvas.height - 2 * margin) + margin
    };
  }

  const distance = minRadius === maxRadius ? maxRadius : Math.random() * (maxRadius - minRadius) + minRadius;
  const angle = Math.random() * Math.PI * 2;
  return {
    x: centerX + Math.cos(angle) * distance,
    y: centerY + Math.sin(angle) * distance
  };
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  stats = { green: 0, yellow: 0, red: 0 };
  startScoreboard(canvas);
  result.textContent = '';
  startBtn.disabled = true;
  strikeCounter = createStrikeCounter(timerDisplay, MAX_STRIKES);
  target = randomTarget();
  drawScene();
  startTime = Date.now();
}

function endGame(reason = 'complete') {
  if (!playing) return;
  playing = false;
  target = null;
  drawScene();
  const elapsed = Date.now() - startTime;
  const { score: finalScore, accuracyPct, speed } = calculateScore(
    { green: stats.green, yellow: 0, red: stats.red },
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

function pointerDown(e) {
  if (!playing || !target) return;
  const pos = getCanvasPos(canvas, e);
  const distance = Math.hypot(pos.x - target.x, pos.y - target.y);
  if (distance <= gradingTolerance) {
    stats.green++;
    updateScoreboard('green');
    setTimeout(() => playSound(audioCtx, 'green'), 0);
    if (strikeCounter) {
      strikeCounter.registerSuccess();
    }
    target = randomTarget();
    drawScene();
  } else {
    stats.red++;
    setTimeout(() => playSound(audioCtx, 'red'), 0);
    updateScoreboard('red');
    if (strikeCounter && strikeCounter.registerFailure()) {
      endGame('strikes');
      return;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  overlayStartButton(canvas, startBtn);
  // Remove the mobile double-tap delay so fast taps always register.
  preventDoubleTapZoom(canvas);
  result = document.getElementById('result');
  timerDisplay = document.getElementById('timer');
  targetRadius = Number(canvas.dataset.radius) || targetRadius;
  gradingTolerance = Number(canvas.dataset.tolerance) || targetRadius;
  scoreKey = canvas.dataset.scoreKey || scoreKey;

  drawScene();

  canvas.addEventListener('pointerdown', pointerDown);
  startBtn.addEventListener('click', startGame);
});
