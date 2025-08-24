import { drills } from './drills_data.js';

const diffMap = { Beginner: 1, Adept: 2, Expert: 3 };
const diffReverse = { 1: 'Beginner', 2: 'Adept', 3: 'Expert' };

function loadScenarios() {
  try {
    return JSON.parse(localStorage.getItem('userScenarios') || '{}');
  } catch {
    return {};
  }
}

function saveScenarios(data) {
  localStorage.setItem('userScenarios', JSON.stringify(data));
}

function renderScenarioList() {
  const container = document.getElementById('scenarioList');
  if (!container) return;
  container.innerHTML = '';
  const scenarios = loadScenarios();
  Object.entries(scenarios).forEach(([title, steps]) => {
    const item = document.createElement('div');
    item.className = 'exercise-item';
    const tagBox = document.createElement('div');
    tagBox.className = 'tag-container';
    const categories = new Set();
    const subjects = new Set();
    let diffTotal = 0;
    let diffCount = 0;
    const descParts = [];
    steps.forEach(step => {
      const drill = drills.find(d => d.name === step.name);
      if (!drill) return;
      categories.add(drill.category);
      subjects.add(drill.subject);
      diffTotal += diffMap[drill.difficulty] || 0;
      diffCount++;
      descParts.push(`${drill.name}${step.repeats > 1 ? ` x${step.repeats}` : ''}`);
    });
    categories.forEach(cat => {
      const span = document.createElement('span');
      span.className = `category-label category-${cat.toLowerCase()}`;
      span.textContent = cat;
      tagBox.appendChild(span);
    });
    subjects.forEach(sub => {
      const span = document.createElement('span');
      span.className = 'subject-label';
      span.textContent = sub;
      tagBox.appendChild(span);
    });
    if (diffCount) {
      const avg = Math.round(diffTotal / diffCount);
      const diffSpan = document.createElement('span');
      const diffName = diffReverse[avg] || 'Beginner';
      diffSpan.className = `difficulty-label difficulty-${diffName.toLowerCase()}`;
      diffSpan.textContent = diffName;
      tagBox.appendChild(diffSpan);
    }
    item.appendChild(tagBox);
    const info = document.createElement('div');
    info.className = 'exercise-info';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.textContent = descParts.join(', ');
    info.appendChild(h3);
    info.appendChild(p);
    item.appendChild(info);
    item.addEventListener('click', () => {
      window.location.href = `scenario_player.html?name=${encodeURIComponent(title)}`;
    });
    container.appendChild(item);
  });
}

function addDrillRow() {
  const container = document.getElementById('sequenceContainer');
  const row = document.createElement('div');
  row.className = 'sequence-row';
  const select = document.createElement('select');
  drills.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.name;
    opt.textContent = d.name;
    select.appendChild(opt);
  });
  const repeat = document.createElement('input');
  repeat.type = 'number';
  repeat.min = '1';
  repeat.value = '1';
  const remove = document.createElement('button');
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => row.remove());
  row.appendChild(select);
  row.appendChild(repeat);
  row.appendChild(remove);
  container.appendChild(row);
}

function showBuilder(show) {
  document.getElementById('listScreen').style.display = show ? 'none' : 'block';
  document.getElementById('builderScreen').style.display = show ? 'block' : 'none';
}

function saveCurrentScenario() {
  const title = document.getElementById('scenarioTitle').value.trim();
  if (!title) return;
  const steps = [];
  document.querySelectorAll('#sequenceContainer .sequence-row').forEach(row => {
    const name = row.querySelector('select').value;
    const repeats = parseInt(row.querySelector('input').value) || 1;
    steps.push({ name, repeats });
  });
  const data = loadScenarios();
  data[title] = steps;
  saveScenarios(data);
  renderScenarioList();
  showBuilder(false);
}

document.addEventListener('DOMContentLoaded', () => {
  renderScenarioList();
  document.getElementById('newScenarioBtn')?.addEventListener('click', () => {
    document.getElementById('scenarioTitle').value = '';
    document.getElementById('sequenceContainer').innerHTML = '';
    addDrillRow();
    showBuilder(true);
  });
  document.getElementById('builderBackBtn')?.addEventListener('click', () => showBuilder(false));
  document.getElementById('addDrillBtn')?.addEventListener('click', addDrillRow);
  document.getElementById('saveScenarioBtn')?.addEventListener('click', saveCurrentScenario);
});
