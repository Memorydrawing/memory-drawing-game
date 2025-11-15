import { calculateScore } from '../src/scoring.js';

describe('calculateScore', () => {
  test('rewards completing more tasks at same accuracy and speed', () => {
    const one = calculateScore({ green: 1, red: 0 }, 1000);
    const many = calculateScore({ green: 5, red: 0 }, 5000);
    expect(many.score).toBeGreaterThan(one.score);
  });

  test('incorrect inputs lower the score', () => {
    const perfect = calculateScore({ green: 2, red: 0 }, 2000);
    const withMistakes = calculateScore({ green: 2, red: 2 }, 2000);
    expect(withMistakes.score).toBeLessThan(perfect.score);
  });
});
