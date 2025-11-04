import { clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { startCountdown } from './src/countdown.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';

const canvas = document.getElementById('colorCanvas');
const valueSlider = document.getElementById('valueSlider');
const hueSlider = document.getElementById('hueSlider');
const chromaSlider = document.getElementById('chromaSlider');
const confirmBtn = document.getElementById('confirmBtn');
const startBtn = document.getElementById('startBtn');
const timerDisplay = document.getElementById('timer');
const result = document.getElementById('result');

const ctx = canvas.getContext('2d');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const GAME_DURATION_MS = 60000;
const MUNSELL_VALUE_MAX = 10;
const MUNSELL_HUE_MAX = 100;
const MUNSELL_CHROMA_MAX = 16;
const VALUE_STEP = 0.5;
const CHROMA_STEP = 0.5;
const HUE_STEP = 5;
const TARGET_VALUE_LEVELS = Array.from(
  { length: (MUNSELL_VALUE_MAX / VALUE_STEP) - 1 },
  (_, i) => VALUE_STEP * (i + 1)
); // skip absolute black/white
const TARGET_CHROMA_LEVELS = Array.from(
  { length: (MUNSELL_CHROMA_MAX / CHROMA_STEP) - 1 },
  (_, i) => CHROMA_STEP * (i + 1)
); // avoid neutral extremes
const TARGET_HUE_LEVELS = Array.from(
  { length: MUNSELL_HUE_MAX / HUE_STEP },
  (_, i) => HUE_STEP * i
);
const GREEN_THRESHOLD = 0.02; // Combined color distance for a hit.
const TARGET_SQUARE_SIZE = 200;
const PLAYER_SQUARE_SIZE = 200;
const LABEL_OFFSET = 16;

let playing = false;
let targetColor = null;
let stats = { green: 0, yellow: 0, red: 0 };
let scoreKey = canvas.dataset.scoreKey || 'dexterity_color';
let gameTimer = null;
let stopTimer = null;
let startTime = 0;

function normalizeHue(step) {
  return ((step % MUNSELL_HUE_MAX) + MUNSELL_HUE_MAX) % MUNSELL_HUE_MAX;
}

function componentsToColor({ hue, chroma, value }) {
  const hueDeg = (normalizeHue(hue) / MUNSELL_HUE_MAX) * 360;
  const saturationPct = Math.max(0, Math.min(100, (chroma / MUNSELL_CHROMA_MAX) * 100));
  const lightnessPct = Math.max(0, Math.min(100, (value / MUNSELL_VALUE_MAX) * 100));
  return `hsl(${hueDeg}deg, ${saturationPct}%, ${lightnessPct}%)`;
}

function pickRandom(levels) {
  return levels[Math.floor(Math.random() * levels.length)];
}

function randomTargetColor() {
  return {
    value: pickRandom(TARGET_VALUE_LEVELS),
    hue: pickRandom(TARGET_HUE_LEVELS),
    chroma: pickRandom(TARGET_CHROMA_LEVELS)
  };
}

function updateSliderBackgrounds(hue, chroma, value) {
  const lightnessPct = Math.max(0, Math.min(100, (value / MUNSELL_VALUE_MAX) * 100));
  const hueSegments = MUNSELL_HUE_MAX / HUE_STEP;
  const hueGradient = 'linear-gradient(to right, ' +
    Array.from({ length: hueSegments + 1 }, (_, i) => {
      const deg = (i / hueSegments) * 360;
      return `hsl(${deg}deg, 100%, ${lightnessPct}%) ${(i / hueSegments) * 100}%`;
    }).join(', ') + ')';
  hueSlider.style.background = hueGradient;

  const hueDeg = (normalizeHue(hue) / MUNSELL_HUE_MAX) * 360;
  const chromaGradient = `linear-gradient(to right, hsl(${hueDeg}deg, 0%, ${lightnessPct}%), hsl(${hueDeg}deg, 100%, ${lightnessPct}%))`;
  chromaSlider.style.background = chromaGradient;

  const saturationPct = Math.max(0, Math.min(100, (chroma / MUNSELL_CHROMA_MAX) * 100));
  const valueGradient = `linear-gradient(to right, hsl(${hueDeg}deg, ${saturationPct}%, 0%), hsl(${hueDeg}deg, ${saturationPct}%, 100%))`;
  valueSlider.style.background = valueGradient;
}

function drawState(player = getPlayerColor()) {
  clearCanvas(ctx);
  if (!targetColor) return;
  const centerY = canvas.height / 2 - TARGET_SQUARE_SIZE / 2;
  const targetX = canvas.width * 0.25 - TARGET_SQUARE_SIZE / 2;
  const playerX = canvas.width * 0.75 - PLAYER_SQUARE_SIZE / 2;

  ctx.fillStyle = componentsToColor(targetColor);
  ctx.fillRect(targetX, centerY, TARGET_SQUARE_SIZE, TARGET_SQUARE_SIZE);

  ctx.fillStyle = componentsToColor(player);
  ctx.fillRect(playerX, centerY, PLAYER_SQUARE_SIZE, PLAYER_SQUARE_SIZE);

  ctx.fillStyle = '#111';
  ctx.font = '16px "Inter", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Target', targetX + TARGET_SQUARE_SIZE / 2, centerY - LABEL_OFFSET / 2);
  ctx.fillText('Your Mix', playerX + PLAYER_SQUARE_SIZE / 2, centerY - LABEL_OFFSET / 2);
}

