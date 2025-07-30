let scenarioTimer = null;

function loadSavedScenarios() {
  const list = document.getElementById('savedScenarios');
  if (!list) return;
  list.innerHTML = '';
  const data = JSON.parse(localStorage.getItem('scenarios') || '{}');
  Object.keys(data).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    list.appendChild(opt);
  });
  if (list.options.length > 0) {
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
    giveRightmost: document.getElementById('giveRightmost').checked
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
}

document.addEventListener('DOMContentLoaded', loadSavedScenarios);

function startScenario() {
  clearTimeout(viewTimer);
  clearTimeout(scenarioTimer);

  const lookTime = Math.max(1000, parseFloat(document.getElementById('timeInput').value) * 1000);
  const bufferTime = Math.max(0, parseFloat(document.getElementById('bufferInput').value) * 1000);
  const challengeLength = Math.max(1000, parseFloat(document.getElementById('challengeInput').value) * 1000);
  const sides = parseInt(document.getElementById('sidesSelect').value);

  lastShape = originalShape.map(p => ({ ...p }));
  originalShape = generateShape(sides);
  playerShape = [];
  drawingEnabled = false;
  result.textContent = '';
  clearCanvas();
  drawGrid();
  drawShape(originalShape, 'black');

  viewTimer = setTimeout(() => {
    clearCanvas();
    drawGrid();
    drawGivenPoints(originalShape);
    setTimeout(() => {
      drawingEnabled = true;
      scenarioTimer = setTimeout(() => {
        revealShape();
      }, challengeLength);
    }, bufferTime);
  }, lookTime);
}
