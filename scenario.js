import { clearCanvas } from './src/utils.js';
import { generateShape } from './geometry.js';
import {
  canvas,
  ctx,
  result,
  originalShape,
  playerShape,
  drawingEnabled,
  lastShape,
  viewTimer,
  drawGrid,
  drawShape,
  drawGivenPoints,
  revealShape,
  setPlayerShape,
  setOriginalShape,
  setDrawingEnabled,
  setLastShape,
  setViewTimer
} from './app.js';
import { getScenario } from './scenarios.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { calculateScore } from './src/scoring.js';

let scenarioTimer = null;
let scoreSummary = { totalDist: 0, totalPoints: 0, green: 0, yellow: 0, red: 0 };
let scenarioConfig = null;
let scenarioName = '';
let totalDuration = 0;
let drawStartTime = 0;

function toggleThreshold() {
  const wrapper = document.getElementById('thresholdWrapper');
  const val = document.getElementById('afterSelect').value;
  if (wrapper) wrapper.style.display = val === 'repeat' ? 'inline-flex' : 'none';
}

function computeAverageError() {
  if (!playerShape.length) return 0;
  let total = 0;
  playerShape.forEach(p => {
    const closest = originalShape.reduce((min, q) => {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      return d < min ? d : min;
    }, Infinity);
    total += closest;
  });
  return total / playerShape.length;
}

function onShapeRevealed() {
  if (!scenarioConfig) return;
  const avg = computeAverageError();
  const counts = playerShape.reduce((acc, p) => {
    const c = p.color;
    if (!c) return acc;
    if (c === 'green') acc.green++;
    else if (c === 'orange' || c === 'yellow') acc.yellow++;
    else acc.red++;
    return acc;
  }, { green: 0, yellow: 0, red: 0 });
  scoreSummary.totalDist += avg * playerShape.length;
  scoreSummary.totalPoints += playerShape.length;
  scoreSummary.green += counts.green;
  scoreSummary.yellow += counts.yellow;
  scoreSummary.red += counts.red;
  const elapsed = Date.now() - drawStartTime;
  totalDuration += elapsed;
  const overall = scoreSummary.totalPoints ? scoreSummary.totalDist / scoreSummary.totalPoints : 0;
  const { score: finalScore, accuracyPct, speed } = calculateScore(
    { green: scoreSummary.green, yellow: scoreSummary.yellow, red: scoreSummary.red },
    totalDuration
  );
  const avgEl = document.getElementById('avgError');
  const gEl = document.getElementById('greenCount');
  const yEl = document.getElementById('yellowCount');
  const rEl = document.getElementById('redCount');
  const sEl = document.getElementById('scoreValue');
  if (avgEl) avgEl.textContent = overall.toFixed(1);
  if (gEl) gEl.textContent = scoreSummary.green;
  if (yEl) yEl.textContent = scoreSummary.yellow;
  if (rEl) rEl.textContent = scoreSummary.red;
  if (sEl) sEl.textContent = finalScore;
  const leaderboardKey = `scenario_${scenarioName}`;
  let high = 0;
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(leaderboardKey, finalScore);
    high = window.leaderboard.getHighScore(leaderboardKey);
    const hEl = document.getElementById('highScoreValue');
    if (hEl) hEl.textContent = high.toString();
  }
  result.textContent = `Current avg: ${avg.toFixed(1)} px | Overall avg: ${overall.toFixed(1)} px | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s`;

  if (scenarioConfig.afterAction === 'end') {
    if (window.leaderboard) {
      window.leaderboard.showLeaderboard(
        leaderboardKey,
        finalScore
      );
    }
    return;
  }
  if (scenarioConfig.afterAction === 'next') {
    setTimeout(() => startScenario(false), 1000);
  } else if (scenarioConfig.afterAction === 'repeat') {
    if (avg <= scenarioConfig.thresholdPoints) {
      setTimeout(() => startScenario(false), 1000);
    } else {
      setTimeout(() => startScenario(true), 1000);
    }
  }
}

document.addEventListener('shapeRevealed', onShapeRevealed);

function getSavedScenarios() {
  return JSON.parse(localStorage.getItem('scenarios') || '{}');
}

