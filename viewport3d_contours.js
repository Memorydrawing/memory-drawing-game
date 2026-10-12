import { WebGLRenderer, WebGLRenderTarget, ShaderMaterial, Scene, Mesh, PlaneGeometry,
  OrthographicCamera, Vector2, Vector3, DoubleSide, NoBlending, NearestFilter, NoToneMapping } from 'three';

export const contourVertexShader = `
#include <common>
#include <batching_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
varying vec3 vViewNormal;
void main() {
  #include <batching_vertex>
  #include <beginnormal_vertex>
  #include <morphinstance_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  vViewNormal = transformedNormal;
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
}`;

export const contourFragmentShader = `
uniform vec3 lightDirection;
uniform float lightEnabled;
varying vec3 vViewNormal;
void main() {
  vec3 n = normalize(vViewNormal);
  if (!gl_FrontFacing) n = -n;
  float illuminated = step(0.0, dot(n, lightDirection)) * lightEnabled;
  // R = visible object mask; G = which side of the form-shadow boundary.
  gl_FragColor = vec4(1.0, illuminated, 0.0, 1.0);
}`;

export const contourEdgeShader = `
uniform sampler2D surface;
uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec2 center = texture2D(surface, vUv).rg;
  float line = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = clamp(vUv + vec2(float(x), float(y)) * texel, texel * 0.5, vec2(1.0) - texel * 0.5);
      vec2 neighbor = texture2D(surface, uv).rg;
      float silhouette = abs(center.r - neighbor.r);
      // Shadow lines only compare two visible surface pixels, so a background
      // pixel cannot create a false shadow line along the outer silhouette.
      float shadow = min(center.r, neighbor.r) * abs(center.g - neighbor.g);
      line = max(line, max(silhouette, shadow));
    }
  }
  gl_FragColor = vec4(vec3(1.0 - step(0.5, line)), 1.0);
}`;

export function createContourRenderer(canvas, onContextChange) {
  const renderer = new WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 1);
  const target = new WebGLRenderTarget(1, 1, {minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true});
  const classification = new ShaderMaterial({
    vertexShader: contourVertexShader,
    fragmentShader: contourFragmentShader,
    uniforms: {lightDirection: {value: new Vector3()}, lightEnabled: {value: 1}},
    side: DoubleSide, blending: NoBlending, toneMapped: false
  });
  const edge = new ShaderMaterial({
    uniforms: {surface: {value: target.texture}, texel: {value: new Vector2(1, 1)}},
    vertexShader: 'varying vec2 vUv; void main() {vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: contourEdgeShader,
    depthTest: false, depthWrite: false, blending: NoBlending, toneMapped: false
  });
  const screen = new Scene();
  const plane = new Mesh(new PlaneGeometry(2, 2), edge);
  screen.add(plane);
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  canvas.addEventListener('webglcontextlost', () => onContextChange?.(false));
  canvas.addEventListener('webglcontextrestored', () => onContextChange?.(true));

  function render(scene, camera, light) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = renderer.getPixelRatio();
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    if (target.width !== w || target.height !== h) {
      renderer.setSize(width, height, false);
      target.setSize(w, h);
      edge.uniforms.texel.value.set(1 / w, 1 / h);
    }
    camera.updateMatrixWorld();
    light.updateMatrixWorld();
    light.target.updateMatrixWorld();
    classification.uniforms.lightDirection.value.setFromMatrixPosition(light.matrixWorld)
      .sub(new Vector3().setFromMatrixPosition(light.target.matrixWorld)).normalize()
      .transformDirection(camera.matrixWorldInverse);
    classification.uniforms.lightEnabled.value = light.intensity > 0 && light.color.r + light.color.g + light.color.b > 0 ? 1 : 0;
    const background = scene.background, override = scene.overrideMaterial;
    try {
      scene.background = null;
      scene.overrideMaterial = classification;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
    } finally {
      scene.background = background;
      scene.overrideMaterial = override;
      renderer.setRenderTarget(null);
    }
    renderer.render(screen, screenCamera);
  }
  return {render, dispose() {target.dispose(); classification.dispose(); edge.dispose(); plane.geometry.dispose(); renderer.dispose();}};
}
