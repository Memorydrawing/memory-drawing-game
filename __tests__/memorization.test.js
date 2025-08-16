/** @jest-environment jsdom */
import { scenarioUrls } from '../scenarios.js';

describe('memorization page', () => {
  test('lists built-in scenarios when DOM already loaded', async () => {
    document.body.innerHTML = `
      <div id="exerciseList" class="exercise-list">
        <div class="exercise-item" data-link="shape_trainer.html">
          <img class="exercise-gif" alt="" />
          <div class="exercise-info">
            <h3>Shape Trainer</h3>
            <p>Train with custom shapes and settings.</p>
          </div>
        </div>
      </div>
    `;

    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    await import('../memorization.js');

    const items = Array.from(document.querySelectorAll('.exercise-item[data-link] h3'))
      .map(el => el.textContent);
    expect(items).toEqual(['Shape Trainer', ...Object.keys(scenarioUrls)]);
  });
});
