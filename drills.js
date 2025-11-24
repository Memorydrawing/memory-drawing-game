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

function renderExerciseLists() {
  const dexterityList = document.getElementById('dexterityList');
  const memoryList = document.getElementById('memoryList');

  if (!dexterityList || !memoryList) {
    return Array.from(document.querySelectorAll('.exercise-item'));
  }

  dexterityList.innerHTML = '';
  memoryList.innerHTML = '';

  const sortedDrills = [...drills].sort((a, b) => {
    const diffA = difficultyOrder[a.difficulty] ?? Number.POSITIVE_INFINITY;
    const diffB = difficultyOrder[b.difficulty] ?? Number.POSITIVE_INFINITY;
    if (diffA !== diffB) {
      return diffA - diffB;
    }
    return a.name.localeCompare(b.name);
  });

  return sortedDrills
    .map(drill => {
      const item = createExerciseItem(drill);
      const targetList =
        drill.category === 'Dexterity'
          ? dexterityList
          : drill.category === 'Memorization'
          ? memoryList
          : null;

      if (!targetList) {
        return null;
      }

      targetList.appendChild(item);
      return item;
    })
    .filter(Boolean);
}

function init() {
  const items = renderExerciseLists();

  const subjectGroups = {
    Points: ['Points'],
    Lines: ['Lines'],
    Shapes: ['Shapes', 'Angles', 'Ellipses', 'Ellipse'],
    Forms: ['Forms'],
    Colors: ['Colors', 'Color']
  };

  const legacySubjectMap = {
    Values: 'Colors'
  };

  const getSubjectKey = subject => subjectGroups[subject] ? subject : legacySubjectMap[subject] || 'Points';

  const selectSubject = subject => {
    const subjectKey = getSubjectKey(subject);
    const allowedSubjects = subjectGroups[subjectKey] || subjectGroups.Points;
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

  const normalizedSubject = getSubjectKey(defaultSubject || 'Points');

  const setActiveButton = subject => {
    const subjectKey = getSubjectKey(subject);
    buttons.forEach(button => {
      const isActive = button.dataset.subject === subjectKey;
      button.classList.toggle('active', isActive);
    });
    selectSubject(subjectKey);
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
