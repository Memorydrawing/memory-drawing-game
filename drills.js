document.addEventListener('DOMContentLoaded', () => {
  // Add high scores for dexterity drills
  document.querySelectorAll('.exercise-item[data-score-key]').forEach(item => {
    const info = item.querySelector('.exercise-info');
    const key = item.dataset.scoreKey;
    if (info && key) {
      const val = localStorage.getItem(key) || 0;
      const p = document.createElement('p');
      p.className = 'high-score';
      p.textContent = `High Score: ${val}`;
      info.appendChild(p);
    }
  });

  // Search filter
  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', () => {
      const term = search.value.toLowerCase();
      document.querySelectorAll('.exercise-item').forEach(item => {
        const title = item.querySelector('h3')?.textContent.toLowerCase() || '';
        item.style.display = title.includes(term) ? '' : 'none';
      });
    });
  }

  // Navigate on click
  document.querySelectorAll('.exercise-item[data-link]').forEach(item => {
    item.addEventListener('click', () => {
      window.location.href = item.dataset.link;
    });
  });
});
