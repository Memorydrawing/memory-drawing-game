/** @jest-environment jsdom */

describe('leaderboard display', () => {
  test('shows score and stats when provided', async () => {
    document.body.innerHTML = '<canvas></canvas>';
    window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
    await import('../leaderboard.js');
    window.leaderboard.showLeaderboard('test', 50, 75.5, 1.23);
    const stats = document.querySelector('.leaderboard-stats');
    expect(stats).not.toBeNull();
    expect(stats.textContent).toBe('Accuracy: 75.5% | Avg time per target: 0.81s');
    const formula = document.querySelector('.leaderboard-formula');
    expect(formula).toBeNull();
  });

  test('handleScore displays stats without formula', async () => {
    document.body.innerHTML = '<canvas data-score-key="point_drill_05"></canvas><p class="score"></p>';
    window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
    await import('../leaderboard.js');
    localStorage.setItem('playerName', 'Tester');
    window.leaderboard.handleScore('point_drill_05', 80, 80, 2);
    const stats = document.querySelector('.leaderboard-stats');
    expect(stats).not.toBeNull();
    expect(stats.textContent).toBe('Accuracy: 80.0% | Avg time per target: 0.50s');
    const formula = document.querySelector('.leaderboard-formula');
    expect(formula).toBeNull();
  });
});
