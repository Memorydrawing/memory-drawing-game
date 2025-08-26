document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('backBtn');
  if (!btn) return;

  const DEFAULT_LABEL = 'Main Menu';
  const labelMap = {
    'index.html': 'Main Menu',
    'drills.html': 'Drills',
    'scenarios.html': 'Scenarios'
  };

  const setLabel = text => {
    btn.textContent = `\u2190 ${text}`;
  };

  const ref = document.referrer;
  let mapped = null;
  if (ref) {
    try {
      const url = new URL(ref);
      const page = url.pathname.split('/').pop();
      mapped = labelMap[page] || null;
    } catch {
      mapped = null;
    }
  }

  setLabel(mapped || DEFAULT_LABEL);

  if (ref && !mapped) {
    fetch(ref, { mode: 'same-origin' })
      .then(res => res.text())
      .then(html => {
        const match = html.match(/<title>([^<]*)<\/title>/i);
        if (match) {
          const title = match[1].split(' - ')[0].trim();
          setLabel(title);
        }
      })
      .catch(() => {/* ignore errors, label stays default */});
  }

  btn.addEventListener('click', () => {
    if (ref) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });
});
