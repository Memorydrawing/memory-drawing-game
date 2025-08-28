(function() {
  const DEFAULT_FORMULAS = {
    point_drill_05: 'accuracy * 1000 + speed * 100',
    point_drill_025: 'accuracy * 1000 + speed * 100',
    point_drill_01: 'accuracy * 1000 + speed * 100',
    dexterity_point_drill: 'accuracy * 1000 + speed * 100',
    dexterity_thin_lines: 'targets hit',
    dexterity_thick_lines: 'targets hit',
    dexterity_contours: 'targets hit',
    dexterity_thick_contours: 'targets hit',
    line_segments: 'segments traced',
    triangles: 'correct answers',
    quadrilaterals: 'correct answers',
    complex_shapes: 'correct answers'
  };

  function getPlayerName() {
    let name = localStorage.getItem('playerName');
    if (!name) {
      name = prompt('Enter your name');
      if (!name) name = 'Player';
      localStorage.setItem('playerName', name);
    }
    return name;
  }

  function updateLeaderboard(key, score) {
    const name = getPlayerName();
    const storeKey = 'leaderboard_' + key;
    const data = JSON.parse(localStorage.getItem(storeKey)) || {};
    const current = data[name] || 0;
    if (score > current) {
      data[name] = score;
      localStorage.setItem(storeKey, JSON.stringify(data));
    }
  }

  function getHighScore(key) {
    const storeKey = 'leaderboard_' + key;
    const data = JSON.parse(localStorage.getItem(storeKey)) || {};
    const scores = Object.values(data);
    return scores.length ? Math.max(...scores) : 0;
  }

  function showLeaderboard(key, playerScore, formula) {
    const storeKey = 'leaderboard_' + key;
    const data = JSON.parse(localStorage.getItem(storeKey)) || {};
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

    const overlay = document.createElement('div');
    overlay.className = 'leaderboard-overlay';

    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width * 0.9;
      const height = rect.height * 0.9;
      overlay.style.position = 'absolute';
      overlay.style.width = width + 'px';
      overlay.style.height = height + 'px';
      overlay.style.top = rect.top + window.scrollY + (rect.height - height) / 2 + 'px';
      overlay.style.left = rect.left + window.scrollX + (rect.width - width) / 2 + 'px';
    }

    const title = document.createElement('h2');
    title.textContent = 'Leaderboard';
    overlay.appendChild(title);

    if (formula) {
      const formulaEl = document.createElement('p');
      formulaEl.className = 'leaderboard-formula';
      formulaEl.textContent = `Score = ${formula}`;
      overlay.appendChild(formulaEl);
    }

    if (typeof playerScore === 'number') {
      const scoreEl = document.createElement('p');
      scoreEl.className = 'leaderboard-score';
      overlay.appendChild(scoreEl);
      const duration = 1000;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value = Math.floor(progress * playerScore);
        scoreEl.textContent = `Score: ${value}`;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    const list = document.createElement('div');
    list.className = 'leaderboard-list';

    entries.forEach(([n, s], i) => {
      const p = document.createElement('p');
      p.className = 'leaderboard-entry';
      p.textContent = `${i + 1}. ${n} - ${s}`;
      list.appendChild(p);
    });

    overlay.appendChild(list);

    const buttons = document.createElement('div');
    buttons.className = 'leaderboard-buttons';

    const retry = document.createElement('button');
    retry.textContent = 'Retry';
    retry.addEventListener('click', () => location.reload());

    const back = document.createElement('button');
    back.textContent = 'Back to drills';
    back.addEventListener('click', () => {
      window.location.href = 'drills.html';
    });

    buttons.appendChild(retry);
    buttons.appendChild(back);
    overlay.appendChild(buttons);

    document.body.appendChild(overlay);
  }

  function handleScore(key, score, formula) {
    const f =
      formula ||
      DEFAULT_FORMULAS[key] ||
      (key.startsWith('angles_') ? 'correct answers' : '');
    updateLeaderboard(key, score);
    showLeaderboard(key, score, f);
  }

  window.leaderboard = { handleScore, updateLeaderboard, showLeaderboard, getHighScore };

  document.addEventListener('DOMContentLoaded', () => {
    const resultEl = document.querySelector('.score');
    if (!resultEl) return;
    const canvas = document.querySelector('canvas[data-score-key]');
    const key = canvas ? canvas.dataset.scoreKey : 'default';
    const formula = canvas && canvas.dataset.scoreFormula
      ? canvas.dataset.scoreFormula
      : undefined;
    const observer = new MutationObserver(() => {
      const m = resultEl.textContent.match(/Score:\s*(\d+)/);
      if (m) {
        const score = parseInt(m[1], 10);
        handleScore(key, score, formula);
        observer.disconnect();
      }
    });
    observer.observe(resultEl, { childList: true });
  });
})();
