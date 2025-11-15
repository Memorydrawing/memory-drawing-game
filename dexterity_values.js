import { clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { createStrikeCounter } from './src/strike-counter.js';

const canvas = document.getElementById('valueCanvas');
const slider = document.getElementById('valueSlider');
const confirmBtn = document.getElementById('confirmBtn');
const startBtn = document.getElementById('startBtn');
const strikeContainer = document.getElementById('strikes');
const result = document.getElementById('result');

const ctx = canvas.getContext('2d');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const MUNSELL_VALUE_MAX = 10;
const MUNSELL_VALUE_STEP = 0.5;
const TARGET_VALUE_LEVELS = Array.from(
  { length: (MUNSELL_VALUE_MAX / MUNSELL_VALUE_STEP) - 1 },
  (_, i) => MUNSELL_VALUE_STEP * (i + 1)
); // 0.5 through 9.5
const GREEN_THRESHOLD = 0.02; // 2% difference or less counts as a hit.
const TARGET_SQUARE_SIZE = 200;
const PLAYER_SQUARE_SIZE = 200;
const LABEL_OFFSET = 16;

let playing = false;
let targetValue = 5;
let stats = { green: 0, red: 0 };
let scoreKey = canvas.dataset.scoreKey || 'dexterity_values';
let startTime = 0;
let strikeCounter = null;

const MAX_STRIKES = 3;

function valueToColor(value) {
  const ratio = Math.min(1, Math.max(0, value / MUNSELL_VALUE_MAX));
  const shade = Math.round(ratio * 255);
  return `rgb(${shade}, ${shade}, ${shade})`;
}

function randomTargetValue() {
  return TARGET_VALUE_LEVELS[Math.floor(Math.random() * TARGET_VALUE_LEVELS.length)];
}

function drawState(playerValue = Number(slider.value)) {
  clearCanvas(ctx);
  const centerY = canvas.height / 2 - TARGET_SQUARE_SIZE / 2;
  const targetX = canvas.width * 0.25 - TARGET_SQUARE_SIZE / 2;
  const playerX = canvas.width * 0.75 - PLAYER_SQUARE_SIZE / 2;

  ctx.fillStyle = valueToColor(targetValue);
  ctx.fillRect(targetX, centerY, TARGET_SQUARE_SIZE, TARGET_SQUARE_SIZE);

  ctx.fillStyle = valueToColor(playerValue);
  ctx.fillRect(playerX, centerY, PLAYER_SQUARE_SIZE, PLAYER_SQUARE_SIZE);

  ctx.fillStyle = '#111';
  ctx.font = '16px "Inter", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Target', targetX + TARGET_SQUARE_SIZE / 2, centerY - LABEL_OFFSET / 2);
  ctx.fillText('Your Match', playerX + PLAYER_SQUARE_SIZE / 2, centerY - LABEL_OFFSET / 2);
}

function setControlsEnabled(enabled) {
  slider.disabled = !enabled;
  confirmBtn.disabled = !enabled;
  slider.classList.toggle('value-slider-disabled', !enabled);
}

function resetPlayerState() {
  slider.value = '5';
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  stats = { green: 0, red: 0 };
  startScoreboard(canvas);
  startBtn.disabled = true;
  result.textContent = '';
  targetValue = randomTargetValue();
  resetPlayerState();
  setControlsEnabled(true);
  drawState();
  startTime = Date.now();
  strikeCounter = createStrikeCounter(strikeContainer, MAX_STRIKES);
}

function endGame(reason = 'complete') {
  if (!playing) return;
  playing = false;
  setControlsEnabled(false);
  clearCanvas(ctx);
  const elapsed = Date.now() - startTime;
  const { score: finalScore, accuracyPct, speed } = calculateScore(
    { green: stats.green, red: stats.red },
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

function handleSliderInput() {
  if (!playing) return;
  drawState(Number(slider.value));
}

function handleConfirm() {
  if (!playing) return;
  const playerValue = Number(slider.value);
  const diffSteps = Math.abs(playerValue - targetValue);
  const diffNormalized = diffSteps / MUNSELL_VALUE_MAX;
  const diffPct = (diffNormalized * 100).toFixed(1);

  if (diffNormalized <= GREEN_THRESHOLD) {
    stats.green++;
    updateScoreboard('green');
    playSound(audioCtx, 'green');
    result.textContent = `Matched! Δ${diffSteps.toFixed(1)} V (${diffPct}%). New swatch ready.`;
    targetValue = randomTargetValue();
    resetPlayerState();
    drawState();
    if (strikeCounter) {
      strikeCounter.registerSuccess();
    }
  } else {
    stats.red++;
    updateScoreboard('red');
    playSound(audioCtx, 'red');
    const exhausted = strikeCounter ? strikeCounter.registerFailure() : false;
    const strikesRemaining = strikeCounter ? Math.max(0, MAX_STRIKES - strikeCounter.getStrikes()) : MAX_STRIKES;
    result.textContent = exhausted
      ? `Off by ${diffSteps.toFixed(1)} V (${diffPct}%).`
      : `Off by ${diffSteps.toFixed(1)} V (${diffPct}%). Strikes remaining: ${strikesRemaining}. Adjust and click again.`;
    if (exhausted) {
      endGame('strikes');
    }
  }
}

overlayStartButton(canvas, startBtn);
setControlsEnabled(false);
clearCanvas(ctx);

slider.addEventListener('input', handleSliderInput);
confirmBtn.addEventListener('click', handleConfirm);
startBtn.addEventListener('click', startGame);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && playing) {
    endGame();
  }
});
