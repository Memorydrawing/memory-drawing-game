import { drills } from './drills_data.js';

function loadScenarios() {
  try {
    return JSON.parse(localStorage.getItem('userScenarios') || '{}');
  } catch {
    return {};
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');
  const titleEl = document.getElementById('scenarioTitle');
  const frame = document.getElementById('drillFrame');
  const nextBtn = document.getElementById('nextBtn');

  if (titleEl) titleEl.textContent = name || 'Scenario';

  const scenarios = loadScenarios();
  const steps = scenarios[name] || [];
  const urlMap = Object.fromEntries(drills.map(d => [d.name, d.url]));
  const sequence = [];
  steps.forEach(step => {
    const url = urlMap[step.name];
    if (!url) return;
    for (let i = 0; i < (step.repeats || 1); i++) {
      sequence.push(url);
    }
  });

  let index = 0;

  function loadCurrent() {
    if (index < sequence.length) {
      frame.src = sequence[index];
    } else {
      frame.style.display = 'none';
      nextBtn.disabled = true;
      if (titleEl) titleEl.textContent = `${name} - Complete!`;
    }
  }

  nextBtn.addEventListener('click', () => {
    index++;
    loadCurrent();
  });

  loadCurrent();
});
