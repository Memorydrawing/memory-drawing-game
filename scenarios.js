export const scenarioUrls = {
  "Angle Challenge": 'angles.html',
  "Angle Challenge (10\u00B0 increments)": 'angles.html?step=10',
  "Inch Drill": 'inch_warmup.html',
  "Point Drill 0.5 sec Look": 'point_drill_05.html',
  "Point Drill 0.25 sec Look": 'point_drill_025.html',
  "Point Drill 0.1 sec Look": 'point_drill_01.html'
};

const builtInScenarios = Object.fromEntries(
  Object.keys(scenarioUrls).map(name => [name, { special: true }])
);

function getSavedScenarios() {
  try {
    return JSON.parse(localStorage.getItem('scenarios') || '{}');
  } catch (err) {
    console.warn('Failed to parse saved scenarios:', err);
    return {};
  }
}

export function getScenario(name) {
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

export function getScenarioUrl(name) {
  return scenarioUrls[name] || `scenario_play.html?name=${encodeURIComponent(name)}`;
}

export function playSelectedScenario() {
  const name = document.getElementById('scenarioList')?.value;
  if (!name) return;
  window.location.assign(getScenarioUrl(name));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playBtn')?.addEventListener('click', playSelectedScenario);
  document.getElementById('menuBtn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  if (document.getElementById('scenarioList')) loadScenarioList();
});
