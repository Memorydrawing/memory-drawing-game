/** @jest-environment jsdom */
import { scenarioUrls, scenarioDescriptions } from '../scenarios.js';

describe('memorization page', () => {
  test('lists built-in scenarios when DOM already loaded', async () => {
    document.body.innerHTML = `
      <div id="exerciseList" class="exercise-list">
        <div class="exercise-item" data-link="shape_trainer.html" data-difficulty="Beginner">
          <div class="tag-container">
            <span class="category-label category-memorization">Memorization</span>
            <span class="difficulty-label difficulty-beginner">Beginner</span>
          </div>
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

    const items = Array.from(document.querySelectorAll('.exercise-item[data-link]'))
      .map(item => ({
        title: item.querySelector('h3')?.textContent,
        desc: item.querySelector('p')?.textContent
      }));
    expect(items).toEqual([
      { title: 'Shape Trainer', desc: 'Train with custom shapes and settings.' },
      ...Object.keys(scenarioUrls).map(name => ({
        title: name,
        desc: scenarioDescriptions[name]
      }))
    ]);
  });
});
