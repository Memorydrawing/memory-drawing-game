import { clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';
import { calculateScore } from './src/scoring.js';

const canvas = document.getElementById('valueCanvas');
const slider = document.getElementById('valueSlider');
const startBtn = document.getElementById('startBtn');
const result = document.getElementById('result');
const strikeContainer = document.getElementById('strikes');
let strikeElems = strikeContainer ? Array.from(strikeContainer.querySelectorAll('.strike-box')) : [];

const ctx = canvas.getContext('2d');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const MAX_STRIKES = 3;
const TARGET_SIZE = 220;
const PLAYER_SIZE = 160;
const PREVIEW_SIZE = 160;
const MUNSELL_VALUE_MAX = 10;
const MUNSELL_VALUE_STEP = 0.5;
const TARGET_VALUE_LEVELS = Array.from({ length: (MUNSELL_VALUE_MAX / MUNSELL_VALUE_STEP) - 1 }, (_, i) =>
  MUNSELL_VALUE_STEP * (i + 1)
); // 1 through 9
const GREEN_THRESHOLD = 0.02; // 2% difference or less counts as perfect.
const ORANGE_THRESHOLD = 0.06; // Up to 6% difference earns a close (orange) grade.
const ROUND_PAUSE = 1200;

let playing = false;
let roundActive = false;
let isAdjusting = false;
let targetValue = 0;
let strikes = 0;
let roundTimeout = null;
let startTime = 0;
let stats = { green: 0, yellow: 0, red: 0 };
let totals = { rounds: 0, close: 0, perfect: 0 };

function valueToColor(value) {
  const ratio = Math.min(1, Math.max(0, value / MUNSELL_VALUE_MAX));
  const shade = Math.round(ratio * 255);
  return `rgb(${shade}, ${shade}, ${shade})`;
}

function drawSquare(value, size) {
  const half = size / 2;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.fillStyle = valueToColor(value);
  ctx.fillRect(cx - half, cy - half, size, size);
}

function showTarget() {
  clearCanvas(ctx);
  drawSquare(targetValue, TARGET_SIZE);
}

function showPreview(value) {
  clearCanvas(ctx);
  drawSquare(value, PREVIEW_SIZE);
}

function showComparison(playerValue) {
  clearCanvas(ctx);
  drawSquare(targetValue, TARGET_SIZE);
  drawSquare(playerValue, PLAYER_SIZE);
}

function updateStrikesUI() {
  if (!strikeContainer) return;
  if (!strikeElems.length) {
    strikeElems = Array.from(strikeContainer.querySelectorAll('.strike-box'));
  }
  strikeElems.forEach((el, idx) => {
    el.classList.toggle('filled', idx < strikes);
  });
  strikeContainer.setAttribute('aria-label', `Strikes: ${Math.min(strikes, MAX_STRIKES)} of ${MAX_STRIKES}`);
}

function setSliderEnabled(enabled) {
  slider.disabled = !enabled;
  slider.classList.toggle('value-slider-disabled', !enabled);
}

function startRound({ reuseTarget = false, repeatReason = null } = {}) {
  if (!playing) return;
  if (roundTimeout) {
    clearTimeout(roundTimeout);
    roundTimeout = null;
  }
  if (!reuseTarget) {
    targetValue = TARGET_VALUE_LEVELS[Math.floor(Math.random() * TARGET_VALUE_LEVELS.length)];
  }
  roundActive = true;
  isAdjusting = false;
  setSliderEnabled(true);
  slider.value = '5';
  showTarget();
  if (reuseTarget) {
    if (repeatReason === 'grace') {
      result.textContent = 'Close! Try the same value again.';
    } else {
      result.textContent = 'Strike! Try the same value again.';
    }
  } else {
    result.textContent = totals.rounds === 0
      ? 'Adjust the slider to match the square\'s Munsell value.'
      : 'Ready for the next swatch. Match the Munsell value again!';
  }
}

function endGame() {
  playing = false;
  roundActive = false;
  setSliderEnabled(false);
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
    window.leaderboard.updateLeaderboard(canvas.dataset.scoreKey || 'memory_values', finalScore);
    const high = window.leaderboard.getHighScore(canvas.dataset.scoreKey || 'memory_values');
    result.textContent = `${prefix}${summaryParts.join(' | ')} | Score: ${finalScore} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s`;
  } else {
    result.textContent = `${prefix}${summaryParts.join(' | ')} | Score: ${finalScore} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s`;
  }
  startBtn.disabled = false;
  startBtn.style.display = '';
}

function gradeAttempt(playerValue) {
  const diffValue = Math.abs(playerValue - targetValue);
  const diffNormalized = diffValue / MUNSELL_VALUE_MAX;
  const diffPct = diffNormalized * 100;
  let grade = 'red';
  let message = `Off by ${diffValue.toFixed(1)} V (${diffPct.toFixed(1)}% of the value scale) — Strike ${Math.min(strikes + 1, MAX_STRIKES)} of ${MAX_STRIKES}.`;

  if (diffNormalized <= GREEN_THRESHOLD) {
    grade = 'green';
    message = `Perfect match! Δ${diffValue.toFixed(1)} V (${diffPct.toFixed(1)}%).`;
    strikes = 0;
    stats.green++;
    totals.perfect++;
  } else if (diffNormalized <= ORANGE_THRESHOLD) {
    grade = 'orange';
    message = `Close! Δ${diffValue.toFixed(1)} V (${diffPct.toFixed(1)}%). No strike—try the same value again.`;
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

function evaluate(playerValue) {
  if (!playing || !roundActive) return;
  roundActive = false;
  isAdjusting = false;
  setSliderEnabled(false);
  showComparison(playerValue);
  const grade = gradeAttempt(playerValue);
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

function handleSliderPointerDown() {
  if (!playing || !roundActive) return;
  isAdjusting = true;
  showPreview(Number(slider.value));
  document.addEventListener('pointerup', handleSliderPointerUp);
}

function handleSliderPointerUp() {
  document.removeEventListener('pointerup', handleSliderPointerUp);
  if (!playing || !isAdjusting) return;
  const value = Number(slider.value);
  evaluate(value);
}

function handleSliderInput() {
  if (!playing || !roundActive) return;
  if (!isAdjusting) {
    isAdjusting = true;
  }
  showPreview(Number(slider.value));
}

function handleSliderChange() {
  if (!playing || !roundActive) return;
  if (isAdjusting) return; // pointerup already handled evaluation.
  const value = Number(slider.value);
  evaluate(value);
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
setSliderEnabled(false);
updateStrikesUI();

slider.addEventListener('pointerdown', handleSliderPointerDown);
slider.addEventListener('input', handleSliderInput);
slider.addEventListener('change', handleSliderChange);
startBtn.addEventListener('click', startGame);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && playing) {
    endGame();
  }
});
