function init() {
  // Add high scores for dexterity drills
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

  // Search and tag filter
  const search = document.getElementById('searchInput');
  const tagSelect = document.getElementById('tagSelect');

  const filterList = () => {
    const term = search?.value.toLowerCase() || '';
    const selectedTag = tagSelect?.value || '';
    document.querySelectorAll('.exercise-item').forEach(item => {
      const title = item.querySelector('h3')?.textContent.toLowerCase() || '';
      const tags = Array.from(item.querySelectorAll('.tag-container span')).map(span => span.textContent);
      const matchesSearch = title.includes(term);
      const matchesTag = !selectedTag || tags.includes(selectedTag);
      item.style.display = matchesSearch && matchesTag ? '' : 'none';
    });
  };

  if (search) {
    search.addEventListener('input', filterList);
  }

  if (tagSelect) {
    const tags = new Set();
    document.querySelectorAll('.exercise-item .tag-container span').forEach(span => tags.add(span.textContent));
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagSelect.appendChild(option);
    });
    tagSelect.addEventListener('change', filterList);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
