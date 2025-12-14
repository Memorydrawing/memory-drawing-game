const DEFAULT_TIMER_SETTINGS = {
  initialSeconds: 0,
  maxSeconds: 120,
  successDelta: 3,
  failureDelta: 7,
  tickMs: 1000
};

function normalizeSettings(settings = {}) {
  return {
    ...DEFAULT_TIMER_SETTINGS,
    ...settings
  };
}

function createDisplay(container) {
  if (!container) return null;

  container.classList.add('timer');
  container.setAttribute('role', 'img');
  container.setAttribute('aria-live', 'polite');

  container.innerHTML = '';
  const value = document.createElement('div');
  value.className = 'timer-display';
  container.appendChild(value);

  const delta = document.createElement('div');
  delta.className = 'timer-delta';
  delta.addEventListener('animationend', () => delta.classList.remove('show'));
  container.appendChild(delta);

  return { value, delta };
}

export function createStrikeCounter(containerElement, settings = {}, onExpire = null) {
  const timerSettings = normalizeSettings(settings);
  let timeLeft = timerSettings.initialSeconds;
  let intervalId = null;
  let expired = false;
  let hasStarted = false;

  const display = createDisplay(containerElement);
  const displayValue = display?.value;
  const deltaDisplay = display?.delta;

  function render() {
    if (!displayValue) return;
    const seconds = Math.max(0, Math.ceil(timeLeft));
    displayValue.textContent = `${seconds}s`;
    containerElement?.setAttribute('aria-label', `Time remaining: ${seconds} seconds`);
  }

  function showDelta(delta) {
    if (!deltaDisplay || delta === 0) return;
    const formatted = Number.isInteger(delta) ? delta : delta.toFixed(1);
    deltaDisplay.textContent = `${delta > 0 ? '+' : ''}${formatted}s`;
    deltaDisplay.classList.remove('show');
    deltaDisplay.classList.toggle('positive', delta > 0);
    deltaDisplay.classList.toggle('negative', delta < 0);
    // Force reflow to restart animation
    void deltaDisplay.offsetWidth;
    deltaDisplay.classList.add('show');
  }

  function stopTicking() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    hasStarted = false;
  }

  function triggerExpire() {
    if (expired) return true;
    expired = true;
    timeLeft = 0;
    stopTicking();
    render();
    if (typeof onExpire === 'function') {
      onExpire();
    }
    return true;
  }

  function adjustTime(delta, showChange = false) {
    timeLeft = Math.min(timerSettings.maxSeconds, Math.max(0, timeLeft + delta));
    if (showChange) {
      showDelta(delta);
    }
    if (timeLeft <= 0) {
      return triggerExpire();
    }
    render();
    return false;
  }

  function startTicking() {
    if (intervalId || expired) return;
    stopTicking();
    hasStarted = true;
    intervalId = setInterval(() => {
      if (adjustTime(-timerSettings.tickMs / 1000)) {
        stopTicking();
      }
    }, timerSettings.tickMs);
  }

  function startAfterFirstInput() {
    if (!hasStarted && !expired && timeLeft > 0) {
      startTicking();
    }
  }

  function reset() {
    expired = false;
    timeLeft = timerSettings.initialSeconds;
    stopTicking();
    render();
  }

  render();

  return {
    registerSuccess() {
      const expiredNow = adjustTime(timerSettings.successDelta, true);
      startAfterFirstInput();
      return expiredNow;
    },
    registerFailure() {
      const expiredNow = adjustTime(-timerSettings.failureDelta, true);
      startAfterFirstInput();
      return expiredNow;
    },
    reset,
    stop: stopTicking,
    getTimeLeft() {
      return timeLeft;
    },
    isExpired() {
      return expired;
    }
  };
}

export const DEFAULT_TIMER_CONFIG = DEFAULT_TIMER_SETTINGS;
