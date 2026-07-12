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

  document.getElementById('scenariosBtn')?.addEventListener('click', () => {
    window.location.href = 'scenarios.html';
  });
  document.getElementById('experimentalBtn')?.addEventListener('click', () => {
    window.location.href = 'experimental.html';
  });
  document.getElementById('aboutBtn')?.addEventListener('click', () => {
    window.location.href = 'about.html';
  });
  document.querySelectorAll('.drill-link').forEach(button => {
    button.addEventListener('click', () => {
      const category = button.dataset.category || 'Dexterity';
      const query = new URLSearchParams({ category }).toString();
      window.location.href = `drills.html?${query}`;
    });
  });
});
