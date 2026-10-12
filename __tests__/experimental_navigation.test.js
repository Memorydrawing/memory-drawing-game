/** @jest-environment jsdom */
import { readFileSync, existsSync } from 'node:fs';

test('3D Viewport navigates with native form submission without the menu script', () => {
  document.body.innerHTML = readFileSync(new URL('../experimental.html', import.meta.url), 'utf8');
  const button = document.getElementById('viewport3dBtn');
  let destination;
  button.form.addEventListener('submit', event => {
    event.preventDefault();
    destination = event.target.getAttribute('action');
  });
  button.click();
  expect(destination).toBe('viewport3d.html');
  expect(existsSync(new URL('../' + destination, import.meta.url))).toBe(true);
});
