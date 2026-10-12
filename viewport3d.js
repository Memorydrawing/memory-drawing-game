import { WebGLRenderer, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight,
  Mesh, BoxGeometry, SRGBColorSpace, ACESFilmicToneMapping } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { disposeModel, normalizeModel, neutralMaterial, fitView, loadModel } from './viewport3d_model.js';


function initViewport() {
  const canvas = document.getElementById('modelCanvas');
  const status = document.getElementById('modelStatus');
  const upload = document.getElementById('uploadModelBtn');
  const input = document.getElementById('modelFile');
  const reset = document.getElementById('resetViewBtn');
  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.dataset.error = String(error);
  };
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch {
    setStatus('3D rendering is unavailable. Try a browser with WebGL 2 enabled.', true);
    upload.disabled = true;
    reset.disabled = true;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  scene.background = new Color(0xffffff);
  const camera = new PerspectiveCamera(40, 1, 0.01, 100);
  scene.add(new HemisphereLight(0xffffff, 0x777777, 2));
  const key = new DirectionalLight(0xffffff, 3);
  key.position.set(3, 4, 5);
  scene.add(key);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  let model = normalizeModel(new Mesh(new BoxGeometry(1, 1, 1), neutralMaterial()));
  scene.add(model);
  let pendingFrame = 0;
  function requestRender() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      controls.update();
      renderer.render(scene, camera);
    });
  }
  controls.addEventListener('change', requestRender);
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  fitView(camera, controls, model);
  requestRender();
  setStatus('Sample cube — upload a model to begin.');
  upload.addEventListener('click', () => input.click());
  reset.addEventListener('click', () => {
    fitView(camera, controls, model);
    requestRender();
  });
  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (!files.length) return;
    upload.disabled = true;
    setStatus('Loading model…');
    try {
      const result = await loadModel(files);
      const previous = model;
      model = result.model;
      scene.remove(previous);
      scene.add(model);
      disposeModel(previous);
      fitView(camera, controls, model);
      setStatus(result.name);
      requestRender();
    } catch (error) {
      setStatus('Could not load model. ' + error.message, true);
    } finally {
      input.value = '';
      upload.disabled = false;
    }
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
