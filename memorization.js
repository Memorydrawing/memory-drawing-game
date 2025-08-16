import { scenarioUrls, getScenarioUrl } from './scenarios.js';

function init() {
  const list = document.getElementById('exerciseList');
  const saved = JSON.parse(localStorage.getItem('scenarios') || '{}');
  const scenarios = [...Object.keys(scenarioUrls), ...Object.keys(saved)];
  scenarios.forEach(name => {
    const item = document.createElement('div');
    item.className = 'exercise-item';
    item.dataset.link = getScenarioUrl(name);
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
    list.appendChild(item);
  });

  document.querySelectorAll('.exercise-item[data-link]').forEach(item => {
    item.addEventListener('click', () => {
      window.location.href = item.dataset.link;
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
