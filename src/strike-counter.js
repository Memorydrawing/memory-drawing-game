const DEFAULT_MAX_STRIKES = 3;

function ensureStrikeBoxes(container, maxStrikes) {
  if (!container) return [];

  let boxes = Array.from(container.querySelectorAll('.strike-box'));
  if (boxes.length === maxStrikes) {
    return boxes;
  }

  container.innerHTML = '';
  boxes = [];
  for (let i = 0; i < maxStrikes; i += 1) {
    const box = document.createElement('div');
    box.className = 'strike-box';
    box.setAttribute('aria-hidden', 'true');
    container.appendChild(box);
    boxes.push(box);
  }

  return boxes;
}

function updateAccessibility(container, strikes, maxStrikes) {
  if (!container) return;
  container.setAttribute('role', 'img');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-label', `Strikes: ${strikes} of ${maxStrikes}`);
}

export function createStrikeCounter(containerElement, maxStrikes = DEFAULT_MAX_STRIKES) {
  let strikes = 0;
  const boxes = ensureStrikeBoxes(containerElement, maxStrikes);

  function render() {
    boxes.forEach((box, index) => {
      box.classList.toggle('filled', index < strikes);
    });
    updateAccessibility(containerElement, strikes, maxStrikes);
  }

  render();

  return {
    registerSuccess() {
      strikes = Math.max(0, strikes - 1);
      render();
    },
    registerFailure() {
      strikes = Math.min(maxStrikes, strikes + 1);
      render();
      return strikes >= maxStrikes;
    },
    reset() {
      strikes = 0;
      render();
    },
    getStrikes() {
      return strikes;
    }
  };
}
