export function bindContourStudySwitch(root = document, onChange = () => {}) {
  const toggle = root.getElementById('contourStudyToggle');
  if (!toggle) return;
  const update = () => {
    const enabled = toggle.checked;
    root.querySelector('.viewport3d-screen').classList.toggle('contour-study-screen', enabled);
    root.getElementById('contourPanel').hidden = !enabled;
    root.getElementById('contourOptions').hidden = !enabled;
    onChange(enabled);
  };
  toggle.addEventListener('change', update);
  update();
}
