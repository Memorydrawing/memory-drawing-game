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

let scenarioTimer = null;
let scoreSummary = { totalDist: 0, totalPoints: 0 };
let scenarioConfig = null;

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
  scoreSummary.totalDist += avg * playerShape.length;
  scoreSummary.totalPoints += playerShape.length;
  const overall = scoreSummary.totalPoints ? scoreSummary.totalDist / scoreSummary.totalPoints : 0;
  result.textContent = `Current avg: ${avg.toFixed(1)} px | Overall avg: ${overall.toFixed(1)} px`;

  if (scenarioConfig.afterAction === 'end') return;
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

  const backScenarioBtn = document.getElementById('scenarioBackBtn');
  if (backScenarioBtn) {
    backScenarioBtn.addEventListener('click', () => {
      window.location.href = 'scenarios.html';
    });
  }

  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || '';
    const titleEl = document.getElementById('scenarioTitle');
    if (titleEl) titleEl.textContent = name || 'Scenario';
    const scn = getScenario(name);
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
    scoreSummary = { totalDist: 0, totalPoints: 0 };
    scenarioConfig = {
      afterAction: document.getElementById('afterSelect').value,
      thresholdPoints: parseInt(document.getElementById('thresholdPoints').value) || 1,
      thresholdGrade: document.getElementById('thresholdGrade').value
    };
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
      scenarioTimer = setTimeout(() => {
        revealShape();
      }, challengeLength);
    }, bufferTime);
  }, lookTime));
}
