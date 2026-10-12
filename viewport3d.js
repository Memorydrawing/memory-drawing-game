import { WebGLRenderer, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight,
  Mesh, BoxGeometry, SRGBColorSpace, ACESFilmicToneMapping } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { disposeModel, normalizeModel, neutralMaterial, fitView, loadModel } from './viewport3d_model.js';
import { prepareModelFiles, modelFiles, filePath } from './viewport3d_zip.js';
import { createLightingControls } from './viewport3d_lighting.js';
import { randomizeModel, applyLens } from './viewport3d_model.js';
import { bindContourStudySwitch } from './viewport3d_view.js';
import { createContourRenderer } from './viewport3d_contours.js';


function initViewport() {
  const canvas = document.getElementById('modelCanvas');
  const status = document.getElementById('modelStatus');
  const upload = document.getElementById('uploadModelBtn');
  const input = document.getElementById('modelFile');
  const reset = document.getElementById('resetViewBtn');
  const randomModel = document.getElementById('randomModelBtn');
  const lens = document.getElementById('cameraLens');
  const archiveSelect = document.getElementById('archiveModel');
  const archiveLabel = document.getElementById('archiveModelLabel');
  let preparedFiles = [];
  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.dataset.error = String(error);
    status.title = '';
  };
  document.getElementById('viewportHelpBtn').addEventListener('click', () => {
    document.getElementById('viewportHelp').showModal();
  });
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch {
    setStatus('3D rendering is unavailable. Try a browser with WebGL 2 enabled.', true);
    upload.disabled = true;
    reset.disabled = true;
    randomModel.disabled = true;
    lens.disabled = true;
    document.querySelector('.viewport3d-lighting').disabled = true;
    document.getElementById('contourStudyToggle').disabled = true;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  scene.background = new Color(0xffffff);
  const camera = new PerspectiveCamera(40, 1, 0.01, 100);
  applyLens(camera, lens.value);
  const backgroundColor = document.getElementById('backgroundColor');
  backgroundColor.addEventListener('input', () => {
    scene.background.set(backgroundColor.value);
    requestRender();
  });
  // Gentle fill preserves visibility while letting the controlled key light
  // produce a clear change in color and form.
  scene.add(new HemisphereLight(0xffffff, 0x777777, 0.35));
  const key = new DirectionalLight(0xffffff, 3);
  key.position.set(3, 4, 5);
  scene.add(key);
  scene.add(key.target);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  let model = normalizeModel(new Mesh(new BoxGeometry(1, 1, 1), neutralMaterial()));
  scene.add(model);
  let pendingFrame = 0;
  let lighting;
  let contour;
  function requestRender() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      controls.update();
      renderer.render(scene, camera);
      if (contour && document.getElementById('contourStudyToggle').checked) {
        try { contour.render(scene, camera, key, {
          planes: document.getElementById('lightPlaneLines')?.checked ?? true,
          detail: Number(document.getElementById('planeDetail')?.value ?? 50)
        }); }
        catch {
          document.getElementById('contourStatus').textContent = 'Line drawing interrupted — reload to recover';
        }
      }
      lighting?.draw();
    });
  }
  controls.addEventListener('change', requestRender);
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applyLens(camera, lens.value);
    requestRender();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  fitView(camera, controls, model);
  lighting = createLightingControls({
    ball: document.getElementById('lightBall'),
    color: document.getElementById('lightColor'),
    brightness: document.getElementById('lightBrightness'),
    brightnessValue: document.getElementById('lightBrightnessValue'),
    directionLabel: document.getElementById('lightDirection'),
    reset: document.getElementById('resetLightBtn'),
    randomize: document.getElementById('randomLightBtn'),
    camera, light: key, requestRender
  });
  const contourCanvas = document.getElementById('contourCanvas');
  const planeLines = document.getElementById('lightPlaneLines');
  const planeDetail = document.getElementById('planeDetail');
  planeLines.addEventListener('change', () => {
    planeDetail.disabled = !planeLines.checked;
    requestRender();
  });
  planeDetail.addEventListener('input', () => {
    document.getElementById('planeDetailValue').textContent = planeDetail.value + '%';
    requestRender();
  });
  document.getElementById('contourStudyToggle').checked = new URLSearchParams(location.search).get('contour') === '1';
  bindContourStudySwitch(document, enabled => {
    if (enabled && !contour) {
      try {
        contour = createContourRenderer(contourCanvas, restored => {
          document.getElementById('contourStatus').textContent = restored ? 'Line drawing' : 'Line drawing interrupted — reload to recover';
          if (restored) requestRender();
        });
        new ResizeObserver(requestRender).observe(contourCanvas);
      } catch {
        document.getElementById('contourStatus').textContent = 'Line drawing unavailable — WebGL 2 is required';
      }
    }
    resize();
    requestRender();
  });
  requestRender();
  setStatus('Sample cube — upload a model to begin.');
  upload.addEventListener('click', () => input.click());
  reset.addEventListener('click', () => {
    fitView(camera, controls, model);
    requestRender();
  });
  randomModel.addEventListener('click', () => {
    randomizeModel(model);
    fitView(camera, controls, model);
    requestRender();
  });
  lens.addEventListener('change', () => {
    applyLens(camera, lens.value);
    fitView(camera, controls, model, true);
    requestRender();
  });
  async function showModel(file) {
    upload.disabled = true;
    archiveSelect.disabled = true;
    setStatus('Loading model…');
    try {
      const result = await loadModel(preparedFiles, file);
      const previous = model;
      model = result.model;
      model.traverse(object => { if (object.isLight) object.visible = false; });
      scene.remove(previous);
      scene.add(model);
      disposeModel(previous);
      fitView(camera, controls, model);
      setStatus(result.name.split('/').pop());
      status.title = result.name;
      requestRender();
    } catch (error) {
      setStatus('Could not load model. ' + error.message, true);
    } finally {
      upload.disabled = false;
      archiveSelect.disabled = false;
    }
  }
  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (!files.length) return;
    upload.disabled = true;
    archiveSelect.disabled = true;
    archiveLabel.hidden = true;
    setStatus(/\.zip$/i.test(files[0].name) ? 'Unpacking ZIP…' : 'Loading model…');
    try {
      preparedFiles = await prepareModelFiles(files);
      const candidates = modelFiles(preparedFiles);
      if (candidates.length > 1) {
        archiveSelect.replaceChildren(new Option('Choose a model…', ''), ...candidates.map((file, index) => new Option(filePath(file), String(index))));
        archiveLabel.hidden = false;
        setStatus('Found ' + candidates.length + ' models. Choose one above.');
      } else {
        await showModel(candidates[0]);
      }
    } catch (error) {
      preparedFiles = [];
      setStatus('Could not load model. ' + error.message, true);
    } finally {
      input.value = '';
      upload.disabled = false;
      archiveSelect.disabled = false;
    }
  });
  archiveSelect.addEventListener('change', () => {
    if (archiveSelect.value !== '') showModel(modelFiles(preparedFiles)[Number(archiveSelect.value)]);
  });
  canvas.addEventListener('webglcontextlost', () => {
    setStatus('3D rendering was interrupted. Reload if the viewport does not recover.', true);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    setStatus('Viewport restored.');
    requestRender();
  });
}

// This file is bundled to a classic script so the experiment also opens from a local HTML file.
initViewport();
