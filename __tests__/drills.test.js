/** @jest-environment jsdom */

import { jest } from '@jest/globals';

describe('drills page', () => {
  test('exercise items get click handlers even if DOM already loaded', async () => {
    document.body.innerHTML = `
      <div class="exercise-item" data-link="test.html">
        <div class="exercise-info"><h3>Test</h3></div>
      </div>
    `;
    const item = document.querySelector('.exercise-item');
    const spy = jest.spyOn(item, 'addEventListener');
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    await import('../drills.js');
    expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
  });
});
