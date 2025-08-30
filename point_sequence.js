import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';

let canvas, ctx, feedbackCanvas, feedbackCtx, startBtn, result, strikeElems;
let lookTime = 500;
let scoreKey = 'point_sequence';
let sequence = [];
let inputIndex = 0;
let playing = false;
let state = 'idle';
let strikes = 0;
let stats = { green: 0, yellow: 0, red: 0 };
let startTime = 0;

const RESULT_DISPLAY_TIME = 300;
const BETWEEN_DELAY = 250;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function generatePoint() {
  const margin = 20;
  return {
    x: Math.random() * (canvas.width - 2 * margin) + margin,
    y: Math.random() * (canvas.height - 2 * margin) + margin
  };
}

function drawPoint(pt) {
  clearCanvas(ctx);
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

async function showSequence() {
  for (const pt of sequence) {
    drawPoint(pt);
    await new Promise(r => setTimeout(r, lookTime));
    clearCanvas(ctx);
    await new Promise(r => setTimeout(r, BETWEEN_DELAY));
  }
}

function showFeedback(pos, actual, grade) {
  feedbackCtx.save();
  const color = grade === 'yellow' ? 'orange' : grade;
  feedbackCtx.fillStyle = color;
  feedbackCtx.beginPath();
  feedbackCtx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  feedbackCtx.fill();
  // Draw the actual point in black for better contrast
  feedbackCtx.fillStyle = 'black';
  feedbackCtx.beginPath();
  feedbackCtx.arc(actual.x, actual.y, 5, 0, Math.PI * 2);
  feedbackCtx.fill();
  feedbackCtx.restore();
  setTimeout(() => clearCanvas(feedbackCtx), RESULT_DISPLAY_TIME);
}

function gradePoint(pos, target) {
  const d = Math.hypot(pos.x - target.x, pos.y - target.y);
  if (d <= 5) return 'green';
  if (d <= 10) return 'yellow';
  return 'red';
}

function updateStrikes() {
  strikeElems.forEach((el, idx) => {
    el.checked = idx < strikes;
  });
}

function endGame() {
  playing = false;
  const elapsed = Date.now() - startTime;
  const { score, accuracyPct, speed } = calculateScore(stats, elapsed);
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, score);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = `Struck out! Score: ${score} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
  } else {
    result.textContent = `Struck out! Score: ${score} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
  }
}

async function startRound() {
  sequence.push(generatePoint());
  state = 'show';
  await showSequence();
  state = 'input';
  inputIndex = 0;
}

function restartSequence() {
  sequence = [];
  inputIndex = 0;
  setTimeout(() => {
    if (playing) startRound();
  }, RESULT_DISPLAY_TIME);
}

function pointerDown(e) {
  if (!playing || state !== 'input') return;
  const pos = getCanvasPos(canvas, e);
  const target = sequence[inputIndex];
  const grade = gradePoint(pos, target);
  stats[grade]++;
  playSound(audioCtx, grade);
  showFeedback(pos, target, grade);
  if (grade !== 'green') {
    if (grade === 'red') {
      strikes++;
      updateStrikes();
      if (strikes >= 3) {
        endGame();
        return;
      }
    }
    restartSequence();
    return;
  }
  inputIndex++;
  if (inputIndex === sequence.length) {
    strikes = 0;
    updateStrikes();
    // Start a fresh sequence after each successful attempt
    restartSequence();
  }
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  startBtn.disabled = true;
  result.textContent = '';
  strikes = 0;
  updateStrikes();
  stats = { green: 0, yellow: 0, red: 0 };
  sequence = [];
  inputIndex = 0;
  startTime = Date.now();
  scoreKey = canvas.dataset.scoreKey || scoreKey;
  lookTime = parseInt(canvas.dataset.lookTime, 10) || lookTime;
  startRound();
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  overlayStartButton(canvas, startBtn);
  result = document.getElementById('result');
  strikeElems = Array.from(document.querySelectorAll('#strikes .strike'));

  // overlay for feedback
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
  canvas.parentNode.appendChild(feedbackCanvas);
  feedbackCtx = feedbackCanvas.getContext('2d');

  canvas.addEventListener('pointerdown', pointerDown);
  startBtn.addEventListener('click', startGame);
});
