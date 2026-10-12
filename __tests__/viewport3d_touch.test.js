/** @jest-environment jsdom */
import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function pointer(canvas, type, id, x, y) {
  const event = new Event(type, {bubbles: true, cancelable: true});
  Object.assign(event, {pointerId: id, pointerType: 'touch', clientX: x, clientY: y, pageX: x, pageY: y, button: 0});
  canvas.dispatchEvent(event);
}

test('one-finger drag orbits and two-finger pinch zooms the reference', () => {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  Object.defineProperties(canvas, {clientWidth: {value: 500}, clientHeight: {value: 500}});
  canvas.setPointerCapture = () => {};
  canvas.releasePointerCapture = () => {};
  const camera = new PerspectiveCamera(40, 1, 0.01, 100);
  camera.position.set(0, 0, 5);
  const controls = new OrbitControls(camera, canvas);
  const before = camera.position.clone();
  pointer(canvas, 'pointerdown', 1, 200, 200);
  pointer(canvas, 'pointermove', 1, 300, 250);
  pointer(canvas, 'pointerup', 1, 300, 250);
  expect(camera.position.distanceTo(before)).toBeGreaterThan(0.5);
  const distance = camera.position.distanceTo(controls.target);
  pointer(canvas, 'pointerdown', 1, 200, 200);
  pointer(canvas, 'pointerdown', 2, 300, 200);
  pointer(canvas, 'pointermove', 2, 350, 200);
  expect(camera.position.distanceTo(controls.target)).toBeLessThan(distance);
  pointer(canvas, 'pointerup', 1, 200, 200);
  pointer(canvas, 'pointerup', 2, 350, 200);
  expect(controls.target).toBeInstanceOf(Vector3);
  controls.dispose();
});
