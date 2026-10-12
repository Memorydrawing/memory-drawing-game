/** @jest-environment jsdom */
import {readFileSync} from 'node:fs';
import {bindContourStudySwitch} from '../viewport3d_view.js';
test('Contour Study switches layouts without resetting any viewer settings', () => {
  document.body.innerHTML = readFileSync(new URL('../viewport3d.html', import.meta.url), 'utf8');
  const toggle = document.getElementById('contourStudyToggle');
  const lens = document.getElementById('cameraLens'); lens.value = '85';
  const detail = document.getElementById('planeDetail'); detail.value = '72';
  const changes = []; bindContourStudySwitch(document, enabled => changes.push(enabled));
  expect(document.getElementById('contourCanvas').hidden).toBe(true);
  toggle.checked = true; toggle.dispatchEvent(new Event('change'));
  expect(document.getElementById('contourCanvas').hidden).toBe(false);
  expect(document.getElementById('contourOptions').hidden).toBe(false);
  expect(document.querySelectorAll('.viewport3d-reference')).toHaveLength(1);
  expect(document.getElementById('modelCanvas').hidden).toBe(false);
  expect(document.getElementById('modelCanvas').getAttribute('aria-label')).toContain('line drawing');
  expect(toggle.getAttribute('aria-label')).toBe('Lines');
  expect(document.querySelector('.viewport3d-screen').classList.contains('lines-view')).toBe(true);
  toggle.checked = false; toggle.dispatchEvent(new Event('change'));
  expect(document.getElementById('contourCanvas').hidden).toBe(true);
  expect(lens.value).toBe('85'); expect(detail.value).toBe('72'); expect(changes).toEqual([false,true,false]);
});
