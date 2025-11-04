import { clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { calculateScore } from './src/scoring.js';

const canvas = document.getElementById('colorCanvas');
const valueSlider = document.getElementById('valueSlider');
const hueSlider = document.getElementById('hueSlider');
const chromaSlider = document.getElementById('chromaSlider');
const confirmBtn = document.getElementById('confirmBtn');
const startBtn = document.getElementById('startBtn');
const result = document.getElementById('result');
const strikeElems = Array.from(document.querySelectorAll('#strikes .strike'));

const ctx = canvas.getContext('2d');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const MAX_STRIKES = 3;
const TARGET_SIZE = 220;
const PLAYER_SIZE = 160;
const PREVIEW_SIZE = 160;
const GREEN_THRESHOLD = 0.02;
const ORANGE_THRESHOLD = 0.06;
const ROUND_PAUSE = 1200;
const MUNSELL_VALUE_MAX = 10;
const MUNSELL_HUE_MAX = 100;
const MUNSELL_CHROMA_MAX = 16;
const VALUE_STEP = 0.5;
const VALUE_LEVELS = Array.from({ length: MUNSELL_VALUE_MAX / VALUE_STEP + 1 }, (_, i) => VALUE_STEP * i);
const TARGET_VALUE_LEVELS = VALUE_LEVELS.filter(
  (level) => level >= VALUE_STEP && level <= MUNSELL_VALUE_MAX - VALUE_STEP
);
const CHROMA_STEP = 0.5;
const CHROMA_LEVELS = Array.from({ length: MUNSELL_CHROMA_MAX / CHROMA_STEP + 1 }, (_, i) => CHROMA_STEP * i);
const TARGET_CHROMA_LEVELS = CHROMA_LEVELS.filter(
  (level) => level >= CHROMA_STEP && level <= MUNSELL_CHROMA_MAX - CHROMA_STEP
);
const HUE_STEP = 5;
const HUE_LEVELS = Array.from({ length: MUNSELL_HUE_MAX / HUE_STEP }, (_, i) => HUE_STEP * i);

let playing = false;
let roundActive = false;
let targetColor = null;
let strikes = 0;
let roundTimeout = null;
let startTime = 0;
let stats = { green: 0, yellow: 0, red: 0 };
let totals = { rounds: 0, close: 0, perfect: 0 };

function pickRandom(levels) {
  return levels[Math.floor(Math.random() * levels.length)];
}

function normalizeHue(step) {
  return ((step % MUNSELL_HUE_MAX) + MUNSELL_HUE_MAX) % MUNSELL_HUE_MAX;
}

function componentsToColor({ hue, chroma, value }) {
  const hueDeg = (normalizeHue(hue) / MUNSELL_HUE_MAX) * 360;
  const saturationPct = Math.max(0, Math.min(100, (chroma / MUNSELL_CHROMA_MAX) * 100));
  const lightnessPct = Math.max(0, Math.min(100, (value / MUNSELL_VALUE_MAX) * 100));
  return `hsl(${hueDeg}deg, ${saturationPct}%, ${lightnessPct}%)`;
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

function drawSquare(color, size) {
  const half = size / 2;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.fillStyle = color;
  ctx.fillRect(cx - half, cy - half, size, size);
}

function showTarget() {
  clearCanvas(ctx);
  drawSquare(componentsToColor(targetColor), TARGET_SIZE);
}

function showPreview(components) {
  clearCanvas(ctx);
  drawSquare(componentsToColor(components), PREVIEW_SIZE);
}

function showComparison(playerComponents) {
  clearCanvas(ctx);
  drawSquare(componentsToColor(targetColor), TARGET_SIZE);
  drawSquare(componentsToColor(playerComponents), PLAYER_SIZE);
}

function updateStrikesUI() {
  strikeElems.forEach((el, idx) => {
    el.checked = idx < strikes;
  });
}

function setControlsEnabled(enabled) {
  [valueSlider, hueSlider, chromaSlider].forEach((slider) => {
    slider.disabled = !enabled;
    slider.classList.toggle('value-slider-disabled', !enabled);
  });
  confirmBtn.disabled = !enabled;
}

function randomTargetColor() {
  const hue = pickRandom(HUE_LEVELS);
  const chroma = pickRandom(TARGET_CHROMA_LEVELS);
  const value = pickRandom(TARGET_VALUE_LEVELS);
  return { hue, chroma, value };
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

function setResultMessage(diffInfo) {
  const diffPct = (diffInfo.combined * 100).toFixed(1);
  const valuePct = (diffInfo.valueDiff * 100).toFixed(1);
  const chromaPct = (diffInfo.chromaDiff * 100).toFixed(1);
  const huePct = (diffInfo.hueDiffNormalized * 100).toFixed(1);
  return `Overall difference: ${diffPct}%. Value: Δ${diffInfo.valueSteps.toFixed(1)} V (${valuePct}%). Chroma: Δ${diffInfo.chromaSteps.toFixed(1)} C (${chromaPct}%). Hue: Δ${diffInfo.hueSteps.toFixed(1)} hue steps (${huePct}% of the circle).`;
}

function gradeAttempt(playerComponents) {
  const diffInfo = colorDifference(playerComponents, targetColor);
  const diff = diffInfo.combined;
  let grade = 'red';
  let message = `${setResultMessage(diffInfo)} Strike ${Math.min(strikes + 1, MAX_STRIKES)} of ${MAX_STRIKES}.`;

  if (diffInfo.valueSteps === 0 && diffInfo.chromaSteps === 0) {
    grade = 'green';
    message = `Value and chroma match exactly! ${setResultMessage(diffInfo)}`;
    strikes = 0;
    stats.green++;
    totals.perfect++;
  } else if (diff <= GREEN_THRESHOLD) {
    grade = 'green';
    message = `Perfect match! ${setResultMessage(diffInfo)}`;
    strikes = 0;
    stats.green++;
    totals.perfect++;
  } else if (diff <= ORANGE_THRESHOLD) {
    grade = 'orange';
    message = `Close! ${setResultMessage(diffInfo)} No strike—try the same color again.`;
    stats.yellow++;
    totals.close++;
  } else {
    stats.red++;
    strikes = Math.min(MAX_STRIKES, strikes + 1);
  }

  totals.rounds++;
  updateStrikesUI();
  playSound(audioCtx, grade === 'orange' ? 'yellow' : grade);
  updateScoreboard(grade === 'orange' ? 'orange' : grade);
  result.textContent = message;
  return grade;
}

function evaluatePlayer() {
  if (!playing || !roundActive) return;
  const playerComponents = getPlayerColor();
  roundActive = false;
  setControlsEnabled(false);
  showComparison(playerComponents);
  const grade = gradeAttempt(playerComponents);
  if (grade === 'red' && strikes >= MAX_STRIKES) {
    endGame();
    return;
  }
  roundTimeout = setTimeout(() => {
    startRound({
      reuseTarget: grade !== 'green',
      repeatReason: grade === 'orange' ? 'grace' : grade === 'red' ? 'strike' : null
    });
  }, ROUND_PAUSE);
}

function startRound({ reuseTarget = false, repeatReason = null } = {}) {
  if (!playing) return;
  if (roundTimeout) {
    clearTimeout(roundTimeout);
    roundTimeout = null;
  }

  if (!reuseTarget) {
    targetColor = randomTargetColor();
  }

  roundActive = true;
  setControlsEnabled(true);
  valueSlider.value = '5';
  hueSlider.value = '50';
  chromaSlider.value = '8';
  updateSliderBackgrounds(Number(hueSlider.value), Number(chromaSlider.value), Number(valueSlider.value));
  showTarget();

  if (reuseTarget) {
    if (repeatReason === 'grace') {
      result.textContent = 'Close! No strike—try the same color again.';
    } else {
      result.textContent = 'Strike! Try the same color again.';
    }
  } else {
    result.textContent = totals.rounds === 0
      ? 'Memorize the color, then adjust the Munsell sliders and confirm your match.'
      : 'Ready for the next color. Fine tune the Munsell sliders, then confirm.';
  }
}

function endGame() {
  playing = false;
  roundActive = false;
  setControlsEnabled(false);
  if (roundTimeout) {
    clearTimeout(roundTimeout);
    roundTimeout = null;
  }
  const elapsed = startTime ? Date.now() - startTime : 0;
  const { score: finalScore, accuracyPct, speed } = calculateScore(stats, elapsed);
  const summaryParts = [
    `Rounds: ${totals.rounds}`,
    `Perfect: ${totals.perfect}`,
    `Close: ${totals.close}`,
    `Strikes: ${strikes}`
  ];
  const prefix = strikes >= MAX_STRIKES ? 'Struck out! ' : '';
  if (window.leaderboard) {
    const key = canvas.dataset.scoreKey || 'memory_color';
    window.leaderboard.updateLeaderboard(key, finalScore);
    const high = window.leaderboard.getHighScore(key);
    result.textContent = `${prefix}${summaryParts.join(' | ')} | Score: ${finalScore} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s`;
  } else {
    result.textContent = `${prefix}${summaryParts.join(' | ')} | Score: ${finalScore} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s`;
  }
  startBtn.disabled = false;
  startBtn.style.display = '';
}

function handleSliderInput() {
  if (!playing || !roundActive) return;
  updateSliderBackgrounds(Number(hueSlider.value), Number(chromaSlider.value), Number(valueSlider.value));
  showPreview(getPlayerColor());
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  roundActive = false;
  strikes = 0;
  stats = { green: 0, yellow: 0, red: 0 };
  totals = { rounds: 0, close: 0, perfect: 0 };
  startTime = Date.now();
  updateStrikesUI();
  result.textContent = '';
  startBtn.disabled = true;
  startScoreboard(canvas);
  startRound();
}

overlayStartButton(canvas, startBtn);
setControlsEnabled(false);
updateStrikesUI();
updateSliderBackgrounds(Number(hueSlider.value), Number(chromaSlider.value), Number(valueSlider.value));

[valueSlider, hueSlider, chromaSlider].forEach((slider) => {
  slider.addEventListener('input', handleSliderInput);
});

confirmBtn.addEventListener('click', evaluatePlayer);
startBtn.addEventListener('click', startGame);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && playing) {
    endGame();
  }
});
