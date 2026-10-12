/** @jest-environment jsdom */
import {readFileSync} from 'node:fs';
import {jest} from '@jest/globals';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
jest.unstable_mockModule('fflate', () => require('fflate'));
const {initQuickSketch} = await import('../quick_sketch.js');

let app;
beforeEach(() => {
  document.body.innerHTML = readFileSync(new URL('../quick_sketch.html', import.meta.url), 'utf8');
  app = initQuickSketch();
});
const get = id => document.getElementById(id);
const submit = () => get('quickSketchSetup').dispatchEvent(new Event('submit', {cancelable: true}));
const chooseUpload = () => { get('sketchReference').value = 'upload'; get('sketchReference').dispatchEvent(new Event('change')); };
const upload = async files => {
  Object.defineProperty(get('sketchFiles'), 'files', {configurable: true, value: files});
  get('sketchFiles').dispatchEvent(new Event('change'));
  await new Promise(resolve => setTimeout(resolve, 0));
};
test('Start retains settings and opens active placeholder; editing preserves values', () => {
  get('sketchTime').value = '120'; get('sketchIntervals').value = '15'; submit();
  expect(app.getSession()).toMatchObject({time: 120, intervals: 15, reference: 'basic-forms'});
  expect(get('quickSketchSetup').hidden).toBe(true);
  expect(get('quickSketchActive').hidden).toBe(false);
  expect(get('activeStep').getAttribute('aria-current')).toBe('step');
  get('sketchEditSetup').click();
  expect(get('quickSketchSetup').hidden).toBe(false);
  expect(get('sketchTime').value).toBe('120');
});
test('invalid timing cannot advance', () => {
  get('sketchTime').value = '0'; submit();
  expect(app.getSession()).toBeNull(); expect(get('quickSketchActive').hidden).toBe(true);
});
test('upload requires a model and preserves companions and selected model into active phase', async () => {
  chooseUpload(); expect(get('sketchStart').disabled).toBe(true);
  const files = [new File(['mesh'], 'head.obj'), new File(['mesh'], 'body.gltf'), new File(['data'], 'body.bin')];
  await upload(files);
  expect(get('sketchStart').disabled).toBe(false); expect(get('sketchModel').hidden).toBe(false);
  get('sketchModel').value = '1'; submit();
  expect(app.getSession().model).toBe(files[1]); expect(app.getSession().files).toEqual(files);
  get('sketchEditSetup').click(); expect(get('sketchModel').value).toBe('1');
});
test('unsupported upload reports an error and prevents Start', async () => {
  chooseUpload(); await upload([new File(['hello'], 'notes.txt')]);
  expect(get('sketchReferenceStatus').dataset.error).toBe('true'); expect(get('sketchStart').disabled).toBe(true);
  submit(); expect(app.getSession()).toBeNull();
});
test('future references are disabled and experimental navigation uses a native form', () => {
  expect(get('sketchReference').querySelector('option[value=bargue]').disabled).toBe(true);
  document.body.innerHTML = readFileSync(new URL('../experimental.html', import.meta.url), 'utf8');
  expect(get('quickSketchBtn').form.getAttribute('action')).toBe('quick_sketch.html');
});
