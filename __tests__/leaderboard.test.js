/** @jest-environment jsdom */

import { jest } from '@jest/globals';

describe('leaderboard display', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  test('shows score and stats when provided', async () => {
    document.body.innerHTML = '<canvas></canvas>';
    window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
    await import('../leaderboard.js');
    window.leaderboard.showLeaderboard('test', 50, 75.5, 1.23);
    const stats = document.querySelector('.leaderboard-stats');
    expect(stats).not.toBeNull();
    expect(stats.textContent).toBe('Accuracy: 75.5% | Avg time per target: 0.81s');
    const msg = document.querySelector('.leaderboard-new-high');
    expect(msg).toBeNull();
  });

  test('handleScore shows new high score message', async () => {
    document.body.innerHTML = '<canvas data-score-key="point_drill_05"></canvas><p class="score"></p>';
    window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
    await import('../leaderboard.js');
    localStorage.setItem('playerName', 'Tester');
    window.leaderboard.handleScore('point_drill_05', 80, 80, 2);
    const stats = document.querySelector('.leaderboard-stats');
    expect(stats).not.toBeNull();
    expect(stats.textContent).toBe('Accuracy: 80.0% | Avg time per target: 0.50s');
    const msg = document.querySelector('.leaderboard-new-high');
    expect(msg).not.toBeNull();
    expect(msg.textContent).toBe('New high score!');
  });

  test('no new high score message when not exceeded', async () => {
    document.body.innerHTML = '<canvas data-score-key="point_drill_05"></canvas><p class="score"></p>';
    window.requestAnimationFrame = cb => cb(Number.MAX_SAFE_INTEGER);
    await import('../leaderboard.js');
    localStorage.setItem('playerName', 'Tester');
    // set existing high score higher than current attempt
    localStorage.setItem('leaderboard_point_drill_05', JSON.stringify({ Tester: 200 }));
    window.leaderboard.handleScore('point_drill_05', 80, 80, 2);
    const msg = document.querySelector('.leaderboard-new-high');
    expect(msg).toBeNull();
  });
});
