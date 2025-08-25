/** @jest-environment jsdom */

import { jest } from '@jest/globals';

const modulePath = '../point_drill_05.js';

describe('point drill overlay canvas', () => {
  test('overlay is transparent', async () => {
    jest.resetModules();
    document.body.innerHTML = `
      <button id="startBtn"></button>
      <canvas id="gameCanvas" width="500" height="500"></canvas>
      <p id="result"></p>
    `;
    class StubAudioContext {}
    window.AudioContext = StubAudioContext;
    window.webkitAudioContext = StubAudioContext;
    HTMLCanvasElement.prototype.getContext = () => ({
      canvas: { width: 0, height: 0 }
    });
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    await import(`${modulePath}?test=${Date.now()}`);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const canvases = document.querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);
    const feedbackCanvas = canvases[1];
    expect(feedbackCanvas.style.background).toBe('transparent');
  });
});
