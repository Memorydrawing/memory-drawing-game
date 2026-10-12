import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { Box3, Group, Vector3, Sphere, MeshStandardMaterial, DoubleSide, LoadingManager, Mesh } from 'three';

export function disposeModel(model) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of object.material ? [].concat(object.material) : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    if (object.skeleton?.boneTexture) textures.add(object.skeleton.boneTexture);
  });
  textures.forEach(texture => {
    const images = [].concat(texture.source?.data || []);
    images.forEach(image => image?.close?.());
    texture.dispose();
  });
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

export function neutralMaterial() {
  return new MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.8, metalness: 0, side: DoubleSide });
}

export function normalizeModel(model) {
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model, true);
  const size = bounds.getSize(new Vector3());
  const extent = Math.max(size.x, size.y, size.z);
  if (bounds.isEmpty() || !Number.isFinite(extent) || extent <= 0) {
    throw new Error('The file does not contain visible 3D geometry.');
  }
  const center = bounds.getCenter(new Vector3());
  const centered = new Group();
  centered.add(model);
  centered.position.copy(center).negate();
  const wrapper = new Group();
  wrapper.add(centered);
  wrapper.scale.setScalar(2 / extent);
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

export function fitView(camera, controls, model) {
  const sphere = new Box3().setFromObject(model, true).getBoundingSphere(new Sphere());
  const verticalFov = camera.fov * Math.PI / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const distance = sphere.radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.15;
  controls.target.copy(sphere.center);
  camera.position.copy(sphere.center).add(new Vector3(0.6, 0.35, 1).normalize().multiplyScalar(distance));
  camera.near = Math.max(sphere.radius / 1000, 0.0001);
  camera.far = distance + sphere.radius * 100;
  camera.updateProjectionMatrix();
  controls.minDistance = sphere.radius * 0.15;
  controls.maxDistance = sphere.radius * 30;
  controls.update();
  controls.saveState();
}

export async function loadModel(files) {
  const candidates = files.filter(file => /\.(glb|gltf|obj|stl)$/i.test(file.name));
  if (candidates.length !== 1) throw new Error('Select one 3D model, plus any glTF companion files.');
  const file = candidates[0], extension = file.name.split('.').pop().toLowerCase();
  let model;
  if (extension === 'obj') {
    model = new OBJLoader().parse(await file.text());
    const oldMaterials = new Set();
    model.traverse(object => {
      if (object.isMesh) {
        [].concat(object.material).forEach(material => oldMaterials.add(material));
        object.material = neutralMaterial();
      }
    });
    oldMaterials.forEach(material => material.dispose());
  } else if (extension === 'stl') {
    model = new Mesh(new STLLoader().parse(await file.arrayBuffer()), neutralMaterial());
  } else {
    const urls = new Map();
    try {
      for (const companion of files) {
        if (urls.has(companion.name)) throw new Error('Companion files must have unique filenames.');
        urls.set(companion.name, URL.createObjectURL(companion));
      }
      const manager = new LoadingManager();
      manager.setURLModifier(url => {
        if (url.startsWith('data:') || url.startsWith('blob:')) return url;
        const name = decodeURIComponent(url.split(/[?#]/)[0].split('/').pop());
        if (urls.has(name)) return urls.get(name);
        throw new Error('Missing companion file: ' + name + '. Select it together with the model.');
      });
      const result = await new GLTFLoader(manager).parseAsync(await file.arrayBuffer(), '');
      model = result.scene;
    } finally {
      urls.forEach(url => URL.revokeObjectURL(url));
    }
  }
  try {
    return { model: normalizeModel(model), name: file.name };
  } catch (error) {
    disposeModel(model);
    throw error;
  }
}

