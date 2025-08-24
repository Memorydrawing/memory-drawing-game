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
  const frame = document.getElementById('drillFrame');

  let observer;
  const NEXT_DELAY = 1500; // delay to show score before next drill

  const resizeFrame = () => {
    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc) return;

      const updateSize = () => {
        const docEl = doc.documentElement;
        const body = doc.body || {};
        const height = Math.max(500, docEl.scrollHeight, body.scrollHeight || 0);
        const width = Math.max(500, docEl.scrollWidth, body.scrollWidth || 0);
        frame.style.height = height + 'px';
        frame.style.width = width + 'px';
      };

      updateSize();

      if (observer) observer.disconnect();
      observer = new ResizeObserver(updateSize);
      observer.observe(doc.documentElement);
    } catch {
      // Ignore cross-origin access errors
    }
  };

  frame.addEventListener('load', () => {
    resizeFrame();

    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc) return;

      // Hide inner back button to avoid duplicate navigation controls
      const innerBack = doc.getElementById('backBtn');
      if (innerBack) innerBack.style.display = 'none';

      // Observe result element to auto-advance after score is shown
      const resultEl = doc.getElementById('result');
      if (resultEl) {
        let advanced = false;
        const resultObserver = new MutationObserver(() => {
          if (!advanced && resultEl.textContent.trim() !== '') {
            advanced = true;
            setTimeout(() => {
              index++;
              loadCurrent();
            }, NEXT_DELAY);
          }
        });
        resultObserver.observe(resultEl, { childList: true, subtree: true });
      }
    } catch {
      // Ignore cross-origin access errors
    }
  });

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
    }
  }

  loadCurrent();
});
