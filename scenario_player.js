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

  let observer;

  const resizeFrame = () => {
    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc) return;
      frame.style.height = doc.documentElement.scrollHeight + 'px';
      if (observer) observer.disconnect();
      observer = new ResizeObserver(() => {
        frame.style.height = doc.documentElement.scrollHeight + 'px';
      });
      observer.observe(doc.documentElement);
    } catch {
      // Ignore cross-origin access errors
    }
  };

  frame.addEventListener('load', resizeFrame);

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
