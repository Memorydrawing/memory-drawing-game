export function getCanvasPos(canvas, e) {
  // Use the event's offset coordinates when available. These are already
  // relative to the canvas' content box, which avoids issues with borders
  // or page scrolling that can cause inaccurate position calculations on
  // some devices.
  if (typeof e.offsetX === 'number' && typeof e.offsetY === 'number') {
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

export function playSound(audioCtx, grade) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  if (grade === 'green') {
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (grade === 'yellow') {
    osc.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else {
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}
