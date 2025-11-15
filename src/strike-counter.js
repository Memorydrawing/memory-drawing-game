const DEFAULT_MAX_STRIKES = 3;

function formatLabel(strikes, maxStrikes) {
  return `Strikes: ${Math.min(strikes, maxStrikes)} / ${maxStrikes}`;
}

export function createStrikeCounter(displayElement, maxStrikes = DEFAULT_MAX_STRIKES) {
  let strikes = 0;

  function updateDisplay() {
    if (displayElement) {
      displayElement.textContent = formatLabel(strikes, maxStrikes);
    }
  }

  updateDisplay();

  return {
    registerSuccess() {
      strikes = 0;
      updateDisplay();
    },
    registerFailure() {
      strikes = Math.min(maxStrikes, strikes + 1);
      updateDisplay();
      return strikes >= maxStrikes;
    },
    reset() {
      strikes = 0;
      updateDisplay();
    },
    getStrikes() {
      return strikes;
    }
  };
}
