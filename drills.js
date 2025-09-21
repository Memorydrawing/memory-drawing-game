import { drills } from './drills_data.js';

function getHighScore(key) {
  const data = JSON.parse(localStorage.getItem('leaderboard_' + key)) || {};
  const scores = Object.values(data);
  return scores.length ? Math.max(...scores) : 0;
}

const categoryClassMap = {
  Memorization: 'category-memorization',
  Dexterity: 'category-dexterity'
};

const difficultyClassMap = {
  Beginner: 'difficulty-beginner',
  Adept: 'difficulty-adept',
  Expert: 'difficulty-expert'
};

function createLabelSpan(baseClass, text, extraClass) {
  const span = document.createElement('span');
  span.className = [baseClass, extraClass].filter(Boolean).join(' ');
  span.textContent = text;
  return span;
}

function createExerciseItem(drill) {
  const item = document.createElement('div');
  item.className = 'exercise-item';
  item.dataset.link = drill.url;
  if (drill.difficulty) {
    item.dataset.difficulty = drill.difficulty;
  }
  if (drill.scoreKey) {
    item.dataset.scoreKey = drill.scoreKey;
  }

  const tagContainer = document.createElement('div');
  tagContainer.className = 'tag-container';
  if (drill.category) {
    tagContainer.appendChild(
      createLabelSpan('category-label', drill.category, categoryClassMap[drill.category])
    );
  }
  if (drill.subject) {
    tagContainer.appendChild(createLabelSpan('subject-label', drill.subject));
  }
  if (drill.difficulty) {
    tagContainer.appendChild(
      createLabelSpan('difficulty-label', drill.difficulty, difficultyClassMap[drill.difficulty])
    );
  }
  (drill.tags || []).forEach(tag => {
    const spanClass = tag === 'Experimental' ? 'experimental-label' : 'tag-label';
    tagContainer.appendChild(createLabelSpan(spanClass, tag));
  });

  const preview = document.createElement('img');
  preview.className = 'exercise-gif';
  preview.alt = '';

  const info = document.createElement('div');
  info.className = 'exercise-info';

  const title = document.createElement('h3');
  title.textContent = drill.name;
  const description = document.createElement('p');
  description.textContent = drill.description;

  info.appendChild(title);
  info.appendChild(description);

  item.appendChild(tagContainer);
  item.appendChild(preview);
  item.appendChild(info);

  return item;
}

function renderExerciseList() {
  const list = document.getElementById('exerciseList');
  if (!list) {
    return [];
  }
  list.innerHTML = '';
  const createdItems = drills.map(drill => {
    const item = createExerciseItem(drill);
    list.appendChild(item);
    return item;
  });
  return createdItems;
}

function init() {
  renderExerciseList();

  const items = Array.from(document.querySelectorAll('.exercise-item[data-link]'));

  items.forEach(item => {
    const info = item.querySelector('.exercise-info');
    const key = item.dataset.scoreKey;
    if (info && key) {
      const val = getHighScore(key);
      const p = document.createElement('p');
      p.className = 'high-score';
      p.textContent = `High Score: ${val}`;
      info.appendChild(p);
    }
    item.addEventListener('click', () => {
      window.location.href = item.dataset.link;
    });
  });

  const search = document.getElementById('searchInput');
  const tagSelect = document.getElementById('tagSelect');

  const filterList = () => {
    const term = search?.value.toLowerCase() || '';
    const selectedTag = tagSelect?.value || '';
    items.forEach(item => {
      const title = item.querySelector('h3')?.textContent.toLowerCase() || '';
      const tags = Array.from(item.querySelectorAll('.tag-container span')).map(
        span => span.textContent
      );
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
    items.forEach(item => {
      item
        .querySelectorAll('.tag-container span')
        .forEach(span => tags.add(span.textContent));
    });
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
