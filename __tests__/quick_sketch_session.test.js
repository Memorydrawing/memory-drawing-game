/** @jest-environment jsdom */
import {readFileSync} from 'node:fs';
import {jest} from '@jest/globals';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
jest.unstable_mockModule('fflate', () => require('fflate'));
const {createQuickSketchSession} = await import('../quick_sketch_session.js');
let ctx;
beforeEach(() => {
  jest.useFakeTimers();
  document.body.innerHTML = readFileSync(new URL('../quick_sketch.html', import.meta.url), 'utf8');
  Object.defineProperty(document, 'hidden', {configurable: true, value: false});
  ctx = {clearRect: jest.fn(), drawImage: jest.fn(), fillRect: jest.fn(), putImageData: jest.fn(), createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)})};
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,fixture');
  document.getElementById('sketchAttemptDialog').showModal = jest.fn();
});
afterEach(() => {jest.restoreAllMocks(); jest.useRealTimers();});
const flush = async () => {await Promise.resolve(); await Promise.resolve(); await Promise.resolve();};
function setup() {
  const data = new Uint8ClampedArray(500 * 500 * 4); data[3] = 255;
  const drawing = {setEnabled: jest.fn(), reset: jest.fn(), capture: () => ({data, width: 500, height: 500})};
  let pose = 0;
  const source = {next: jest.fn(async () => ({image: document.createElement('canvas'), lines: document.createElement('canvas'), matches: () => pose++ === 0, name: 'test reference'})), dispose: jest.fn()};
  const session = createQuickSketchSession(document, {drawingFactory: () => drawing, referenceFactory: async () => source,
    clockFactory: undefined});
  return {session, source, drawing};
}
test('active session saves attempts, averages their grades, and opens a colored overlay', async () => {
  const {session, source} = setup(); await session.start({time: 1, intervals: 2});
  expect(document.getElementById('sketchTimer').textContent).toBe('0:01');
  jest.advanceTimersByTime(1000); await flush();
  expect(source.next).toHaveBeenCalledTimes(2);
  jest.advanceTimersByTime(1000); await flush();
  expect(session.getAttempts().map(a => a.accuracy)).toEqual([100, 0]);
  expect(document.getElementById('quickSketchReview').hidden).toBe(false);
  expect(document.getElementById('sketchAverage').textContent).toContain('50.0%');
  const cards = document.querySelectorAll('.sketch-attempt'); expect(cards.length).toBe(2); cards[0].click();
  expect(document.getElementById('sketchAttemptDialog').showModal).toHaveBeenCalled();
  expect(document.getElementById('sketchAttemptImage').src).toBe(cards[0].querySelector('img').src);
  expect(document.getElementById('sketchAttemptImage').src).toBe(session.getAttempts()[0].contourOverlay);
  expect(document.getElementById('sketchOverlayMode')).toBeNull();
});
test('returning to setup cancels timers and preserves the setup inputs', async () => {
  const {session, drawing} = setup(); await session.start({time: 1, intervals: 2});
  document.getElementById('sketchEditSetup').click(); jest.advanceTimersByTime(3000); await flush();
  expect(session.getAttempts()).toHaveLength(0); expect(document.getElementById('quickSketchSetup').hidden).toBe(false);
  expect(drawing.setEnabled).toHaveBeenLastCalledWith(false);
});
