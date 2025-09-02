document.addEventListener('DOMContentLoaded', () => {
  let p2pBest = null;
  let freehandBest = null;
  try {
    p2pBest = localStorage.getItem('p2pBest');
    freehandBest = localStorage.getItem('freehandBest');
  } catch {
    // localStorage might be unavailable; ignore errors
  }

  const p2pEl = document.getElementById('p2pBest');
  const freeEl = document.getElementById('freehandBest');
  if (p2pEl) p2pEl.textContent = p2pBest ? `${parseFloat(p2pBest).toFixed(1)} px` : 'N/A';
  if (freeEl) freeEl.textContent = freehandBest ? `${parseFloat(freehandBest).toFixed(1)} px` : 'N/A';

  document.getElementById('tutorialBtn')?.addEventListener('click', () => {
    window.location.href = 'tutorial.html';
  });
  document.getElementById('drillsBtn')?.addEventListener('click', () => {
    window.location.href = 'drills.html';
  });
  document.getElementById('scenariosBtn')?.addEventListener('click', () => {
    window.location.href = 'scenarios.html';
  });
  document.getElementById('aboutBtn')?.addEventListener('click', () => {
    window.location.href = 'about.html';
  });
  document.getElementById('resetScoresBtn')?.addEventListener('click', () => {
    if (!confirm('Reset all high scores?')) return;
    try {
      const remove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('leaderboard_') ||
           key.startsWith('scenarioScore_') ||
           key === 'p2pBest' ||
           key === 'freehandBest')
        ) {
          remove.push(key);
        }
      }
      remove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore errors if localStorage is unavailable
    }
    const p2pEl = document.getElementById('p2pBest');
    const freeEl = document.getElementById('freehandBest');
    if (p2pEl) p2pEl.textContent = 'N/A';
    if (freeEl) freeEl.textContent = 'N/A';
  });
});
