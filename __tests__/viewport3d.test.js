/** @jest-environment node */
import { jest } from '@jest/globals';
import { Box3, Vector3, Group, Mesh, BoxGeometry, PerspectiveCamera, BufferGeometry } from 'three';
import { loadModel, normalizeModel, neutralMaterial, fitView, disposeModel, randomizeModel, applyLens } from '../viewport3d_model.js';

const obj = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
const textFile = (name, content) => ({name, text: async () => content});
function glbFile() {
  const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const json = JSON.stringify({asset: {version: '2.0'}, buffers: [{byteLength: 36}],
    bufferViews: [{buffer: 0, byteLength: 36}],
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0,0,0], max: [1,1,0]}],
    meshes: [{primitives: [{attributes: {POSITION: 0}}]}], nodes: [{mesh: 0}], scenes: [{nodes: [0]}], scene: 0});
  const encoded = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4));
  const buffer = new ArrayBuffer(12 + 8 + encoded.length + 8 + vertices.byteLength);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, encoded.length, true); view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, encoded.length).set(encoded);
  const offset = 20 + encoded.length;
  view.setUint32(offset, vertices.byteLength, true); view.setUint32(offset + 4, 0x004e4942, true);
  new Uint8Array(buffer, offset + 8).set(new Uint8Array(vertices.buffer));
  return {name: 'triangle.glb', arrayBuffer: async () => buffer};
}

test('uploaded OBJ geometry is centered, scaled, and gets a neutral material', async () => {
  const {model, name} = await loadModel([textFile('triangle.obj', obj)]);
  const bounds = new Box3().setFromObject(model);
  expect(name).toBe('triangle.obj');
  expect(bounds.getCenter(new Vector3()).length()).toBeLessThan(1e-6);
  expect(bounds.getSize(new Vector3()).x).toBeCloseTo(2);
  disposeModel(model);
});

test('ASCII STL import produces visible geometry', async () => {
  const stl = 'solid test\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test';
  const buffer = new TextEncoder().encode(stl).buffer;
  const {model} = await loadModel([{name: 'triangle.stl', arrayBuffer: async () => buffer}]);
  expect(new Box3().setFromObject(model).isEmpty()).toBe(false);
  disposeModel(model);
});

test('binary GLB imports without remote resources and cleans up object URLs', async () => {
  const create = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  const revoke = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const {model} = await loadModel([glbFile()]);
  expect(new Box3().setFromObject(model).getSize(new Vector3()).x).toBeCloseTo(2);
  expect(revoke).toHaveBeenCalledWith('blob:test');
  disposeModel(model); create.mockRestore(); revoke.mockRestore();
});

test('rejects an empty model and ambiguous selection', async () => {
  await expect(loadModel([textFile('empty.obj', '')])).rejects.toThrow('visible 3D geometry');
  await expect(loadModel([textFile('a.obj', obj), textFile('b.obj', obj)])).rejects.toThrow('Select one');
  expect(() => normalizeModel(new Group())).toThrow('visible 3D geometry');
  expect(() => normalizeModel(new Mesh(new BufferGeometry(), neutralMaterial()))).toThrow();
});

test('camera fitting centers translated models and keeps every corner in view', () => {
  const mesh = new Mesh(new BoxGeometry(10, 2, 4), neutralMaterial());
  mesh.position.set(100, -50, 25);
  const model = normalizeModel(mesh);
  const camera = new PerspectiveCamera(40, 0.5, 0.01, 100);
  const controls = {target: new Vector3(), update() {camera.lookAt(this.target); camera.updateMatrixWorld();}, saveState: jest.fn()};
  fitView(camera, controls, model);
  const bounds = new Box3().setFromObject(model);
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new Vector3(x, y, z).project(camera);
    expect(Math.abs(point.x)).toBeLessThan(1);
    expect(Math.abs(point.y)).toBeLessThan(1);
    expect(Math.abs(point.z)).toBeLessThan(1);
  }
  expect(controls.target.length()).toBeCloseTo(0);
  expect(controls.saveState).toHaveBeenCalled();
  disposeModel(model);
});

test('random positioning rotates an imported model and keeps it in frame', () => {
  const model = normalizeModel(new Mesh(new BoxGeometry(2, 10, 3), neutralMaterial()));
  const original = model.quaternion.clone();
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.37);
  try {
    randomizeModel(model);
    expect(model.quaternion.angleTo(original)).toBeGreaterThan(0.1);
    expect(model.quaternion.length()).toBeCloseTo(1);
    const camera = new PerspectiveCamera(40, 1, 0.01, 100);
    const controls = {target: new Vector3(), update() {camera.lookAt(this.target);camera.updateMatrixWorld();}, saveState() {}};
    fitView(camera, controls, model);
    const bounds = new Box3().setFromObject(model, true);
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const point = new Vector3(x,y,z).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(1);
      expect(Math.abs(point.y)).toBeLessThan(1);
    }
  } finally {random.mockRestore();disposeModel(model);}
});

test('lens presets change field of view and camera distance while preserving viewing direction', () => {
  const model = normalizeModel(new Mesh(new BoxGeometry(1,2,1), neutralMaterial()));
  const camera = new PerspectiveCamera(40,1,0.01,100);
  camera.position.set(0,0,5);
  const controls = {target:new Vector3(), update() {camera.lookAt(this.target);camera.updateMatrixWorld();}, saveState() {}};
  const measurements = [];
  for (const focal of [15,24,35,50,85,135]) {
    applyLens(camera,focal);
    fitView(camera,controls,model,true);
    expect(camera.getFocalLength()).toBeCloseTo(focal);
    expect(camera.position.clone().sub(controls.target).normalize().dot(new Vector3(0,0,1))).toBeCloseTo(1);
    // Compare projected widths of equal-sized details at the front and back.
    const front = new Vector3(0.25,0,0.5).project(camera).x;
    const back = new Vector3(0.25,0,-0.5).project(camera).x;
    measurements.push({fov:camera.fov,distance:camera.position.length(),depthRatio:front/back});
  }
  for (let i=1;i<measurements.length;i++) {
    expect(measurements[i].fov).toBeLessThan(measurements[i-1].fov);
    expect(measurements[i].distance).toBeGreaterThan(measurements[i-1].distance);
    expect(measurements[i].depthRatio).toBeLessThan(measurements[i-1].depthRatio);
  }
  expect(camera.filmGauge).toBe(24);
  disposeModel(model);
});
