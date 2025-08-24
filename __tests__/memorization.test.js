/** @jest-environment jsdom */
import { scenarioData } from '../scenarios.js';

describe('memorization page', () => {
  test('lists built-in scenarios when DOM already loaded', async () => {
    document.body.innerHTML = `
      <div id="exerciseList" class="exercise-list"></div>
    `;

    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    await import('../memorization.js');

    const items = Array.from(document.querySelectorAll('.exercise-item[data-link]'))
      .map(item => ({
        title: item.querySelector('h3')?.textContent,
        desc: item.querySelector('p')?.textContent
      }));
    expect(items).toEqual(
      Object.entries(scenarioData).map(([name, data]) => ({
        title: name,
        desc: data.description
      }))
    );
  });
});
