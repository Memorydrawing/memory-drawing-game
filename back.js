(function ensureViewportDoesNotZoomOnDoubleTap() {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) return;

  const content = viewport.getAttribute('content') || '';
  const directives = content
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  const order = [];
  const map = new Map();

  directives.forEach((directive) => {
    const [key, ...rest] = directive.split('=');
    const name = key.trim();
    const value = rest.join('=').trim();
    if (!order.includes(name)) order.push(name);
    map.set(name, value);
  });

  const desired = {
    'maximum-scale': '1',
    'user-scalable': 'no'
  };

  Object.keys(desired).forEach((key) => {
    if (!order.includes(key)) order.push(key);
    map.set(key, desired[key]);
  });

  const updatedContent = order
    .map((key) => {
      const value = map.get(key);
      return value ? `${key}=${value}` : key;
    })
    .join(', ');

  viewport.setAttribute('content', updatedContent);
})();

(function preventTouchGestureZoom() {
  let lastTouchEnd = 0;

  const cancelIfMultiTouch = (event) => {
    if (event.touches && event.touches.length > 1) {
      event.preventDefault();
    }
  };

  document.addEventListener('touchstart', cancelIfMultiTouch, { passive: false });
  document.addEventListener('touchmove', cancelIfMultiTouch, { passive: false });

  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  document.addEventListener(
    'gesturestart',
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );
})();

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('backBtn');
  if (!btn) return;

  const PAGE_CONFIG = {
    'scenarios.html': { label: 'Main Menu', target: 'index.html' },
    'scenario_play.html': { label: 'Scenarios', target: 'scenarios.html' },
    'scenario_player.html': { label: 'Scenarios', target: 'scenarios.html' },
    'drills.html': { label: 'Main Menu', target: 'index.html' },
    'two_points.html': { label: 'Drills', target: 'drills.html' },
    'three_points.html': { label: 'Drills', target: 'drills.html' },
    'four_points.html': { label: 'Drills', target: 'drills.html' },
    'lines.html': { label: 'Drills', target: 'drills.html' },
    'triangles.html': { label: 'Drills', target: 'drills.html' },
    'quadrilaterals.html': { label: 'Drills', target: 'drills.html' },
    'complex_shapes.html': { label: 'Drills', target: 'drills.html' },
    'angles.html': { label: 'Drills', target: 'drills.html' },
    'dexterity_contours.html': { label: 'Drills', target: 'drills.html' },
    'dexterity_thick_contours.html': { label: 'Drills', target: 'drills.html' },
    'dexterity_thick_lines.html': { label: 'Drills', target: 'drills.html' },
    'dexterity_lines.html': { label: 'Drills', target: 'drills.html' },
    'dexterity_point_drill.html': { label: 'Drills', target: 'drills.html' },
    'dexterity_point_drill_large.html': { label: 'Drills', target: 'drills.html' },
    'dexterity_point_drill_small.html': { label: 'Drills', target: 'drills.html' },
    'point_drill_01.html': { label: 'Drills', target: 'drills.html' },
    'point_drill_025.html': { label: 'Drills', target: 'drills.html' },
    'point_drill_05.html': { label: 'Drills', target: 'drills.html' },
    'point_sequence_05.html': { label: 'Drills', target: 'drills.html' },
    'inch_warmup.html': { label: 'Drills', target: 'drills.html' }
  };

  const page = window.location.pathname.split('/').pop();
  const cfg = PAGE_CONFIG[page] || { label: 'Main Menu', target: 'index.html' };

  btn.textContent = `\u2190 ${cfg.label}`;
  btn.addEventListener('click', () => {
    window.location.href = cfg.target;
  });
});
