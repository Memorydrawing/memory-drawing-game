document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tutorialBtn')?.addEventListener('click', () => {
    window.location.href = 'tutorial.html';
  });

  document.getElementById('canvasBtn')?.addEventListener('click', () => {
    window.location.href = 'drawing_canvas.html';
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
  });
});
