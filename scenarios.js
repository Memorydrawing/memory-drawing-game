export const scenarioData = {
  "Angles (5\u00B0 increments)": {
    url: 'angles.html',
    description: 'Guess randomly oriented angles in 5\u00B0 steps.',
    difficulty: 'Expert',
    subject: 'Angles'
  },
  "Angles (10\u00B0 increments)": {
    url: 'angles.html?step=10',
    description: 'Guess randomly oriented angles in 10\u00B0 steps.',
    difficulty: 'Beginner',
    subject: 'Angles'
  },
  "Inch Drill": {
    url: 'inch_warmup.html',
    description: 'Draw a 1-inch line from a given starting arrow.',
    difficulty: 'Beginner',
    subject: 'Lines'
  },
  "Line Memory": {
    url: 'line_memory.html',
    description: 'Memorize a line and recreate it after it disappears.',
    difficulty: 'Adept',
    subject: 'Lines'
  },
  "Point Drill 0.5 sec Look": {
    url: 'point_drill_05.html',
    description: 'Memorize a point after a 0.5 second preview and tap its location.',
    difficulty: 'Beginner',
    subject: 'Points'
  },
  "Point Drill 0.25 sec Look": {
    url: 'point_drill_025.html',
    description: 'Memorize a point after a 0.25 second preview and tap its location.',
    difficulty: 'Adept',
    subject: 'Points'
  },
  "Point Drill 0.1 sec Look": {
    url: 'point_drill_01.html',
    description: 'Memorize a point after a 0.1 second preview and tap its location.',
    difficulty: 'Expert',
    subject: 'Points'
  },
  "Point Sequence 0.5 sec Look": {
    url: 'point_sequence_05.html',
    description: 'Memorize an expanding sequence of points after a 0.5 second preview.',
    difficulty: 'Adept',
    subject: 'Points'
  },
  "Three Points": {
    url: 'three_points.html',
    description: 'Memorize three points.',
    difficulty: 'Beginner',
    subject: 'Points'
  },
  "Four Points": {
    url: 'four_points.html',
    description: 'Memorize four points.',
    difficulty: 'Adept',
    subject: 'Points'
  }
};

export const scenarioUrls = Object.fromEntries(
  Object.entries(scenarioData).map(([name, data]) => [name, data.url])
);

const builtInScenarios = Object.fromEntries(
  Object.keys(scenarioData).map(name => [name, { special: true }])
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
    const data = scenarioData[name] || {};
    const diff = data.difficulty;
    const subject = data.subject;
    const tags = document.createElement('div');
    tags.className = 'tag-container';
    const cat = document.createElement('span');
    cat.className = 'category-label category-memorization';
    cat.textContent = 'Memorization';
    tags.appendChild(cat);
    if (subject) {
      const subj = document.createElement('span');
      subj.className = 'subject-label';
      subj.textContent = subject;
      tags.appendChild(subj);
    }
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
