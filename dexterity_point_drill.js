import { getCanvasPos, clearCanvas, playSound, preventDoubleTapZoom } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { createStrikeCounter } from './src/strike-counter.js';

let canvas, ctx, startBtn, result, timerDisplay;
let playing = false;
let targets = [];
let targetRadius = 5;
let gradingTolerance = 5;
let scoreKey = 'dexterity_point_drill';
let stats = null;
let startTime = 0;
let strikeCounter = null;

const MAX_STRIKES = 3;

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
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  stats = { green: 0, yellow: 0, red: 0 };
  startScoreboard(canvas);
  result.textContent = '';
  startBtn.disabled = true;
  strikeCounter = createStrikeCounter(timerDisplay, MAX_STRIKES);
  targets = [randomTarget(), randomTarget()];
  drawTargets();
  startTime = Date.now();
}

function endGame(reason = 'complete') {
  if (!playing) return;
  playing = false;
  clearCanvas(ctx);
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
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  let hit = false;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const d = Math.hypot(pos.x - t.x, pos.y - t.y);
    if (d <= gradingTolerance) {
      stats.green++;
      updateScoreboard('green');
      hit = true;
      setTimeout(() => playSound(audioCtx, 'green'), 0);
      if (strikeCounter) {
        strikeCounter.registerSuccess();
      }
      targets[i] = randomTarget();
      drawTargets();
      break;
    }
  }
  if (!hit) {
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
  // Allow rapid successive taps by disabling the browser's double-tap zoom
  // detection delay on touch devices.
  preventDoubleTapZoom(canvas);
  result = document.getElementById('result');
  timerDisplay = document.getElementById('timer');
  targetRadius = Number(canvas.dataset.radius) || targetRadius;
  gradingTolerance = Number(canvas.dataset.tolerance) || targetRadius;
  scoreKey = canvas.dataset.scoreKey || scoreKey;

  canvas.addEventListener('pointerdown', pointerDown);
  startBtn.addEventListener('click', startGame);
});
