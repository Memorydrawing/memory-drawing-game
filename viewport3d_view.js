export function bindContourStudySwitch(root = document, onChange = () => {}) {
  const toggle = root.getElementById('contourStudyToggle');
  if (!toggle) return;
  const update = () => {
    const enabled = toggle.checked;
    root.querySelector('.viewport3d-screen').classList.toggle('lines-view', enabled);
    root.getElementById('contourCanvas').hidden = !enabled;
    root.getElementById('contourStatus').hidden = !enabled;
    root.getElementById('modelCanvas').setAttribute('aria-label', enabled ? 'Interactive line drawing. Drag to rotate; pinch to zoom.' : 'Interactive 3D model. Drag to rotate; pinch to zoom.');
    root.getElementById('contourOptions').hidden = !enabled;
    onChange(enabled);
  };
  toggle.addEventListener('change', update);
  update();
}
