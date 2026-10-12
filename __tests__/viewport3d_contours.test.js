/** @jest-environment jsdom */
import { jest } from '@jest/globals';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';

let failClassification = false;
const renderers = [];
class MockRenderer {
  constructor() {this.ratio=1;this.target=null;this.calls=[];renderers.push(this);}
  setPixelRatio(value) {this.ratio=value;}
  getPixelRatio() {return this.ratio;}
  setClearColor() {}
  setSize() {}
  setRenderTarget(target) {this.target=target;}
  clear() {}
  dispose() {}
  render(scene,camera) {
    this.calls.push({scene,camera,material:scene.overrideMaterial,background:scene.background});
    if (this.target && failClassification) throw new Error('GPU interrupted');
  }
}
jest.unstable_mockModule('three', () => ({...THREE,WebGLRenderer:MockRenderer}));
const {createContourRenderer} = await import('../viewport3d_contours.js');

function setup() {
  const canvas=document.createElement('canvas');
  Object.defineProperties(canvas,{clientWidth:{value:300},clientHeight:{value:300}});
  const contour=createContourRenderer(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#ffeedd');
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();
  scene.add(new THREE.Mesh(geometry,material));
  const camera=new THREE.PerspectiveCamera(40,1,.01,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);
  const light=new THREE.DirectionalLight();light.position.set(1,2,3);scene.add(light,light.target);
  return {canvas,contour,scene,camera,light,geometry,material};
}

test('line renderer uses the same camera and restores the reference scene and materials', () => {
  const {contour,scene,camera,light,geometry,material}=setup();
  const background=scene.background;
  contour.render(scene,camera,light);
  const renderer=renderers.at(-1), pass=renderer.calls[0];
  expect(pass.camera).toBe(camera);
  expect(pass.background).toBeNull();
  expect(pass.material.uniforms.lightDirection.value.length()).toBeCloseTo(1);
  expect(pass.material.uniforms.lightEnabled.value).toBe(1);
  expect(scene.background).toBe(background);
  expect(scene.overrideMaterial).toBeNull();
  expect(scene.children[0].material).toBe(material);
  const previous=pass.material.uniforms.lightDirection.value.clone();
  light.position.set(-3,-2,1);
  contour.render(scene,camera,light);
  expect(pass.material.uniforms.lightDirection.value.distanceTo(previous)).toBeGreaterThan(.5);
  light.intensity=0;contour.render(scene,camera,light);
  expect(pass.material.uniforms.lightEnabled.value).toBe(0);
  contour.dispose();geometry.dispose();material.dispose();
});

test('failed contour pass restores scene state and render target', () => {
  const {contour,scene,camera,light,geometry,material}=setup();const background=scene.background;
  failClassification=true;
  try {
    expect(()=>contour.render(scene,camera,light)).toThrow('GPU interrupted');
    expect(scene.background).toBe(background);expect(scene.overrideMaterial).toBeNull();
    expect(renderers.at(-1).target).toBeNull();
  } finally {failClassification=false;contour.dispose();geometry.dispose();material.dispose();}
});

test('Contour Study keeps all existing controls and places the line viewport first', () => {
  const original=readFileSync(new URL('../viewport3d.html',import.meta.url),'utf8');
  document.body.innerHTML=original;
  const controls=[...document.querySelectorAll('button,input,select')].map(el=>el.id).filter(Boolean);
  document.body.innerHTML=readFileSync(new URL('../contour_study.html',import.meta.url),'utf8');
  controls.forEach(id=>expect(document.getElementById(id)).not.toBeNull());
  const canvases=[...document.querySelectorAll('.viewport3d-reference canvas')].map(el=>el.id);
  expect(canvases).toEqual(['contourCanvas','modelCanvas']);
  document.body.innerHTML=readFileSync(new URL('../experimental.html',import.meta.url),'utf8');
  expect(document.getElementById('contourStudyBtn').form.getAttribute('action')).toBe('contour_study.html');
});