function populateScenarioSelect(id) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = '';
  const data = getSavedScenarios();
  Object.keys(data).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function loadSavedScenarios() {
  populateScenarioSelect('savedScenarios');
  populateScenarioSelect('editScenarioSelect');
  const list = document.getElementById('savedScenarios');
  if (list && list.options.length > 0) {
    list.selectedIndex = 0;
    applyScenario();
  }
}

function saveScenario() {
  const name = document.getElementById('scenarioName').value.trim();
  if (!name) return;
  const scenarios = JSON.parse(localStorage.getItem('scenarios') || '{}');
  scenarios[name] = {
    time: parseFloat(document.getElementById('timeInput').value),
    buffer: parseFloat(document.getElementById('bufferInput').value),
    challenge: parseFloat(document.getElementById('challengeInput').value),
    sides: document.getElementById('sidesSelect').value,
    size: document.getElementById('sizeSelect').value,
    grid: document.getElementById('gridSelect').value,
    drawMode: document.getElementById('drawModeToggle').checked,
    giveHighest: document.getElementById('giveHighest').checked,
    giveLowest: document.getElementById('giveLowest').checked,
    giveLeftmost: document.getElementById('giveLeftmost').checked,
    giveRightmost: document.getElementById('giveRightmost').checked,
    afterAction: document.getElementById('afterSelect').value,
    thresholdPoints: parseInt(document.getElementById('thresholdPoints').value) || 1,
    thresholdGrade: document.getElementById('thresholdGrade').value
  };
  localStorage.setItem('scenarios', JSON.stringify(scenarios));
  loadSavedScenarios();
  const list = document.getElementById('savedScenarios');
  if (list) {
    list.value = name;
    applyScenario();
  }
}

function applyScenario() {
  const name = document.getElementById('savedScenarios').value;
  const scenarios = JSON.parse(localStorage.getItem('scenarios') || '{}');
  const scn = scenarios[name];
  if (!scn) return;
  document.getElementById('timeInput').value = scn.time;
  document.getElementById('bufferInput').value = scn.buffer;
  document.getElementById('challengeInput').value = scn.challenge;
  document.getElementById('sidesSelect').value = scn.sides;
  document.getElementById('sizeSelect').value = scn.size;
  document.getElementById('gridSelect').value = scn.grid;
  document.getElementById('drawModeToggle').checked = scn.drawMode;
  document.getElementById('drawModeLabel').textContent = scn.drawMode ? 'Point-to-Point' : 'Freehand';
  document.getElementById('giveHighest').checked = scn.giveHighest;
  document.getElementById('giveLowest').checked = scn.giveLowest;
  document.getElementById('giveLeftmost').checked = scn.giveLeftmost;
  document.getElementById('giveRightmost').checked = scn.giveRightmost;
  document.getElementById('afterSelect').value = scn.afterAction || 'next';
  document.getElementById('thresholdPoints').value = scn.thresholdPoints || 1;
  document.getElementById('thresholdGrade').value = scn.thresholdGrade || 'green';
  toggleThreshold();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('visible'));
  const el = document.getElementById(id);
  if (el) el.classList.add('visible');
}

