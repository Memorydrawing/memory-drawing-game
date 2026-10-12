// Canvas Tool controls with command history, transparent erasing and fixed study coordinates.
export function createSketchDrawing(canvas, toolbar) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The drawing canvas is unavailable.');
  let strokes = [], history = [[]], historyIndex = 0, active = null, pointer = null, enabled = false, tool = 'pencil';
  const sizes = {pencil: 3, eraser: 10};
  const buttons = [...toolbar.querySelectorAll('[data-tool]')];
  const size = toolbar.querySelector('[data-size]'), output = toolbar.querySelector('output');
  function ui() {
    buttons.forEach(button => {button.classList.toggle('active', button.dataset.tool === tool); button.setAttribute('aria-pressed', String(button.dataset.tool === tool));});
    toolbar.querySelector('[data-action=undo]').disabled = historyIndex === 0;
    toolbar.querySelector('[data-action=redo]').disabled = historyIndex === history.length - 1;
    size.value = sizes[tool]; output.textContent = `${sizes[tool]}px`;
  }
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of [...strokes, ...(active ? [active] : [])]) {
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineWidth = stroke.size; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = ctx.fillStyle = '#000';
      const points = stroke.points;
      if (points.length === 1) {ctx.beginPath(); ctx.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2); ctx.fill(); continue;}
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i]; ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      ctx.lineTo(points.at(-1).x, points.at(-1).y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over'; ui();
  }
  function commit(next) {
    strokes = next; history = history.slice(0, historyIndex + 1); history.push(strokes);
    if (history.length > 81) history.shift(); historyIndex = history.length - 1;
  }
  function end() {
    if (active) {commit([...strokes, active]); active = null;}
    const id = pointer; pointer = null;
    if (id !== null && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    render();
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)), y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height))};
  }
  canvas.addEventListener('pointerdown', event => {
    if (!enabled || pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = event.pointerId; canvas.setPointerCapture(pointer);
    active = {tool, size: sizes[tool], points: [point(event)]}; render(); event.preventDefault();
  });
  canvas.addEventListener('pointermove', event => {
    if (!enabled || !active || event.pointerId !== pointer) return;
    const samples = event.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event]) active.points.push(point(sample));
    render(); event.preventDefault();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => {if (event.pointerId === pointer) end();});
  buttons.forEach(button => button.addEventListener('click', () => {end(); tool = button.dataset.tool; ui();}));
  size.addEventListener('input', () => {sizes[tool] = Number(size.value); ui();});
  toolbar.querySelector('[data-action=undo]').addEventListener('click', () => {end(); if (historyIndex > 0) strokes = history[--historyIndex]; render();});
  toolbar.querySelector('[data-action=redo]').addEventListener('click', () => {end(); if (historyIndex < history.length - 1) strokes = history[++historyIndex]; render();});
  toolbar.querySelector('[data-action=clear]').addEventListener('click', () => {end(); if (strokes.length) commit([]); render();});
  ui();
  return {
    setEnabled(value) {if (!value && enabled) end(); enabled = value; canvas.setAttribute('aria-disabled', String(!value));},
    reset() {end(); active = null; pointer = null; strokes = []; history = [[]]; historyIndex = 0; render();},
    capture() {end(); return ctx.getImageData(0, 0, canvas.width, canvas.height);}
  };
}
