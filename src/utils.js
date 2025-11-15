export function preventDoubleTapZoom(element) {
  if (!element) return;

  element.style.touchAction = 'none';
  element.setAttribute('touch-action', 'none');

  let lastTouchEnd = 0;

  const handleTouchStart = (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = (event) => {
    const now = Date.now();

    if (event.touches.length > 1) {
      lastTouchEnd = 0;
      event.preventDefault();
      return;
    }

    if (now - lastTouchEnd < 500) {
      event.preventDefault();
    }

    lastTouchEnd = now;
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchend', handleTouchEnd, { passive: false });
  element.addEventListener('dblclick', handleDoubleClick);
}

export function getCanvasPos(canvas, e) {
  // On some devices (notably iOS Safari), pointer events report unreliable
  // `offsetX/Y` values for touch input, which causes taps to be mislocated.
  // Use `offsetX/Y` only for mouse pointers and fall back to calculating the
  // position from `clientX/Y` for touch or pen input.
  if (
    typeof e.offsetX === 'number' &&
    typeof e.offsetY === 'number' &&
    (!('pointerType' in e) || e.pointerType === 'mouse')
  ) {
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    return {
      x: e.offsetX * scaleX,
      y: e.offsetY * scaleY
    };
  }

  // Fallback: derive the position from the client coordinates.
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

export function clearCanvas(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

let currentSound = null;

export function playSound(audioCtx, grade) {
  // Stop any sound that is already playing so a new grading tone can
  // start immediately in response to fresh pointer input.
  if (currentSound) {
    try {
      currentSound.osc.onended = null;
      currentSound.osc.stop();
    } catch (e) {
      // ignore errors if the oscillator is already stopped
    }
    currentSound.gain.disconnect();
    currentSound = null;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  let duration;
  if (grade === 'green') {
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    duration = 0.1;
  } else {
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    duration = 0.3;
  }

  osc.onended = () => {
    gain.disconnect();
    if (currentSound && currentSound.osc === osc) {
      currentSound = null;
    }
  };

  osc.start(now);
  osc.stop(now + duration);
  currentSound = { osc, gain };
}
