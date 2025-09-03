import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';

let canvas, ctx, feedbackCanvas, feedbackCtx, startBtn, result, strikeElems;
let lookTime = 500;
let scoreKey = 'point_sequence';
let sequence = [];
let guesses = [];
let inputIndex = 0;
let playing = false;
let state = 'idle';
let strikes = 0;
let stats = { green: 0, yellow: 0, red: 0 };
let startTime = 0;

const BETWEEN_DELAY = 250;
const AFTER_GRADE_DELAY = 500;
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

function drawFeedbackPoint(context, pt, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
  context.fill();
}

async function showSequence() {
  for (const pt of sequence) {
    drawPoint(pt);
    await new Promise(r => setTimeout(r, lookTime));
    clearCanvas(ctx);
    await new Promise(r => setTimeout(r, BETWEEN_DELAY));
  }
}

async function flashGuesses(callback) {
  // show the original sequence points as reference
  clearCanvas(ctx);
  for (const pt of sequence) {
    drawFeedbackPoint(ctx, pt, 'black');
  }

  for (let i = 0; i < 3; i++) {
    clearCanvas(feedbackCtx);
    for (const g of guesses) {
      drawFeedbackPoint(feedbackCtx, g.pos, g.color);
    }
    await new Promise(r => setTimeout(r, lookTime));
    clearCanvas(feedbackCtx);
    await new Promise(r => setTimeout(r, BETWEEN_DELAY));
  }

  clearCanvas(ctx);
  await new Promise(r => setTimeout(r, AFTER_GRADE_DELAY));
  if (callback) callback();
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

async function startRound(addNewPoint = false) {
  clearCanvas(feedbackCtx);
  if (addNewPoint) {
    sequence.push(generatePoint());
  }
  state = 'show';
  await showSequence();
  state = 'input';
  inputIndex = 0;
  guesses = [];
}

function pointerDown(e) {
  if (!playing || state !== 'input') return;
  const pos = getCanvasPos(canvas, e);
  const target = sequence[inputIndex];
  const grade = gradePoint(pos, target);
  stats[grade]++;
  const color = grade === 'yellow' ? 'orange' : grade;
  guesses.push({ pos, color });
  updateScoreboard(color);
  playSound(audioCtx, grade);
  if (grade !== 'green') {
    drawFeedbackPoint(feedbackCtx, pos, color);
    state = 'feedback';
    flashGuesses(() => {
      if (grade === 'red') {
        strikes++;
        updateStrikes();
        if (strikes >= 3) {
          endGame();
          return;
        }
      }
      if (playing) startRound(false);
    });
    return;
  }
  drawFeedbackPoint(feedbackCtx, pos, 'green');
  inputIndex++;
  if (inputIndex === sequence.length) {
    state = 'feedback';
    flashGuesses(() => {
      strikes = 0;
      updateStrikes();
      if (playing) startRound(true);
    });
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
  startScoreboard(canvas);
  sequence = [];
  inputIndex = 0;
  startTime = Date.now();
  scoreKey = canvas.dataset.scoreKey || scoreKey;
  lookTime = parseInt(canvas.dataset.lookTime, 10) || lookTime;
  startRound(true);
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
