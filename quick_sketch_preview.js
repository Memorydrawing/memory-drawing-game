import {WebGLRenderer, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight, Mesh, BoxGeometry} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadModel, normalizeModel, neutralMaterial, fitView, disposeModel} from './viewport3d_model.js';

export function createSketchPreview(canvas) {
  const renderer = new WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new Scene(); scene.background = new Color(0xffffff);
  scene.add(new HemisphereLight(0xffffff, 0x777777, 0.35));
  const light = new DirectionalLight(0xffffff, 3); light.position.set(3, 4, 5); scene.add(light);
  const camera = new PerspectiveCamera(40, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  let model = null, revision = 0, frame = 0, disposed = false;
  function draw() {
    if (frame || disposed) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
  }
  controls.addEventListener('change', draw);
  const observer = new ResizeObserver(draw); observer.observe(canvas);
  return {
    async show(entry) {
      const request = ++revision;
      if (model) {scene.remove(model); disposeModel(model); model = null;}
      draw();
      const next = entry ? (await loadModel(entry.files, entry.model)).model : normalizeModel(new Mesh(new BoxGeometry(1, 1, 1), neutralMaterial()));
      if (disposed || request !== revision) {disposeModel(next); return;}
      next.traverse(object => {if (object.isLight) object.visible = false;});
      model = next; scene.add(model); fitView(camera, controls, model); draw();
    },
    clear() { ++revision; if (model) {scene.remove(model); disposeModel(model); model = null;} draw(); },
    dispose() { disposed = true; ++revision; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); if (model) disposeModel(model); renderer.dispose(); }
  };
}
