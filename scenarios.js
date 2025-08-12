const builtInScenarios = {
  "Angle Challenge": { special: true },
  "Angle Challenge (10\u00B0 increments)": { special: true },
  "Inch Drill": { special: true },
  "Point Drill 0.5 sec Look": { special: true },
  "Point Drill 0.25 sec Look": { special: true },
  "Point Drill 0.1 sec Look": { special: true }
};

function getSavedScenarios() {
  return JSON.parse(localStorage.getItem('scenarios') || '{}');
}

function getScenario(name) {
  return builtInScenarios[name] || getSavedScenarios()[name];
}

function getScenarioNames() {
  return [...Object.keys(builtInScenarios), ...Object.keys(getSavedScenarios())];
}

function loadScenarioList() {
  const list = document.getElementById('scenarioList');
  if (!list) return;
  list.innerHTML = '';
  getScenarioNames().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    list.appendChild(opt);
  });
}

function playSelectedScenario() {
  const name = document.getElementById('scenarioList')?.value;
  if (!name) return;
  if (name === 'Angle Challenge') {
    window.location.href = 'angles.html';
  } else if (name === 'Angle Challenge (10\u00B0 increments)') {
    window.location.href = 'angles.html?step=10';
  } else if (name === 'Inch Drill') {
    window.location.href = 'inch_warmup.html';
  } else if (name === 'Point Drill 0.5 sec Look') {
    window.location.href = 'point_drill_05.html';
  } else if (name === 'Point Drill 0.25 sec Look') {
    window.location.href = 'point_drill_025.html';
  } else if (name === 'Point Drill 0.1 sec Look') {
    window.location.href = 'point_drill_01.html';
  } else {
    window.location.href = 'scenario_play.html?name=' + encodeURIComponent(name);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playBtn')?.addEventListener('click', playSelectedScenario);
  document.getElementById('menuBtn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  if (document.getElementById('scenarioList')) loadScenarioList();
});
