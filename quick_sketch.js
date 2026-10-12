import { prepareModelFiles, modelFiles, filePath } from './viewport3d_zip.js';

export function initQuickSketch(root = document) {
  const get = id => root.getElementById(id);
  const form = get('quickSketchSetup');
  if (!form) return;
  const reference = get('sketchReference'), status = get('sketchReferenceStatus');
  const start = get('sketchStart'), picker = get('sketchModel');
  let files = [], candidates = [], busy = false, revision = 0, session = null;
  function updateReference() {
    const uploaded = reference.value === 'upload';
    get('sketchUpload').hidden = !uploaded;
    start.disabled = busy || (uploaded && !candidates.length);
    status.dataset.error = 'false';
    status.textContent = uploaded ? (candidates.length ? `Ready: ${filePath(candidates[Number(picker.value) || 0])}` : 'Choose a 3D model to continue.') : 'Simple 3D forms for a quick study. More collections will be added later.';
  }
  reference.addEventListener('change', updateReference);
  picker.addEventListener('change', updateReference);
  get('sketchUploadBtn').addEventListener('click', () => get('sketchFiles').click());
  get('sketchFiles').addEventListener('change', async event => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    const request = ++revision;
    busy = true; start.disabled = true;
    status.dataset.error = 'false'; status.textContent = 'Preparing model files…';
    try {
      const prepared = await prepareModelFiles(selected);
      if (request !== revision) return;
      const found = modelFiles(prepared);
      if (!found.length) throw new Error('Choose a ZIP, GLB, glTF, OBJ, or STL model.');
      files = prepared; candidates = found;
      picker.replaceChildren(...found.map((file, index) => {
        const option = root.createElement('option'); option.value = index; option.textContent = filePath(file); return option;
      }));
      get('sketchModelLabel').hidden = picker.hidden = found.length < 2;
      busy = false; updateReference();
    } catch (error) {
      if (request !== revision) return;
      files = []; candidates = []; picker.replaceChildren();
      get('sketchModelLabel').hidden = picker.hidden = true;
      busy = false; updateReference();
      status.dataset.error = 'true'; status.textContent = error.message;
    } finally { if (request === revision) event.target.value = ''; }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity() || start.disabled) return;
    const time = Number(get('sketchTime').value), intervals = Number(get('sketchIntervals').value);
    if (!Number.isInteger(time) || time < 1 || time > 3600 || !Number.isInteger(intervals) || intervals < 1 || intervals > 1000) return;
    const uploaded = reference.value === 'upload';
    const model = uploaded ? candidates[Number(picker.value)] : null;
    if (uploaded && !model) return;
    session = {time, intervals, reference: reference.value, model, files: uploaded ? files.slice() : []};
    get('sketchSessionSummary').textContent = `${time} seconds per pose · ${intervals} pose changes · ${uploaded ? filePath(model) : 'Basic 3D forms'}`;
    form.hidden = true; get('quickSketchActive').hidden = false;
    get('setupStep').removeAttribute('aria-current'); get('activeStep').setAttribute('aria-current', 'step');
    get('activeTitle').focus();
  });
  get('sketchEditSetup').addEventListener('click', () => {
    get('quickSketchActive').hidden = true; form.hidden = false;
    get('activeStep').removeAttribute('aria-current'); get('setupStep').setAttribute('aria-current', 'step');
    get('sketchTime').focus();
  });
  updateReference();
  return {getSession: () => session};
}
initQuickSketch();
