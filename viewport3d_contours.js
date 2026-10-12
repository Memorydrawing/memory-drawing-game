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

export const contourEdgeShader = `
uniform sampler2D surface;
uniform vec2 texel;
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
      // Restrict extra lines to visibly different, still-lit planes close to
      // the shadow boundary. Tiny mesh facets and evenly lit edges are omitted.
      float plane = bothVisible * centerLit * neighborLit * lightEnabled * planesEnabled;
      plane *= 1.0 - step(planeLightCutoff, min(centerLight, neighborLight));
      plane *= 1.0 - step(planeCosAngle, dot(centerNormal, neighborNormal));
      plane *= step(planeContrast, abs(centerLight - neighborLight));
      line = max(line, max(silhouette, max(shadow, plane)));
    }
  }
  gl_FragColor = vec4(vec3(1.0 - step(0.5, line)), 1.0);
}`;

export function planeSettings(detail = 50) {
  const amount = Math.max(0, Math.min(100, Number(detail) || 0)) / 100;
  return {
    cosAngle: Math.cos((40 - 28 * amount) * Math.PI / 180),
    lightCutoff: 0.2 + 0.4 * amount,
    contrast: 0.12 - 0.08 * amount
  };
}

export function createContourRenderer(canvas, onContextChange) {
  const renderer = new WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const target = new WebGLRenderTarget(1, 1, {minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true});
  const classification = new ShaderMaterial({
    vertexShader: contourVertexShader,
    fragmentShader: contourFragmentShader,
    uniforms: {lightDirection: {value: new Vector3()}, lightEnabled: {value: 1}},
    side: DoubleSide, blending: NoBlending, toneMapped: false
  });
  const edge = new ShaderMaterial({
    uniforms: {
      surface: {value: target.texture}, texel: {value: new Vector2(1, 1)},
      lightDirection: classification.uniforms.lightDirection,
      lightEnabled: classification.uniforms.lightEnabled,
      planesEnabled: {value: 1}, planeCosAngle: {value: 0},
      planeLightCutoff: {value: 0.4}, planeContrast: {value: 0.08}
    },
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
