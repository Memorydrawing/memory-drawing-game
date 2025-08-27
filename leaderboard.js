(function() {
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

  function showLeaderboard(key) {
    const storeKey = 'leaderboard_' + key;
    const data = JSON.parse(localStorage.getItem(storeKey)) || {};
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const overlay = document.createElement('div');
    overlay.className = 'leaderboard-overlay';
    const inner = document.createElement('div');
    inner.className = 'leaderboard';
    const title = document.createElement('h2');
    title.textContent = 'Leaderboard';
    inner.appendChild(title);
    entries.forEach(([n, s]) => {
      const p = document.createElement('p');
      p.textContent = `${n}: ${s}`;
      inner.appendChild(p);
    });
    const close = document.createElement('p');
    close.textContent = 'Click to close';
    close.className = 'leaderboard-close';
    inner.appendChild(close);
    overlay.appendChild(inner);
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function handleScore(key, score) {
    updateLeaderboard(key, score);
    showLeaderboard(key);
  }

  window.leaderboard = { handleScore };

  document.addEventListener('DOMContentLoaded', () => {
    const resultEl = document.querySelector('.score');
    if (!resultEl) return;
    const canvas = document.querySelector('canvas[data-score-key]');
    const key = canvas ? canvas.dataset.scoreKey : 'default';
    const observer = new MutationObserver(() => {
      const m = resultEl.textContent.match(/Score:\s*(\d+)/);
      if (m) {
        const score = parseInt(m[1], 10);
        handleScore(key, score);
        observer.disconnect();
      }
    });
    observer.observe(resultEl, { childList: true });
  });
})();
