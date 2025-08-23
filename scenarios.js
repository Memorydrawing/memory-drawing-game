export const scenarioUrls = {
  "Angles (5\u00B0 increments)": 'angles.html',
  "Angles (10\u00B0 increments)": 'angles.html?step=10',
  "Inch Drill": 'inch_warmup.html',
  "Point Drill 0.5 sec Look": 'point_drill_05.html',
  "Point Drill 0.25 sec Look": 'point_drill_025.html',
  "Point Drill 0.1 sec Look": 'point_drill_01.html',
  "Triangles": 'triangles.html',
  "Quadrilaterals": 'quadrilaterals.html'
};

export const scenarioDescriptions = {
  "Angles (5\u00B0 increments)": 'Guess randomly oriented angles in 5\u00B0 steps.',
  "Angles (10\u00B0 increments)": 'Guess randomly oriented angles in 10\u00B0 steps.',
  "Inch Drill": 'Draw a 1-inch line from a given starting arrow.',
  "Point Drill 0.5 sec Look": 'Memorize a point after a 0.5 second preview and tap its location.',
  "Point Drill 0.25 sec Look": 'Memorize a point after a 0.25 second preview and tap its location.',
  "Point Drill 0.1 sec Look": 'Memorize a point after a 0.1 second preview and tap its location.',
  "Triangles": 'Memorize triangle vertices.',
  "Quadrilaterals": 'Memorize quadrilateral vertices.'
};

export const scenarioDifficulty = {
  "Angles (5\u00B0 increments)": 'Expert',
  "Angles (10\u00B0 increments)": 'Beginner',
  "Inch Drill": 'Beginner',
  "Point Drill 0.5 sec Look": 'Beginner',
  "Point Drill 0.25 sec Look": 'Adept',
  "Point Drill 0.1 sec Look": 'Expert',
  "Triangles": 'Beginner',
  "Quadrilaterals": 'Adept'
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

let selectedScenario = null;

function loadScenarioList() {
  const list = document.getElementById('scenarioList');
  if (!list) return;
  list.innerHTML = '';
  getScenarioNames().forEach(name => {
    const item = document.createElement('div');
    item.className = 'exercise-item';
    const diff = scenarioDifficulty[name];
    const tags = document.createElement('div');
    tags.className = 'tag-container';
    const cat = document.createElement('span');
    cat.className = 'category-label';
    cat.textContent = 'Memorization';
    tags.appendChild(cat);
    if (diff) {
      item.dataset.difficulty = diff;
      const badge = document.createElement('span');
      badge.className = `difficulty-label difficulty-${diff.toLowerCase()}`;
      badge.textContent = diff;
      tags.appendChild(badge);
    }
    item.appendChild(tags);
    const img = document.createElement('img');
    img.className = 'exercise-gif';
    img.alt = '';
    const info = document.createElement('div');
    info.className = 'exercise-info';
    const title = document.createElement('h3');
    title.textContent = name;
    info.appendChild(title);
    item.appendChild(img);
    item.appendChild(info);
    item.addEventListener('click', () => {
      selectedScenario = name;
      list.querySelectorAll('.exercise-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      const playBtn = document.getElementById('playBtn');
      if (playBtn) playBtn.disabled = false;
    });
    list.appendChild(item);
  });
}

export function getScenarioUrl(name) {
  return scenarioUrls[name] || `scenario_play.html?name=${encodeURIComponent(name)}`;
}

export function playSelectedScenario() {
  if (!selectedScenario) return;
  window.location.assign(getScenarioUrl(selectedScenario));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playBtn')?.addEventListener('click', playSelectedScenario);
  if (document.getElementById('scenarioList')) loadScenarioList();
});