function setControlsEnabled(enabled) {
  [valueSlider, hueSlider, chromaSlider].forEach((slider) => {
    slider.disabled = !enabled;
    slider.classList.toggle('value-slider-disabled', !enabled);
  });
  confirmBtn.disabled = !enabled;
}

function resetPlayerControls() {
  valueSlider.value = '5';
  hueSlider.value = '50';
  chromaSlider.value = '8';
  updateSliderBackgrounds(Number(hueSlider.value), Number(chromaSlider.value), Number(valueSlider.value));
}

function getPlayerColor() {
  return {
    value: Number(valueSlider.value),
    hue: Number(hueSlider.value),
    chroma: Number(chromaSlider.value)
  };
}

function colorDifference(player, target) {
  const valueSteps = Math.abs(player.value - target.value);
  const chromaSteps = Math.abs(player.chroma - target.chroma);
  const valueDiff = valueSteps / MUNSELL_VALUE_MAX;
  const chromaDiff = chromaSteps / MUNSELL_CHROMA_MAX;
  const hueDiffRaw = Math.abs(player.hue - target.hue);
  const hueSteps = Math.min(hueDiffRaw, MUNSELL_HUE_MAX - hueDiffRaw);
  const hueDiffNormalized = hueSteps / (MUNSELL_HUE_MAX / 2);
  const combined = Math.sqrt(valueDiff ** 2 + chromaDiff ** 2 + hueDiffNormalized ** 2) / Math.sqrt(3);
  return { combined, valueDiff, chromaDiff, hueDiffNormalized, valueSteps, chromaSteps, hueSteps };
}

function formatDifferenceMessage(diffInfo) {
  const diffPct = (diffInfo.combined * 100).toFixed(1);
  const valuePct = (diffInfo.valueDiff * 100).toFixed(1);
  const chromaPct = (diffInfo.chromaDiff * 100).toFixed(1);
  const huePct = (diffInfo.hueDiffNormalized * 100).toFixed(1);
  return `Overall Δ${diffPct}%. Value: Δ${diffInfo.valueSteps.toFixed(1)} V (${valuePct}%). Chroma: Δ${diffInfo.chromaSteps.toFixed(1)} C (${chromaPct}%). Hue: Δ${diffInfo.hueSteps.toFixed(1)} steps (${huePct}% of the circle).`;
}

function prepareNextTarget() {
  targetColor = randomTargetColor();
  resetPlayerControls();
  drawState();
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  stats = { green: 0, yellow: 0, red: 0 };
  startScoreboard(canvas);
  startBtn.disabled = true;
  result.textContent = '';
  setControlsEnabled(true);
  prepareNextTarget();
  startTime = Date.now();
  stopTimer = startCountdown(timerDisplay, GAME_DURATION_MS);
  gameTimer = setTimeout(endGame, GAME_DURATION_MS);
}

function endGame() {
  if (!playing) return;
  playing = false;
  setControlsEnabled(false);
  clearTimeout(gameTimer);
  gameTimer = null;
  if (stopTimer) {
    stopTimer();
    stopTimer = null;
  }
  clearCanvas(ctx);
  const elapsed = Date.now() - startTime;
  const { score: finalScore, accuracyPct, speed } = calculateScore(
    { green: stats.green, yellow: 0, red: stats.red },
    elapsed
  );
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, finalScore);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = `Score: ${finalScore} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  } else {
    result.textContent = `Score: ${finalScore} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  }
  startBtn.disabled = false;
  startBtn.style.display = '';
}

function handleSliderInput() {
  if (!playing) return;
  updateSliderBackgrounds(Number(hueSlider.value), Number(chromaSlider.value), Number(valueSlider.value));
  drawState(getPlayerColor());
}

function handleConfirm() {
  if (!playing || !targetColor) return;
  const playerColor = getPlayerColor();
  const diffInfo = colorDifference(playerColor, targetColor);
  if (diffInfo.combined <= GREEN_THRESHOLD) {
    stats.green++;
    updateScoreboard('green');
    playSound(audioCtx, 'green');
    result.textContent = `Matched! ${formatDifferenceMessage(diffInfo)} Next color ready.`;
    prepareNextTarget();
  } else {
    stats.red++;
    updateScoreboard('red');
    playSound(audioCtx, 'red');
    result.textContent = `Off target. ${formatDifferenceMessage(diffInfo)} Adjust and click again.`;
    drawState(playerColor);
  }
}

overlayStartButton(canvas, startBtn);
setControlsEnabled(false);
resetPlayerControls();
clearCanvas(ctx);

[valueSlider, hueSlider, chromaSlider].forEach((slider) => {
  slider.addEventListener('input', handleSliderInput);
});
confirmBtn.addEventListener('click', handleConfirm);
startBtn.addEventListener('click', startGame);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && playing) {
    endGame();
  }
});
