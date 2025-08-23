document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.exercise-item[data-link]').forEach(item => {
    const info = item.querySelector('.exercise-info');
    const key = item.dataset.scoreKey;
    if (info && key) {
      const val = localStorage.getItem(key) || 0;
      const p = document.createElement('p');
      p.className = 'high-score';
      p.textContent = `High Score: ${val}`;
      info.appendChild(p);
    }
    item.addEventListener('click', () => {
      window.location.href = item.dataset.link;
    });
  });
});
