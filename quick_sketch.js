import {createSketchPreview} from './quick_sketch_preview.js';
import { prepareModelFiles, modelFiles, filePath } from './viewport3d_zip.js';

export function initQuickSketch(root = document, {previewFactory = createSketchPreview} = {}) {
  const get = id => root.getElementById(id);
  const form = get('quickSketchSetup');
  if (!form) return;
  const reference = get('sketchReference'), status = get('sketchReferenceStatus');
  const start = get('sketchStart');
  const entries = new Map();
  let nextId = 0, uploading = false, loading = false, previewError = false, revision = 0, session = null, preview = null;
  function selectedEntry() { return entries.get(reference.value); }
  function updateStart() { start.disabled = uploading || loading || previewError || reference.value === 'upload' || (selectedEntry()?.error ?? false); }
  async function updateReference() {
    const request = ++revision;
    const entry = selectedEntry();
    const showModel = reference.value === 'basic-forms' || !!entry;
    get('sketchUpload').hidden = reference.value !== 'upload' && !entry;
    get('sketchPreviewWrap').hidden = !showModel;
    status.dataset.error = 'false'; previewError = false;
    get('sketchUploadBtn').textContent = entry ? 'Add another model' : 'Choose model or ZIP';
    if (!showModel) {
      loading = false; preview?.clear(); updateStart();
      status.textContent = 'Choose a 3D model to continue.'; return;
    }
    loading = true; updateStart(); status.textContent = 'Loading preview…';
    try {
      if (!preview) preview = previewFactory(get('sketchPreview'));
      await preview.show(entry);
      if (request !== revision) return;
      if (entry) entry.error = false;
      status.textContent = entry ? `Ready: ${filePath(entry.model)}` : 'Cube ready for a quick study.';
    } catch (error) {
      if (request !== revision) return;
      previewError = true;
      if (entry) entry.error = true;
      status.dataset.error = 'true';
      status.textContent = error.message || 'The 3D preview could not be loaded.';
    } finally { if (request === revision) {loading = false; updateStart();} }
  }
  reference.addEventListener('change', updateReference);
  get('sketchUploadBtn').addEventListener('click', () => get('sketchFiles').click());
  get('sketchFiles').addEventListener('change', async event => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length || uploading) return;
    uploading = true; updateStart(); get('sketchUploadBtn').disabled = true;
    status.dataset.error = 'false'; status.textContent = 'Preparing model files…';
    try {
      const files = await prepareModelFiles(selected);
      const found = modelFiles(files);
      if (!found.length) throw new Error('Choose a ZIP, GLB, glTF, OBJ, or STL model.');
      let first;
      for (const model of found) {
        const id = `model:${++nextId}`;
        entries.set(id, {model, files});
        const option = root.createElement('option'); option.value = id; option.textContent = filePath(model);
        reference.insertBefore(option, reference.querySelector('option[value="upload"]'));
        first ??= id;
      }
      reference.value = first;
      await updateReference();
    } catch (error) {
      status.dataset.error = 'true'; status.textContent = error.message;
    } finally { uploading = false; get('sketchUploadBtn').disabled = false; event.target.value = ''; updateStart(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity() || start.disabled) return;
    const time = Number(get('sketchTime').value), intervals = Number(get('sketchIntervals').value);
    if (!Number.isInteger(time) || time < 1 || time > 3600 || !Number.isInteger(intervals) || intervals < 1 || intervals > 1000) return;
    const entry = selectedEntry();
    const model = entry?.model || null;
    session = {time, intervals, reference: reference.value, model, files: entry ? entry.files.slice() : []};
    get('sketchSessionSummary').textContent = `${time} seconds per pose · ${intervals} pose changes · ${model ? filePath(model) : 'Cube'}`;
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
  return {getSession: () => session, dispose: () => { ++revision; preview?.dispose(); }};
}
initQuickSketch();
