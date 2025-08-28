/**
 * @jest-environment jsdom
 */
import { getCanvasPos, startCountdown } from '../src/utils.js';
import { jest } from '@jest/globals';

describe('getCanvasPos', () => {
  test('uses offset coordinates for mouse input', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    Object.defineProperty(canvas, 'clientWidth', { value: 100 });
    Object.defineProperty(canvas, 'clientHeight', { value: 100 });

    const e = { offsetX: 50, offsetY: 60, pointerType: 'mouse' };
    const pos = getCanvasPos(canvas, e);
    expect(pos).toEqual({ x: 100, y: 120 });
  });

  test('falls back to client coordinates for touch input', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 100 });

    const e = { clientX: 60, clientY: 70, offsetX: 0, offsetY: 0, pointerType: 'touch' };
    const pos = getCanvasPos(canvas, e);
    expect(pos).toEqual({ x: 100, y: 100 });
  });

  test('startCountdown updates element and calls callback', () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    const el = document.createElement('div');
    const cb = jest.fn();
    startCountdown(100, el, cb);
    expect(el.textContent).toBe('0.10');
    jest.advanceTimersByTime(50);
    expect(parseFloat(el.textContent)).toBeCloseTo(0.05, 2);
    jest.advanceTimersByTime(50);
    expect(el.textContent).toBe('0.00');
    expect(cb).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