document.addEventListener('DOMContentLoaded', () => {
  populateScenarioSelect('savedScenarios');
  populateScenarioSelect('editScenarioSelect');
  toggleThreshold();

  const newBtn = document.getElementById('newScenarioBtn');
  const editBtn = document.getElementById('editScenarioBtn');
  const loadBtn = document.getElementById('loadScenarioBtn');
  const backBtn = document.getElementById('selectBackBtn');

  if (newBtn) newBtn.addEventListener('click', () => showScreen('scenarioScreen'));
  if (editBtn) editBtn.addEventListener('click', () => showScreen('selectScreen'));
  if (backBtn) backBtn.addEventListener('click', () => showScreen('modeScreen'));
  if (loadBtn) loadBtn.addEventListener('click', () => {
    const sel = document.getElementById('editScenarioSelect');
    if (!sel || !sel.value) return;
    const list = document.getElementById('savedScenarios');
    if (list) list.value = sel.value;
    applyScenario();
    showScreen('scenarioScreen');
  });

  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    overlayStartButton(canvas, startBtn);
    const params = new URLSearchParams(window.location.search);
    scenarioName = params.get('name') || 'default';
    const titleEl = document.getElementById('scenarioTitle');
    if (titleEl) titleEl.textContent = scenarioName || 'Scenario';
    const scn = getScenario(scenarioName);
    const leaderboardKey = `scenario_${scenarioName}`;
    const stored = window.leaderboard ? window.leaderboard.getHighScore(leaderboardKey) : 0;
    const hEl = document.getElementById('highScoreValue');
    if (hEl) hEl.textContent = stored.toString();
    if (!scn) {
      document.getElementById('result').textContent = 'Scenario not found.';
      startBtn.disabled = true;
    } else {
      document.getElementById('timeInput').value = scn.time;
      document.getElementById('bufferInput').value = scn.buffer;
      document.getElementById('challengeInput').value = scn.challenge;
      document.getElementById('sidesSelect').value = scn.sides;
      document.getElementById('sizeSelect').value = scn.size;
      document.getElementById('gridSelect').value = scn.grid;
      document.getElementById('drawModeToggle').checked = scn.drawMode;
      document.getElementById('drawModeLabel').textContent = scn.drawMode ? 'Point-to-Point' : 'Freehand';
      document.getElementById('giveHighest').checked = scn.giveHighest;
      document.getElementById('giveLowest').checked = scn.giveLowest;
      document.getElementById('giveLeftmost').checked = scn.giveLeftmost;
      document.getElementById('giveRightmost').checked = scn.giveRightmost;
      document.getElementById('afterSelect').value = scn.afterAction || 'end';
      document.getElementById('thresholdPoints').value = scn.thresholdPoints || 1;
      document.getElementById('thresholdGrade').value = scn.thresholdGrade || 'green';
      toggleThreshold();
    }
    startBtn.addEventListener('click', () => {
      hideStartButton(startBtn);
      result.textContent = '';
      startScenario();
    });
  }
});

function startScenario(repeat = false) {
  clearTimeout(viewTimer);
  clearTimeout(scenarioTimer);

  const lookTime = Math.max(1000, parseFloat(document.getElementById('timeInput').value) * 1000);
  const bufferTime = Math.max(0, parseFloat(document.getElementById('bufferInput').value) * 1000);
  const challengeLength = Math.max(1000, parseFloat(document.getElementById('challengeInput').value) * 1000);
  const sides = parseInt(document.getElementById('sidesSelect').value);

  if (!repeat) {
    scoreSummary = { totalDist: 0, totalPoints: 0, green: 0, yellow: 0, red: 0 };
    totalDuration = 0;
    scenarioConfig = {
      afterAction: document.getElementById('afterSelect').value,
      thresholdPoints: parseInt(document.getElementById('thresholdPoints').value) || 1,
      thresholdGrade: document.getElementById('thresholdGrade').value
    };
    const avgEl = document.getElementById('avgError');
    const gEl = document.getElementById('greenCount');
    const yEl = document.getElementById('yellowCount');
    const rEl = document.getElementById('redCount');
    const sEl = document.getElementById('scoreValue');
    if (avgEl) avgEl.textContent = '0.0';
    if (gEl) gEl.textContent = '0';
    if (yEl) yEl.textContent = '0';
    if (rEl) rEl.textContent = '0';
    if (sEl) sEl.textContent = '0';
  }

  if (!repeat) {
    setLastShape(originalShape.map(p => ({ ...p })));
    const size = document.getElementById('sizeSelect').value;
    setOriginalShape(generateShape(sides, canvas.width, canvas.height, size));
  }
  setPlayerShape([]);
  setDrawingEnabled(false);
  result.textContent = '';
  clearCanvas(ctx);
  drawGrid();
  drawShape(originalShape, 'black');

  setViewTimer(setTimeout(() => {
    clearCanvas(ctx);
    drawGrid();
    drawGivenPoints(originalShape);
    setTimeout(() => {
      setDrawingEnabled(true);
      drawStartTime = Date.now();
      scenarioTimer = setTimeout(() => {
        revealShape();
      }, challengeLength);
    }, bufferTime);
  }, lookTime));
}
