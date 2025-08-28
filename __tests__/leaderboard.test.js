/** @jest-environment jsdom */

  describe('leaderboard display', () => {
    test('shows score, stats, and formula when provided', async () => {
      document.body.innerHTML = '<canvas></canvas>';
      window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
      await import('../leaderboard.js');
      window.leaderboard.showLeaderboard('test', 50, 'a + b', 75.5, 1.23);
      const stats = document.querySelector('.leaderboard-stats');
      expect(stats).not.toBeNull();
      expect(stats.textContent).toBe('Accuracy: 75.5% | Speed: 1.23/s');
      const formula = document.querySelector('.leaderboard-formula');
      expect(formula).not.toBeNull();
      expect(formula.textContent).toBe('Score = a + b');
    });

    test('uses default formula for known key and shows stats', async () => {
      document.body.innerHTML = '<canvas data-score-key="point_drill_05"></canvas><p class="score"></p>';
      window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
      await import('../leaderboard.js');
      localStorage.setItem('playerName', 'Tester');
      window.leaderboard.handleScore('point_drill_05', 80, undefined, 80, 2);
      const stats = document.querySelector('.leaderboard-stats');
      expect(stats).not.toBeNull();
      expect(stats.textContent).toBe('Accuracy: 80.0% | Speed: 2.00/s');
      const formula = document.querySelector('.leaderboard-formula');
      expect(formula).not.toBeNull();
      expect(formula.textContent).toBe('Score = accuracy * 1000 + speed * 100');
    });
  });

