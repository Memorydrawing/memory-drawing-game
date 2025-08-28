/** @jest-environment jsdom */

describe('leaderboard formula display', () => {
  test('shows score formula when provided', async () => {
    document.body.innerHTML = '<canvas></canvas>';
    window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
    await import('../leaderboard.js');
    window.leaderboard.showLeaderboard('test', 50, 'a + b');
    const formula = document.querySelector('.leaderboard-formula');
    expect(formula).not.toBeNull();
    expect(formula.textContent).toBe('Score = a + b');
  });

  test('uses default formula for known key', async () => {
    document.body.innerHTML = '<canvas data-score-key="point_drill_05"></canvas><p class="score"></p>';
    window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
    await import('../leaderboard.js');
    window.leaderboard.handleScore('point_drill_05', 80);
    const formula = document.querySelector('.leaderboard-formula');
    expect(formula).not.toBeNull();
    expect(formula.textContent).toBe('Score = accuracy * 1000 + speed * 100');
  });
});

