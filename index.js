document.addEventListener('DOMContentLoaded', () => {
  const p2pBest = localStorage.getItem('p2pBest');
  const freehandBest = localStorage.getItem('freehandBest');
  const p2pEl = document.getElementById('p2pBest');
  const freeEl = document.getElementById('freehandBest');
  if (p2pEl) p2pEl.textContent = p2pBest ? `${parseFloat(p2pBest).toFixed(1)} px` : 'N/A';
  if (freeEl) freeEl.textContent = freehandBest ? `${parseFloat(freehandBest).toFixed(1)} px` : 'N/A';
  document.getElementById('memorizationBtn')?.addEventListener('click', () => {
    window.location.href = 'memorization.html';
  });
  document.getElementById('dexterityBtn')?.addEventListener('click', () => {
    window.location.href = 'dexterity.html';
  });
  document.getElementById('observationBtn')?.addEventListener('click', () => {
    window.location.href = 'observation.html';
  });
  document.getElementById('aboutBtn')?.addEventListener('click', () => {
    window.location.href = 'about.html';
  });
});
