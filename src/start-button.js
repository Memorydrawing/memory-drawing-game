export function overlayStartButton(canvas, startBtn) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  canvas.parentNode.insertBefore(wrapper, canvas);
  wrapper.appendChild(canvas);
  wrapper.appendChild(startBtn);
  startBtn.style.position = 'absolute';
  startBtn.style.top = '50%';
  startBtn.style.left = '50%';
  startBtn.style.transform = 'translate(-50%, -50%)';
}

export function hideStartButton(startBtn) {
  startBtn.style.display = 'none';
}

