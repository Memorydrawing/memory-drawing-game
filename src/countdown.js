export function startCountdown(element, duration) {
  const start = performance.now();
  function update() {
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, duration - elapsed);
    element.textContent = (remaining / 1000).toFixed(2);
    if (remaining <= 0) {
      clearInterval(timerId);
    }
  }
  update();
  const timerId = setInterval(update, 10);
  return () => {
    clearInterval(timerId);
    element.textContent = '0.00';
  };
}
