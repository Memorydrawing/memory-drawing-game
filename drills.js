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
  return drills.map(drill => {
    const item = createExerciseItem(drill);
    list.appendChild(item);
    return item;
  });
}

function init() {
  renderExerciseList();

  const items = Array.from(document.querySelectorAll('.exercise-item[data-link]'));

  const subjectGroups = {
    Points: ['Points'],
    Lines: ['Lines'],
    Shapes: ['Shapes', 'Angles']
  };

  const selectSubject = subject => {
    const allowedSubjects = subjectGroups[subject] || subjectGroups.Points;
    items.forEach(item => {
      const itemSubject = item.dataset.subject;
      item.style.display = allowedSubjects.includes(itemSubject) ? '' : 'none';
    });
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

  const buttons = Array.from(document.querySelectorAll('.drill-category-button'));
  const params = new URLSearchParams(window.location.search);
  const defaultSubject = params.get('subject');

  const normalizedSubject = subjectGroups[defaultSubject] ? defaultSubject : 'Points';

  const setActiveButton = subject => {
    buttons.forEach(button => {
      const isActive = button.dataset.subject === subject;
      button.classList.toggle('active', isActive);
    });
    selectSubject(subject);
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const subject = button.dataset.subject || 'Points';
      const url = new URL(window.location.href);
      url.searchParams.set('subject', subject);
      window.history.replaceState({}, '', url.toString());
      setActiveButton(subject);
    });
  });

  setActiveButton(normalizedSubject);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
