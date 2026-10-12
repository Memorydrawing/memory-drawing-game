/** @jest-environment node */
import { zipSync, strToU8 } from 'fflate';
import { Box3, Vector3 } from 'three';
import { prepareModelFiles, modelFiles, filePath } from '../viewport3d_zip.js';
import { loadModel, disposeModel } from '../viewport3d_model.js';

const obj = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
function archive(contents) {
  const bytes = zipSync(Object.fromEntries(Object.entries(contents).map(([path, value]) => [path, typeof value === 'string' ? strToU8(value) : value])));
  return { name: 'download.zip', size: bytes.length, arrayBuffer: async () => bytes.buffer };
}

test('ZIP imports nested OBJ geometry and skips Mac metadata and unrelated files', async () => {
  const files = await prepareModelFiles([archive({'download/source/My Model.OBJ': obj, '__MACOSX/._dummy.obj': obj, 'readme.txt': 'notes'})]);
  expect(files).toHaveLength(1);
  expect(filePath(files[0])).toBe('download/source/My Model.OBJ');
  const {model, name} = await loadModel(files);
  expect(name).toBe('download/source/My Model.OBJ');
  expect(new Box3().setFromObject(model).getSize(new Vector3()).x).toBeCloseTo(2);
  disposeModel(model);
});

test('archive with multiple models supports choosing one without ambiguous imports', async () => {
  const files = await prepareModelFiles([archive({'a.obj': obj, 'nested/b.obj': obj})]);
  const candidates = modelFiles(files);
  expect(candidates).toHaveLength(2);
  await expect(loadModel(files)).rejects.toThrow('Select one');
  const {model, name} = await loadModel(files, candidates[1]);
  expect(name).toBe('nested/b.obj');
  disposeModel(model);
});

test('keeps nested glTF companion files available with their paths', async () => {
  const files = await prepareModelFiles([archive({'asset/scene.gltf': '{}', 'asset/scene.bin': 'bytes', 'asset/textures/skin.png': 'image', 'other/textures/skin.png': 'second image'})]);
  expect(files.map(filePath)).toEqual(['asset/scene.gltf', 'asset/scene.bin', 'asset/textures/skin.png', 'other/textures/skin.png']);
  expect(files[2].type).toBe('image/png');
});

test('loads a nested glTF using the correct buffer when filenames repeat in other folders', async () => {
  const savedEvent = globalThis.ProgressEvent;
  globalThis.ProgressEvent ||= class { constructor(type, values) {this.type = type; Object.assign(this, values);} };
  try {
    const vertices = new Uint8Array(new Float32Array([0,0,0, 1,0,0, 0,1,0]).buffer);
    const gltf = JSON.stringify({asset:{version:'2.0'}, buffers:[{uri:'data/triangle.bin',byteLength:36}],
      bufferViews:[{buffer:0,byteLength:36}], accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],
      meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0});
    const files = await prepareModelFiles([archive({'asset/source/scene.gltf':gltf,'asset/source/data/triangle.bin':vertices,'unrelated/data/triangle.bin':new Uint8Array(1)})]);
    const {model} = await loadModel(files);
    expect(new Box3().setFromObject(model, true).getSize(new Vector3()).x).toBeCloseTo(2);
    disposeModel(model);
  } finally {
    globalThis.ProgressEvent = savedEvent;
  }
});

test('rejects corrupt, unsupported, oversized, and mixed archive selections', async () => {
  await expect(prepareModelFiles([{name:'bad.zip', arrayBuffer: async () => new Uint8Array([1,2,3]).buffer}])).rejects.toThrow('Could not unpack');
  await expect(prepareModelFiles([archive({'readme.txt': 'no model'})])).rejects.toThrow('No GLB');
  await expect(prepareModelFiles([{name:'huge.zip', size: 101 * 1024 * 1024}])).rejects.toThrow('100 MB');
  await expect(prepareModelFiles([archive({'a.obj': obj}), {name:'b.obj'}])).rejects.toThrow('one ZIP');
});

test('loose model imports continue to pass through unchanged', async () => {
  const files = [{name: 'a.obj'}];
  expect(await prepareModelFiles(files)).toBe(files);
});

test('finds an OBJ through three ZIP levels, matching the Venus download structure', async () => {
  const deepest = zipSync({'retopo_2.obj': strToU8(obj)});
  const inner = zipSync({'source/retopo_2.zip': deepest, 'textures/normal.jpg': strToU8('image')});
  const outer = archive({'source/venus.zip': inner, 'textures/normal.jpeg': 'image'});
  const files = await prepareModelFiles([outer]);
  const candidates = modelFiles(files);
  expect(candidates).toHaveLength(1);
  expect(filePath(candidates[0])).toBe('source/venus/source/retopo_2/retopo_2.obj');
  const {model} = await loadModel(files);
  expect(new Box3().setFromObject(model).isEmpty()).toBe(false);
  disposeModel(model);
});

test('limits recursive archives and preserves models from multiple nested ZIPs', async () => {
  const inner = zipSync({'model.obj': strToU8(obj)});
  const files = await prepareModelFiles([archive({'one.zip': inner, 'two.zip': inner})]);
  expect(modelFiles(files).map(filePath)).toEqual(['one/model.obj', 'two/model.obj']);
  let nested = inner;
  for (let i = 0; i < 10; i++) nested = zipSync({'inner.zip': nested});
  await expect(prepareModelFiles([new File([nested], 'deep.zip')])).rejects.toThrow('too many levels');
});
