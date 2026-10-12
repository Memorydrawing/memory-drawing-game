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
varying vec3 vViewNormal;
void main() {
  vec3 n = normalize(vViewNormal);
  if (!gl_FrontFacing) n = -n;
  // RGB stores the visible surface normal; alpha distinguishes model/background.
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}`;

export const contourNormalFilterShader = `
uniform sampler2D surface;
uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec4 center = texture2D(surface, vUv);
  if (center.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 n = normalize(center.rgb * 2.0 - 1.0);
  vec3 sum = vec3(0.0);
  float weights = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = clamp(vUv + vec2(float(x), float(y)) * texel, texel * 0.5, vec2(1.0) - texel * 0.5);
      vec4 sampleValue = texture2D(surface, uv);
      vec3 sampleNormal = normalize(sampleValue.rgb * 2.0 - 1.0);
      float spatial = (x == 0 ? 2.0 : 1.0) * (y == 0 ? 2.0 : 1.0);
      float weight = spatial * step(0.5, sampleValue.a) * step(0.6, dot(n, sampleNormal));
      sum += sampleNormal * weight;
      weights += weight;
    }
  }
  gl_FragColor = vec4(normalize(sum / max(weights, 1.0)) * 0.5 + 0.5, center.a);
}`;

// Closing small gaps before slightly strengthening the stroke produces connected
// binary black lines, with no gray texture samples in the final drawing.
export const contourJoinShader = `
uniform sampler2D surface;
uniform vec2 texel;
varying vec2 vUv;
void main() {
  float ink = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      ink = max(ink, 1.0 - texture2D(surface, clamp(vUv + vec2(float(x), float(y)) * texel, texel * 0.5, vec2(1.0) - texel * 0.5)).r);
    }
  }
  gl_FragColor = vec4(vec3(step(0.5, ink)), 1.0);
}`;

export const contourSolidShader = `
uniform sampler2D surface;
uniform vec2 texel;
varying vec2 vUv;
void main() {
  float ink = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      ink = min(ink, texture2D(surface, clamp(vUv + vec2(float(x), float(y)) * texel, texel * 0.5, vec2(1.0) - texel * 0.5)).r);
    }
  }
  gl_FragColor = vec4(vec3(1.0 - step(0.5, ink)), 1.0);
}`;

export const contourEdgeShader = `
uniform sampler2D surface;
uniform vec2 texel;
uniform vec2 planeTexel;
uniform vec3 lightDirection;
uniform float lightEnabled;
uniform float planesEnabled;
uniform float planeCosAngle;
uniform float planeLightCutoff;
uniform float planeContrast;
varying vec2 vUv;
void main() {
  vec4 center = texture2D(surface, vUv);
  vec3 centerNormal = normalize(center.rgb * 2.0 - 1.0);
  float centerLight = dot(centerNormal, lightDirection);
  float centerLit = step(0.0, centerLight);
  float line = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = clamp(vUv + vec2(float(x), float(y)) * texel, texel * 0.5, vec2(1.0) - texel * 0.5);
      vec4 neighbor = texture2D(surface, uv);
      vec3 neighborNormal = normalize(neighbor.rgb * 2.0 - 1.0);
      float neighborLight = dot(neighborNormal, lightDirection);
      float neighborLit = step(0.0, neighborLight);
      float bothVisible = min(center.a, neighbor.a);
      float silhouette = abs(center.a - neighbor.a);
      float shadow = bothVisible * abs(centerLit - neighborLit) * lightEnabled;
      // Inspect a wider, smoothed surface neighborhood for structural planes,
      // while keeping silhouette and true shadow boundaries at pixel precision.
      vec4 planeNeighbor = texture2D(surface, clamp(vUv + vec2(float(x), float(y)) * planeTexel, texel * 0.5, vec2(1.0) - texel * 0.5));
      vec3 planeNormal = normalize(planeNeighbor.rgb * 2.0 - 1.0);
      float planeLight = dot(planeNormal, lightDirection);
      float plane = min(center.a, planeNeighbor.a) * centerLit * step(0.0, planeLight) * lightEnabled * planesEnabled;
      plane *= 1.0 - step(planeLightCutoff, min(centerLight, planeLight));
      plane *= 1.0 - step(planeCosAngle, dot(centerNormal, planeNormal));
      plane *= step(planeContrast, abs(centerLight - planeLight));
      line = max(line, max(silhouette, max(shadow, plane)));
    }
  }
  gl_FragColor = vec4(vec3(1.0 - step(0.5, line)), 1.0);
}`;

export function planeSettings(detail = 50) {
  const amount = Math.max(0, Math.min(100, Number(detail) || 0)) / 100;
  return {
    cosAngle: Math.cos((20 - 15 * amount) * Math.PI / 180),
    lightCutoff: 0.4 + 0.55 * amount,
    contrast: 0.03 - 0.027 * amount
  };
}

export function createContourRenderer(canvas, onContextChange) {
  const renderer = new WebGLRenderer({canvas, antialias: false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const target = new WebGLRenderTarget(1, 1, {minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true});
  const filtered = new WebGLRenderTarget(1, 1, {minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false});
  const lines = new WebGLRenderTarget(1, 1, {minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false});
  const joined = new WebGLRenderTarget(1, 1, {minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false});
  const screenVertex = 'varying vec2 vUv; void main() {vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}';
  const makePass = (texture, shader) => new ShaderMaterial({
    uniforms: {surface: {value: texture}, texel: {value: new Vector2(1, 1)}},
    vertexShader: screenVertex, fragmentShader: shader,
    depthTest: false, depthWrite: false, blending: NoBlending, toneMapped: false
  });
  const filter = makePass(target.texture, contourNormalFilterShader);
  const join = makePass(lines.texture, contourJoinShader);
  const solid = makePass(joined.texture, contourSolidShader);
  const classification = new ShaderMaterial({
    vertexShader: contourVertexShader,
    fragmentShader: contourFragmentShader,
    uniforms: {lightDirection: {value: new Vector3()}, lightEnabled: {value: 1}},
    side: DoubleSide, blending: NoBlending, toneMapped: false
  });
  const edge = new ShaderMaterial({
    uniforms: {
      surface: {value: filtered.texture}, texel: {value: new Vector2(1, 1)}, planeTexel: {value: new Vector2(1, 1)},
      lightDirection: classification.uniforms.lightDirection,
      lightEnabled: classification.uniforms.lightEnabled,
      planesEnabled: {value: 1}, planeCosAngle: {value: 0},
      planeLightCutoff: {value: 0.4}, planeContrast: {value: 0.08}
    },
    vertexShader: screenVertex,
    fragmentShader: contourEdgeShader,
    depthTest: false, depthWrite: false, blending: NoBlending, toneMapped: false
  });
  const screen = new Scene();
  const plane = new Mesh(new PlaneGeometry(2, 2), edge);
  screen.add(plane);
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  canvas.addEventListener('webglcontextlost', () => onContextChange?.(false));
  canvas.addEventListener('webglcontextrestored', () => onContextChange?.(true));

  function render(scene, camera, light, options = {}) {
    const settings = planeSettings(options.detail ?? 50);
    edge.uniforms.planesEnabled.value = options.planes === false ? 0 : 1;
    edge.uniforms.planeCosAngle.value = settings.cosAngle;
    edge.uniforms.planeLightCutoff.value = settings.lightCutoff;
    edge.uniforms.planeContrast.value = settings.contrast;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = renderer.getPixelRatio();
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    if (target.width !== w || target.height !== h) {
      renderer.setSize(width, height, false);
      for (const buffer of [target, filtered, lines, joined]) buffer.setSize(w, h);
      edge.uniforms.texel.value.set(1 / w, 1 / h);
      edge.uniforms.planeTexel.value.set(1 / w, 1 / h);
      filter.uniforms.texel.value.set(0.65 * ratio / w, 0.65 * ratio / h);
      join.uniforms.texel.value.set(0.85 * ratio / w, 0.85 * ratio / h);
      solid.uniforms.texel.value.set(0.35 * ratio / w, 0.35 * ratio / h);
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
    try {
      for (const [material, buffer] of [[filter, filtered], [edge, lines], [join, joined], [solid, null]]) {
        plane.material = material;
        renderer.setRenderTarget(buffer);
        renderer.render(screen, screenCamera);
      }
    } finally { renderer.setRenderTarget(null); }
  }
  return {render, dispose() {
    for (const buffer of [target, filtered, lines, joined]) buffer.dispose();
    for (const material of [classification, filter, edge, join, solid]) material.dispose();
    plane.geometry.dispose(); renderer.dispose();
  }};
}
