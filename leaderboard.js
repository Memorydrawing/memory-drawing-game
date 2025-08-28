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

  function getHighScore(key) {
    const storeKey = 'leaderboard_' + key;
    const data = JSON.parse(localStorage.getItem(storeKey)) || {};
    const scores = Object.values(data);
    return scores.length ? Math.max(...scores) : 0;
  }

  function showLeaderboard(key, playerScore, accuracy, speed) {
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

    if (typeof accuracy === 'number' || typeof speed === 'number') {
      const statsEl = document.createElement('p');
      statsEl.className = 'leaderboard-stats';
      const parts = [];
      if (typeof accuracy === 'number') parts.push(`Accuracy: ${accuracy.toFixed(1)}%`);
      if (typeof speed === 'number') {
        const avgTime = speed > 0 ? 1 / speed : 0;
        parts.push(`Avg time per target: ${avgTime.toFixed(2)}s`);
      }
      statsEl.textContent = parts.join(' | ');
      overlay.appendChild(statsEl);
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

  function handleScore(key, score, accuracy, speed) {
    updateLeaderboard(key, score);
    showLeaderboard(key, score, accuracy, speed);
  }

  window.leaderboard = { handleScore, updateLeaderboard, showLeaderboard, getHighScore };

  document.addEventListener('DOMContentLoaded', () => {
    const resultEl = document.querySelector('.score');
    if (!resultEl) return;
    const canvas = document.querySelector('canvas[data-score-key]');
    const key = canvas ? canvas.dataset.scoreKey : 'default';
    const observer = new MutationObserver(() => {
      const m = resultEl.textContent.match(/Score:\s*(\d+)/);
      if (m) {
        const score = parseInt(m[1], 10);
        const accMatch = resultEl.textContent.match(/Accuracy:\s*(\d+(?:\.\d+)?)%/);
        const spdMatch = resultEl.textContent.match(/Speed:\s*(\d+(?:\.\d+)?)/);
        const accuracy = accMatch ? parseFloat(accMatch[1]) : undefined;
        const speed = spdMatch ? parseFloat(spdMatch[1]) : undefined;
        handleScore(key, score, accuracy, speed);
        observer.disconnect();
      }
    });
    observer.observe(resultEl, { childList: true });
  });
})();
