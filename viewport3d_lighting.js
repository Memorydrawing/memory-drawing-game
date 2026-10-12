import { Vector3, Color } from 'three';

const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);
const DEFAULT_DIRECTION = new Vector3(0.4, 0.65, 1).normalize();

// Rotate in the current view's axes, with no clamp at the poles. A swipe of
// half the sphere's width moves the light through a quarter turn.
export function rollLight(direction, cameraQuaternion, dx, dy, diameter) {
  const local = direction.clone().applyQuaternion(cameraQuaternion.clone().invert());
  const rate = Math.PI / Math.max(diameter, 1);
  local.applyAxisAngle(UP, dx * rate);
  local.applyAxisAngle(RIGHT, dy * rate);
  return local.applyQuaternion(cameraQuaternion).normalize();
}

export function describeLight(local) {
  const vertical = local.y > 0.6 ? 'Above' : local.y < -0.6 ? 'Below' : '';
  const horizontal = local.x > 0.6 ? 'Right' : local.x < -0.6 ? 'Left' : '';
  const depth = local.z > 0.3 ? 'Front' : local.z < -0.3 ? 'Back' : '';
  return [depth, vertical, horizontal].filter(Boolean).join(' / ') || 'Side';
}

export function createLightingControls({ball, color, brightness, brightnessValue, directionLabel, reset, randomize, camera, light, requestRender}) {
  let direction = new Vector3();
  let activePointer = null, lastX = 0, lastY = 0;
  const context = ball.getContext('2d');

  function updateLight() {
    light.position.copy(direction).multiplyScalar(7);
    light.color.set(color.value);
    light.intensity = Number(brightness.value) * 0.03;
    brightnessValue.textContent = brightness.value + '%';
    requestRender();
  }

  function draw() {
    const local = direction.clone().applyQuaternion(camera.quaternion.clone().invert());
    const description = describeLight(local);
    directionLabel.textContent = description;
    ball.setAttribute('aria-label', 'Light direction sphere: ' + description + '. Drag or use arrow keys to move the light.');
    if (!context) return;
    const size = ball.width, center = size / 2, radius = center - 5;
    const image = context.createImageData(size, size);
    const tint = [1, 3, 5].map(offset => parseInt(color.value.slice(offset, offset + 2), 16));
    const power = Math.min(light.intensity / 3, 1.5);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - center) / radius, ny = (center - y - 0.5) / radius;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const diffuse = Math.max(0, nx * local.x + ny * local.y + nz * local.z);
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) image.data[offset + c] = Math.min(255, 45 + diffuse * tint[c] * power * 0.75);
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    // Solid marker = light in front of the model; outlined marker = behind.
    const x = center + local.x * radius, y = center - local.y * radius;
    context.beginPath(); context.arc(x, y, 6, 0, Math.PI * 2);
    context.fillStyle = local.z >= 0 ? '#fff' : '#555';
    context.strokeStyle = '#222'; context.lineWidth = 2;
    context.fill(); context.stroke();
    if (local.z < 0) {
      context.beginPath(); context.arc(x, y, 3, 0, Math.PI * 2);
      context.strokeStyle = '#fff'; context.lineWidth = 1; context.stroke();
    }
  }

  function move(dx, dy) {
    direction.copy(rollLight(direction, camera.quaternion, dx, dy, ball.getBoundingClientRect().width || 112));
    updateLight();
  }
  function resetLight() {
    direction.copy(DEFAULT_DIRECTION).applyQuaternion(camera.quaternion).normalize();
    color.value = '#ffffff'; brightness.value = '100';
    updateLight();
  }
  function randomLight() {
    direction.randomDirection();
    color.value = '#' + new Color().setHSL(Math.random(), 0.25 + Math.random() * 0.5, 0.5 + Math.random() * 0.25).getHexString();
    brightness.value = String(30 + Math.floor(Math.random() * 171));
    updateLight();
  }
  function pointerDown(event) {
    if (activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    activePointer = event.pointerId; lastX = event.clientX; lastY = event.clientY;
    ball.setPointerCapture(event.pointerId);
    ball.focus({preventScroll: true});
  }
  function pointerMove(event) {
    if (event.pointerId !== activePointer) return;
    event.preventDefault();
    move(event.clientX - lastX, event.clientY - lastY);
    lastX = event.clientX; lastY = event.clientY;
  }
  function pointerEnd(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    if (ball.hasPointerCapture(event.pointerId)) ball.releasePointerCapture(event.pointerId);
  }
  function keyDown(event) {
    const delta = {ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8]}[event.key];
    if (!delta) return;
    event.preventDefault(); move(...delta);
  }
  ball.addEventListener('pointerdown', pointerDown);
  ball.addEventListener('pointermove', pointerMove);
  ball.addEventListener('pointerup', pointerEnd);
  ball.addEventListener('pointercancel', pointerEnd);
  ball.addEventListener('lostpointercapture', pointerEnd);
  ball.addEventListener('keydown', keyDown);
  color.addEventListener('input', updateLight);
  brightness.addEventListener('input', updateLight);
  reset.addEventListener('click', resetLight);
  randomize?.addEventListener('click', randomLight);
  resetLight();
  return {draw, getDirection: () => direction.clone()};
}
