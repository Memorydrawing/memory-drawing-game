/** @jest-environment jsdom */
import { scenarioUrls, getScenarioUrl } from '../scenarios.js';

describe('getScenarioUrl', () => {
  test.each(Object.entries(scenarioUrls))('maps %s to %s', (name, url) => {
    expect(getScenarioUrl(name)).toBe(url);
  });

  test('defaults to scenario_play.html with encoded name', () => {
    const name = 'My Custom Scenario';
    expect(getScenarioUrl(name)).toBe(`scenario_play.html?name=${encodeURIComponent(name)}`);
  });
});

