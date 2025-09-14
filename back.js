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
