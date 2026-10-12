import {WebGLRenderer, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight, Mesh, BoxGeometry, Vector3} from 'three';
import {loadModel, normalizeModel, neutralMaterial, fitView, randomizeModel, disposeModel} from './viewport3d_model.js';
import {createContourRenderer} from './viewport3d_contours.js';
import {referenceExtrema} from './quick_sketch_landmarks.js';
import {STUDY_SIZE, rasterMatcher, vectorMatcher} from './quick_sketch_grading.js';

const p = (x, y) => ({x, y});
export const VECTOR_STUDIES = [
  {name: 'Triangle study', paths: [[p(250, 80), p(410, 390), p(90, 390), p(250, 80)]]},
  {name: 'Diamond study', paths: [[p(250, 70), p(420, 250), p(250, 430), p(80, 250), p(250, 70)]]},
  {name: 'Block study', paths: [[p(120, 130), p(360, 130), p(360, 370), p(120, 370), p(120, 130)], [p(120, 130), p(220, 70), p(430, 70), p(360, 130)], [p(430, 70), p(430, 310), p(360, 370)]]}
];
export function pickPlate(plates, previous, random = Math.random) {
  const pool = plates.length > 1 ? plates.filter(plate => plate !== previous) : plates;
  if (!pool.length) throw new Error('This reference collection has no plates.');
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
function canvas() {const element = document.createElement('canvas'); element.width = element.height = STUDY_SIZE; return element;}
function snapshot(source) {const result = canvas(); result.getContext('2d').drawImage(source, 0, 0, STUDY_SIZE, STUDY_SIZE); return result;}
export async function createSessionReference(session) {
  const plates = session.plates || (session.reference === 'vector-studies' ? VECTOR_STUDIES : null);
  if (plates) {
    let previous;
    return {
      async next() {
        const plate = pickPlate(plates, previous); previous = plate;
        const image = canvas(), ctx = image.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, STUDY_SIZE, STUDY_SIZE);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        for (const path of plate.paths) {ctx.beginPath(); path.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke();}
        return {image, lines: image, points: referenceExtrema(ctx.getImageData(0, 0, STUDY_SIZE, STUDY_SIZE)), matches: vectorMatcher(plate.paths), name: plate.name};
      }, dispose() {}
    };
  }
  let renderer, contours, model;
  try {
    const surface = canvas(), lineSurface = canvas();
    renderer = new WebGLRenderer({canvas: surface, antialias: true, preserveDrawingBuffer: true}); renderer.setPixelRatio(1); renderer.setSize(STUDY_SIZE, STUDY_SIZE, false);
    const scene = new Scene(); scene.background = new Color('#fff'); scene.add(new HemisphereLight(0xffffff, 0x777777, .35));
    const light = new DirectionalLight(0xffffff, 3); light.position.set(3, 4, 5); scene.add(light, light.target);
    const camera = new PerspectiveCamera(40, 1, .01, 100);
    const controls = {target: new Vector3(), update: () => camera.lookAt(controls.target), saveState() {}};
    model = session.model ? (await loadModel(session.files, session.model)).model : normalizeModel(new Mesh(new BoxGeometry(1, 1, 1), neutralMaterial()));
    model.traverse(object => {if (object.isLight) object.visible = false;}); scene.add(model);
    contours = createContourRenderer(lineSurface, undefined, {pixelRatio: 1});
    return {
      async next() {
        randomizeModel(model); fitView(camera, controls, model); renderer.render(scene, camera);
        const image = snapshot(surface);
        contours.render(scene, camera, light, {size: STUDY_SIZE, shadowTone: false, planes: true, detail: 50});
        const lines = snapshot(lineSurface);
        const lineData = lines.getContext('2d').getImageData(0, 0, STUDY_SIZE, STUDY_SIZE);
        return {image, lines, points: referenceExtrema(lineData), matches: rasterMatcher(lineData), name: session.model?.name || 'Cube'};
      },
      dispose() {contours.dispose(); disposeModel(model); renderer.dispose();}
    };
  } catch (error) {contours?.dispose(); if (model) disposeModel(model); renderer?.dispose(); throw error;}
}
