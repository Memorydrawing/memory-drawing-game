import { calculateScore } from '../src/scoring.js';

describe('calculateScore', () => {
  test('rewards completing more tasks at same accuracy and speed', () => {
    const one = calculateScore({ green: 1, yellow: 0, red: 0 }, 1000);
    const many = calculateScore({ green: 5, yellow: 0, red: 0 }, 5000);
    expect(many.score).toBeGreaterThan(one.score);
  });

  test('yellow grades do not increase score', () => {
    const withYellow = calculateScore({ green: 1, yellow: 1, red: 0 }, 1000);
    const withoutYellow = calculateScore({ green: 1, yellow: 0, red: 0 }, 1000);
    expect(withYellow.score).toBeLessThanOrEqual(withoutYellow.score);
  });
});
