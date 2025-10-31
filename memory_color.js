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

let playing = false;
let roundActive = false;
let targetColor = null;
let strikes = 0;
let roundTimeout = null;
let startTime = 0;
let stats = { green: 0, yellow: 0, red: 0 };
let totals = { rounds: 0, close: 0, perfect: 0 };

function normalizeHue(deg) {
  return ((deg % 360) + 360) % 360;
}

function componentsToColor({ hue, chroma, value }) {
  const hueDeg = Math.round(normalizeHue(hue));
  const saturationPct = Math.max(0, Math.min(100, chroma));
  const lightnessPct = Math.max(0, Math.min(100, value));
  return `hsl(${hueDeg}deg, ${saturationPct}%, ${lightnessPct}%)`;
}

function updateSliderBackgrounds(hue, chroma, value) {
  const hueGradient = 'linear-gradient(to right, ' +
    Array.from({ length: 7 }, (_, i) => {
      const deg = (i / 6) * 360;
      return `hsl(${deg}deg, 100%, ${value}%) ${(i / 6) * 100}%`;
    }).join(', ') + ')';
  hueSlider.style.background = hueGradient;

  const chromaGradient = `linear-gradient(to right, hsl(${hue}deg, 0%, ${value}%), hsl(${hue}deg, 100%, ${value}%))`;
  chromaSlider.style.background = chromaGradient;

  const valueGradient = `linear-gradient(to right, hsl(${hue}deg, ${chroma}%, 0%), hsl(${hue}deg, ${chroma}%, 100%))`;
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
  const hue = Math.random() * 360;
  const chroma = 20 + Math.random() * 80; // keep within usable range
  const value = 25 + Math.random() * 50; // avoid extremes for better visibility
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
  const valueDiff = Math.abs(player.value - target.value) / 100;
  const chromaDiff = Math.abs(player.chroma - target.chroma) / 100;
  const hueDiffDegrees = Math.abs(player.hue - target.hue);
  const hueDiff = Math.min(hueDiffDegrees, 360 - hueDiffDegrees) / 180;
  const combined = Math.sqrt(valueDiff ** 2 + chromaDiff ** 2 + hueDiff ** 2) / Math.sqrt(3);
  return { combined, valueDiff, chromaDiff, hueDiff };
}

function setResultMessage(diffInfo) {
  const diffPct = (diffInfo.combined * 100).toFixed(1);
  const valuePct = (diffInfo.valueDiff * 100).toFixed(1);
  const chromaPct = (diffInfo.chromaDiff * 100).toFixed(1);
  const hueDeg = (diffInfo.hueDiff * 180).toFixed(1);
  return `Overall difference: ${diffPct}%. Value: ${valuePct}%. Chroma: ${chromaPct}%. Hue: ${hueDeg}°.`;
}

function gradeAttempt(playerComponents) {
  const diffInfo = colorDifference(playerComponents, targetColor);
  const diff = diffInfo.combined;
  let grade = 'red';
  let message = `${setResultMessage(diffInfo)} Strike ${Math.min(strikes + 1, MAX_STRIKES)} of ${MAX_STRIKES}.`;

  if (diff <= GREEN_THRESHOLD) {
    grade = 'green';
    message = `Perfect match! ${setResultMessage(diffInfo)}`;
    strikes = 0;
    stats.green++;
    totals.perfect++;
  } else if (diff <= ORANGE_THRESHOLD) {
    grade = 'orange';
    message = `Close! ${setResultMessage(diffInfo)} Try the same color again.`;
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
  valueSlider.value = '50';
  hueSlider.value = '180';
  chromaSlider.value = '50';
  updateSliderBackgrounds(Number(hueSlider.value), Number(chromaSlider.value), Number(valueSlider.value));
  showTarget();

  if (reuseTarget) {
    if (repeatReason === 'grace') {
      result.textContent = 'Close! Try the same color again.';
    } else {
      result.textContent = 'Strike! Try the same color again.';
    }
  } else {
    result.textContent = totals.rounds === 0
      ? 'Memorize the color, then adjust the sliders and confirm your match.'
      : 'Ready for the next color. Fine tune the sliders, then confirm.';
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
