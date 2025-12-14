import { getCanvasPos, clearCanvas, playSound, preventDoubleTapZoom } from './src/utils.js';
import { hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { createStrikeCounter, DEFAULT_TIMER_CONFIG } from './src/strike-counter.js';

let canvas, ctx, feedbackCanvas, feedbackCtx, startBtn, result, strikeContainer;

let scoreKey = 'point_drill_025';

let playing = false;
let awaitingClick = false;
let target = null;
let stats = null;
let startTime = 0;
let hideTargetTimeout = null;
let strikeCounter = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const RESULT_DISPLAY_TIME = 300;
const TIMER_SETTINGS = { ...DEFAULT_TIMER_CONFIG, initialSeconds: 45, maxSeconds: 90, successDelta: 3, failureDelta: 8 };

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
  if (hideTargetTimeout) {
    clearTimeout(hideTargetTimeout);
  }
  hideTargetTimeout = setTimeout(() => {
    clearCanvas(ctx);
    hideTargetTimeout = null;
  }, 250);
}


function showPoints(pos, prevTarget, grade) {
  feedbackCtx.save();
  feedbackCtx.fillStyle = grade;
  feedbackCtx.beginPath();
  feedbackCtx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  feedbackCtx.fill();
  feedbackCtx.fillStyle = '#ccc';
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
  } else {
    stats.red++;
  }
  const prevTarget = target;
  playSound(audioCtx, grade);
  updateScoreboard(grade);
  const exhausted = grade === 'red' && strikeCounter ? strikeCounter.registerFailure() : false;
  if (grade === 'green' && strikeCounter) {
    strikeCounter.registerSuccess();
  }
  if (!exhausted) {
    drawTarget();
  }
  showPoints(pos, prevTarget, grade);
  if (exhausted) {
    setTimeout(() => endGame('time'), RESULT_DISPLAY_TIME);
  }
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  startScoreboard(canvas);
  stats = { totalErr: 0, totalPoints: 0, green: 0, red: 0 };
  playing = true;
  awaitingClick = false;
  result.textContent = '';
  startBtn.disabled = true;
  startTime = Date.now();
  if (strikeCounter) {
    strikeCounter.stop();
  }
  strikeCounter = createStrikeCounter(strikeContainer, TIMER_SETTINGS, () => endGame('time'));
  drawTarget();
}

function endGame(reason = 'complete') {
  if (!playing) return;
  playing = false;
  if (strikeCounter) {
    strikeCounter.stop();
  }
  if (hideTargetTimeout) {
    clearTimeout(hideTargetTimeout);
    hideTargetTimeout = null;
  }
  clearCanvas(ctx);
  const avg = stats.totalPoints ? stats.totalErr / stats.totalPoints : 0;
  const elapsed = Date.now() - startTime;
  const { score, accuracyPct, speed } = calculateScore(stats, elapsed);
  const prefix = reason === 'time' ? "Time's up! " : '';
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, score);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = `${prefix}Score: ${score} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Avg error: ${avg.toFixed(1)} px | Green: ${stats.green} Red: ${stats.red}`;
  } else {
    result.textContent = `${prefix}Score: ${score} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Avg error: ${avg.toFixed(1)} px | Green: ${stats.green} Red: ${stats.red}`;
  }
  startBtn.disabled = false;
  startBtn.style.display = '';
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  // Allow rapid successive taps by disabling the browser's double-tap zoom
  // heuristics on touch devices.
  preventDoubleTapZoom(canvas);

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
  strikeContainer = document.getElementById('strikes');
  scoreKey = canvas.dataset.scoreKey || scoreKey;
  wrapper.appendChild(startBtn);
  startBtn.style.position = 'absolute';
  startBtn.style.top = '50%';
  startBtn.style.left = '50%';
  startBtn.style.transform = 'translate(-50%, -50%)';

  canvas.addEventListener('pointerdown', pointerDown);
  startBtn.addEventListener('click', startGame);
});
