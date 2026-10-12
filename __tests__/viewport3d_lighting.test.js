/** @jest-environment jsdom */
import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { Vector3, Quaternion, PerspectiveCamera, DirectionalLight } from 'three';
import { rollLight, createLightingControls } from '../viewport3d_lighting.js';

const closeTo = (actual, expected) => expect(actual.distanceTo(new Vector3(...expected))).toBeLessThan(1e-6);

test('continued vertical swipes reach top, back, bottom, then front without a pole clamp', () => {
  const camera = new Quaternion();
  let light = new Vector3(0, 0, 1);
  for (const expected of [[0,1,0], [0,0,-1], [0,-1,0], [0,0,1]]) {
    light = rollLight(light, camera, 0, -56, 112);
    closeTo(light, expected);
  }
  closeTo(rollLight(new Vector3(0,0,1), camera, 0, 56, 112), [0,-1,0]);
});

test('horizontal swipes reach either side and a full turn returns to front', () => {
  const front = new Vector3(0,0,1), camera = new Quaternion();
  closeTo(rollLight(front, camera, 56, 0, 112), [1,0,0]);
  closeTo(rollLight(front, camera, -56, 0, 112), [-1,0,0]);
  closeTo(rollLight(front, camera, 224, 0, 112), [0,0,1]);
});

test('light movement follows the current view axes when the camera is rotated', () => {
  const rotation = new Quaternion().setFromAxisAngle(new Vector3(0,1,0), Math.PI / 2);
  const front = new Vector3(0,0,1).applyQuaternion(rotation);
  const top = rollLight(front, rotation, 0, -56, 112);
  closeTo(top.clone().applyQuaternion(rotation.clone().invert()), [0,1,0]);
  expect(top.length()).toBeCloseTo(1);
});

test('thumb drag, pointer cancellation, color, brightness, and reset update the light', () => {
  document.body.innerHTML = readFileSync(new URL('../viewport3d.html', import.meta.url), 'utf8');
  const ball = document.getElementById('lightBall');
  ball.getContext = () => null;
  ball.setPointerCapture = jest.fn();
  ball.hasPointerCapture = () => true;
  ball.releasePointerCapture = jest.fn();
  const color = document.getElementById('lightColor'), brightness = document.getElementById('lightBrightness');
  const reset = document.getElementById('resetLightBtn');
  const light = new DirectionalLight();
  const camera = new PerspectiveCamera();
  const requestRender = jest.fn();
  const controller = createLightingControls({ball, color, brightness, reset, camera, light, requestRender,
    directionLabel: document.getElementById('lightDirection'), brightnessValue: document.getElementById('lightBrightnessValue')});
  function pointer(type, x, y) {
    const event = new Event(type, {cancelable: true});
    Object.assign(event, {pointerId: 1, pointerType: 'touch', clientX: x, clientY: y});
    ball.dispatchEvent(event);
  }
  const before = controller.getDirection();
  pointer('pointerdown', 50, 50); pointer('pointermove', 50, 20);
  expect(controller.getDirection().distanceTo(before)).toBeGreaterThan(0.5);
  expect(ball.setPointerCapture).toHaveBeenCalledWith(1);
  pointer('pointercancel', 50, 20);
  const cancelled = controller.getDirection();
  pointer('pointermove', 70, 70);
  closeTo(controller.getDirection(), cancelled.toArray());
  color.value = '#ff0000'; color.dispatchEvent(new Event('input'));
  expect(light.color.getHexString()).toBe('ff0000');
  brightness.value = '0'; brightness.dispatchEvent(new Event('input'));
  expect(light.intensity).toBe(0);
  brightness.value = '200'; brightness.dispatchEvent(new Event('input'));
  expect(light.intensity).toBe(6);
  controller.draw();
  expect(ball.getAttribute('aria-label')).toContain('Light direction sphere:');
  reset.click();
  expect(color.value).toBe('#ffffff');
  expect(brightness.value).toBe('100');
  expect(light.intensity).toBe(3);
  closeTo(controller.getDirection(), before.toArray());
  expect(requestRender).toHaveBeenCalled();
});

test('Randomize Lighting changes direction, color, and brightness and updates the controls', () => {
  document.body.innerHTML = readFileSync(new URL('../viewport3d.html', import.meta.url), 'utf8');
  const el = id => document.getElementById(id);
  el('lightBall').getContext = () => null;
  const light = new DirectionalLight();
  const controller = createLightingControls({ball:el('lightBall'),color:el('lightColor'),brightness:el('lightBrightness'),
    brightnessValue:el('lightBrightnessValue'),directionLabel:el('lightDirection'),reset:el('resetLightBtn'),
    randomize:el('randomLightBtn'),camera:new PerspectiveCamera(),light,requestRender:jest.fn()});
  const before = controller.getDirection();
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.25);
  try {
    el('randomLightBtn').click();
    expect(controller.getDirection().distanceTo(before)).toBeGreaterThan(0.1);
    expect(controller.getDirection().length()).toBeCloseTo(1);
    expect(el('lightColor').value).not.toBe('#ffffff');
    expect('#' + light.color.getHexString()).toBe(el('lightColor').value);
    expect(+el('lightBrightness').value).toBeGreaterThanOrEqual(30);
    expect(+el('lightBrightness').value).toBeLessThanOrEqual(200);
    expect(light.intensity).toBeCloseTo(+el('lightBrightness').value * 0.03);
    expect(el('lightBrightnessValue').textContent).toBe(el('lightBrightness').value + '%');
  } finally {random.mockRestore();}
});
