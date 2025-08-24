import { scenarioData, getScenarioUrl } from './scenarios.js';

function init() {
  const list = document.getElementById('exerciseList');
  const saved = JSON.parse(localStorage.getItem('scenarios') || '{}');
  const scenarioNames = [...Object.keys(scenarioData), ...Object.keys(saved)];
  scenarioNames.forEach(name => {
    const data = scenarioData[name] || {};
    const diff = data.difficulty;
    const subject = data.subject;
    const high = localStorage.getItem(`scenarioScore_${name}`) || 0;
    const existing = Array.from(list.querySelectorAll('.exercise-item'))
      .find(item => item.querySelector('h3')?.textContent === name);
    if (existing) {
      existing.dataset.link = getScenarioUrl(name);
      let container = existing.querySelector('.tag-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'tag-container';
        existing.insertBefore(container, existing.firstChild);
      }
        let cat = container.querySelector('.category-label');
        if (!cat) {
          cat = document.createElement('span');
          cat.className = 'category-label category-memorization';
          cat.textContent = 'Memorization';
          container.appendChild(cat);
        } else {
          cat.classList.add('category-memorization');
        }
      if (subject) {
        let subj = container.querySelector('.subject-label');
        if (!subj) {
          subj = document.createElement('span');
          subj.className = 'subject-label';
        }
        subj.textContent = subject;
        const diffBadge = container.querySelector('.difficulty-label');
        if (diffBadge) {
          container.insertBefore(subj, diffBadge);
        } else {
          container.appendChild(subj);
        }
      }
      if (diff) {
        existing.dataset.difficulty = diff;
        let badge = container.querySelector('.difficulty-label');
        if (!badge) {
          badge = document.createElement('span');
          container.appendChild(badge);
        }
        badge.className = `difficulty-label difficulty-${diff.toLowerCase()}`;
        badge.textContent = diff;
      }
      const info = existing.querySelector('.exercise-info');
      let hs = existing.querySelector('.high-score');
      if (!hs) {
        hs = document.createElement('p');
        hs.className = 'high-score';
        info.appendChild(hs);
      }
      hs.textContent = `High Score: ${high}`;
    } else {
      const item = document.createElement('div');
      item.className = 'exercise-item';
      item.dataset.link = getScenarioUrl(name);
      const container = document.createElement('div');
      container.className = 'tag-container';
        const cat = document.createElement('span');
        cat.className = 'category-label category-memorization';
        cat.textContent = 'Memorization';
      container.appendChild(cat);
      if (subject) {
        const subj = document.createElement('span');
        subj.className = 'subject-label';
        subj.textContent = subject;
        container.appendChild(subj);
      }
      if (diff) {
        item.dataset.difficulty = diff;
        const badge = document.createElement('span');
        badge.className = `difficulty-label difficulty-${diff.toLowerCase()}`;
        badge.textContent = diff;
        container.appendChild(badge);
      }
      item.appendChild(container);
      const img = document.createElement('img');
      img.className = 'exercise-gif';
      img.alt = '';
      const info = document.createElement('div');
      info.className = 'exercise-info';
      const title = document.createElement('h3');
      title.textContent = name;
      info.appendChild(title);
      const desc = document.createElement('p');
      desc.textContent = data.description || 'User-created scenario.';
      info.appendChild(desc);
      const hs = document.createElement('p');
      hs.className = 'high-score';
      hs.textContent = `High Score: ${high}`;
      info.appendChild(hs);
      item.appendChild(img);
      item.appendChild(info);
      list.appendChild(item);
    }
  });

  const trainer = document.querySelector('.exercise-item[data-link="shape_trainer.html"]');
  if (trainer) {
    const info = trainer.querySelector('.exercise-info');
    const p2p = localStorage.getItem('p2pBest');
    const free = localStorage.getItem('freehandBest');
    const hs = document.createElement('p');
    hs.className = 'high-score';
    const p2pText = p2p ? `${parseFloat(p2p).toFixed(1)} px` : 'N/A';
    const freeText = free ? `${parseFloat(free).toFixed(1)} px` : 'N/A';
    hs.textContent = `Best - P2P: ${p2pText}, Freehand: ${freeText}`;
    info.appendChild(hs);
  }

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
