const DEFAULT_TIMER_SETTINGS = {
  initialSeconds: 60,
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

  return value;
}

export function createStrikeCounter(containerElement, settings = {}, onExpire = null) {
  const timerSettings = normalizeSettings(settings);
  let timeLeft = timerSettings.initialSeconds;
  let intervalId = null;
  let expired = false;

  const displayValue = createDisplay(containerElement);

  function render() {
    if (!displayValue) return;
    const seconds = Math.max(0, Math.ceil(timeLeft));
    displayValue.textContent = `${seconds}s`;
    containerElement?.setAttribute('aria-label', `Time remaining: ${seconds} seconds`);
  }

  function stopTicking() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
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

  function adjustTime(delta) {
    timeLeft = Math.min(timerSettings.maxSeconds, Math.max(0, timeLeft + delta));
    if (timeLeft <= 0) {
      return triggerExpire();
    }
    render();
    return false;
  }

  function startTicking() {
    stopTicking();
    intervalId = setInterval(() => {
      if (adjustTime(-timerSettings.tickMs / 1000)) {
        stopTicking();
      }
    }, timerSettings.tickMs);
  }

  function reset() {
    expired = false;
    timeLeft = timerSettings.initialSeconds;
    render();
    startTicking();
  }

  render();
  startTicking();

  return {
    registerSuccess() {
      return adjustTime(timerSettings.successDelta);
    },
    registerFailure() {
      return adjustTime(-timerSettings.failureDelta);
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
