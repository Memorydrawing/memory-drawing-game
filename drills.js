import { drills } from './drills_data.js';

function getHighScore(key) {
  const data = JSON.parse(localStorage.getItem('leaderboard_' + key)) || {};
  const scores = Object.values(data);
  return scores.length ? Math.max(...scores) : 0;
}

const difficultyClassMap = {
  Beginner: 'difficulty-beginner',
  Adept: 'difficulty-adept',
  Expert: 'difficulty-expert'
};

const categoryClassMap = {
  Dexterity: 'category-dexterity',
  Observation: 'category-observation',
  Memory: 'category-memory'
};

const displayCategoryMap = {
  Memorization: 'Memory'
};

const categoryDescriptions = {
  Dexterity: 'Motor-control exercises for steadier hands, cleaner lines, and more accurate taps.',
  Observation: 'Direct-looking exercises for judging visible angles, color, value, and reference shapes.',
  Memory: 'Recall exercises that hide the prompt before you recreate the target from memory.'
};

function getDisplayCategory(category) {
  return displayCategoryMap[category] || category || 'Dexterity';
}

function createLabelSpan(baseClass, text, extraClass) {
  const span = document.createElement('span');
  span.className = [baseClass, extraClass].filter(Boolean).join(' ');
  span.textContent = text;
  return span;
}

function createExerciseItem(drill) {
  const item = document.createElement('div');
  const displayCategory = getDisplayCategory(drill.category);
  item.className = 'exercise-item';
  item.dataset.link = drill.url;
  item.dataset.category = displayCategory;
  if (drill.subject) {
    item.dataset.subject = drill.subject;
  }
  if (drill.difficulty) {
    item.dataset.difficulty = drill.difficulty;
  }
  if (drill.scoreKey) {
    item.dataset.scoreKey = drill.scoreKey;
  }

  const tagContainer = document.createElement('div');
  tagContainer.className = 'tag-container';
  tagContainer.appendChild(
    createLabelSpan('category-label', displayCategory, categoryClassMap[displayCategory])
  );
  if (drill.difficulty) {
    tagContainer.appendChild(
      createLabelSpan('difficulty-label', drill.difficulty, difficultyClassMap[drill.difficulty])
    );
  }

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

const difficultyOrder = {
  Beginner: 0,
  Adept: 1,
  Expert: 2
};

function renderExerciseList() {
  const exerciseList = document.getElementById('exerciseList');

  if (!exerciseList) {
    return Array.from(document.querySelectorAll('.exercise-item'));
  }

  exerciseList.innerHTML = '';

  const sortedDrills = [...drills].sort((a, b) => {
    const categoryA = getDisplayCategory(a.category);
    const categoryB = getDisplayCategory(b.category);
    if (categoryA !== categoryB) {
      return categoryA.localeCompare(categoryB);
    }
    const diffA = difficultyOrder[a.difficulty] ?? Number.POSITIVE_INFINITY;
    const diffB = difficultyOrder[b.difficulty] ?? Number.POSITIVE_INFINITY;
    if (diffA !== diffB) {
      return diffA - diffB;
    }
    return a.name.localeCompare(b.name);
  });

  return sortedDrills.map(drill => {
    const item = createExerciseItem(drill);
    exerciseList.appendChild(item);
    return item;
  });
}

function init() {
  const items = renderExerciseList();
  const buttons = Array.from(document.querySelectorAll('.drill-category-button'));
  const title = document.getElementById('activeCategoryTitle');

  const getCategoryKey = category => {
    const normalized = getDisplayCategory(category);
    return categoryDescriptions[normalized] ? normalized : 'Dexterity';
  };

  const selectCategory = category => {
    const categoryKey = getCategoryKey(category);
    items.forEach(item => {
      item.style.display = item.dataset.category === categoryKey ? '' : 'none';
    });
    if (title) {
      title.textContent = categoryKey;
      title.dataset.description = categoryDescriptions[categoryKey];
    }
  };

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

  const params = new URLSearchParams(window.location.search);
  const defaultCategory = params.get('category') || params.get('subject');
  const normalizedCategory = getCategoryKey(defaultCategory || 'Dexterity');

  const setActiveButton = category => {
    const categoryKey = getCategoryKey(category);
    buttons.forEach(button => {
      const isActive = button.dataset.category === categoryKey;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    selectCategory(categoryKey);
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.dataset.category || 'Dexterity';
      const url = new URL(window.location.href);
      url.searchParams.delete('subject');
      url.searchParams.set('category', category);
      window.history.replaceState({}, '', url.toString());
      setActiveButton(category);
    });
  });

  setActiveButton(normalizedCategory);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
