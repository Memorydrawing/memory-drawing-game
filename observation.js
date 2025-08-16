// Observation drills with tool-based drawing and vertex editing

document.addEventListener('DOMContentLoaded', () => {
  const playArea = document.getElementById('playArea');
  const displayCanvas = document.getElementById('displayCanvas');
  const drawCanvas = document.getElementById('drawCanvas');
  const leftHandToggle = document.getElementById('leftHandToggle');
  const penBtn = document.getElementById('penTool');
  const eraserBtn = document.getElementById('eraserTool');
  const vertexBtn = document.getElementById('vertexTool');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const compareBtn = document.getElementById('compareBtn');

  // Swap canvas order when toggle changes
  leftHandToggle?.addEventListener('change', () => {
    playArea.classList.toggle('reverse', leftHandToggle.checked);
  });

  // Placeholder drawing on display canvas
  const displayCtx = displayCanvas.getContext('2d');
  displayCtx.strokeStyle = '#000';
  displayCtx.lineWidth = 2;
  displayCtx.strokeRect(100, 100, 300, 300);

  // Player drawing setup
  const drawCtx = drawCanvas.getContext('2d');
  drawCtx.lineCap = 'round';
  const width = drawCanvas.width;
  const height = drawCanvas.height;

  let currentTool = 'pen';
  let drawing = false;
  let draggingVertex = null;
  let stateChanged = false;
  const vertices = [];
  let penLayer = drawCtx.getImageData(0, 0, width, height);
  let undoStack = [];
  let redoStack = [];
  let compareActive = false;
  let displayOverlay = null;
  let drawOverlay = null;

  function cloneImageData(img) {
    return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
  }

  function saveState() {
    undoStack.push({
      penLayer: cloneImageData(penLayer),
      vertices: vertices.map(v => ({ ...v }))
    });
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
  }

  function restoreState(state) {
    penLayer = cloneImageData(state.penLayer);
    vertices.length = 0;
    state.vertices.forEach(v => vertices.push({ ...v }));
    render();
  }

  function selectTool(tool) {
    currentTool = tool;
    [penBtn, eraserBtn, vertexBtn].forEach(btn => btn?.classList.remove('active'));
    if (tool === 'pen') {
      penBtn?.classList.add('active');
      drawCtx.globalCompositeOperation = 'source-over';
      drawCtx.strokeStyle = '#000';
      drawCtx.lineWidth = 2;
    } else if (tool === 'eraser') {
      eraserBtn?.classList.add('active');
      drawCtx.globalCompositeOperation = 'destination-out';
      drawCtx.lineWidth = 20;
    } else if (tool === 'vertex') {
      vertexBtn?.classList.add('active');
      drawCtx.globalCompositeOperation = 'source-over';
    }
    render();
  }

  penBtn?.addEventListener('click', () => selectTool('pen'));
  eraserBtn?.addEventListener('click', () => selectTool('eraser'));
  vertexBtn?.addEventListener('click', () => selectTool('vertex'));
  selectTool('pen');

  undoBtn?.addEventListener('click', () => {
    if (undoStack.length > 1) {
      const state = undoStack.pop();
      redoStack.push(state);
      restoreState(undoStack[undoStack.length - 1]);
    }
  });

  redoBtn?.addEventListener('click', () => {
    if (redoStack.length > 0) {
      const state = redoStack.pop();
      undoStack.push({
        penLayer: cloneImageData(penLayer),
        vertices: vertices.map(v => ({ ...v }))
      });
      restoreState(state);
    }
  });

  compareBtn?.addEventListener('click', () => {
    compareActive = !compareActive;
    compareBtn.classList.toggle('active', compareActive);
    toggleCompare();
  });

  function getPos(e) {
    const rect = drawCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function render() {
    drawCtx.clearRect(0, 0, width, height);
    drawCtx.putImageData(penLayer, 0, 0);

    if (vertices.length > 0) {
      drawCtx.save();
      drawCtx.globalCompositeOperation = 'source-over';
      drawCtx.strokeStyle = '#000';
      drawCtx.fillStyle = '#000';
      drawCtx.beginPath();
      drawCtx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        drawCtx.lineTo(vertices[i].x, vertices[i].y);
      }
      drawCtx.stroke();
      vertices.forEach(v => {
        drawCtx.beginPath();
        drawCtx.arc(v.x, v.y, 5, 0, Math.PI * 2);
        drawCtx.fill();
      });
      drawCtx.restore();
    }
    updateOverlays();
  }

  function updateOverlays() {
    if (!compareActive) return;
    if (!drawOverlay) {
      drawOverlay = document.createElement('canvas');
      drawOverlay.width = width;
      drawOverlay.height = height;
      drawOverlay.className = 'overlay';
      drawCanvas.parentElement.appendChild(drawOverlay);
    }
    const dctx = drawOverlay.getContext('2d');
    dctx.clearRect(0, 0, width, height);
    dctx.drawImage(displayCanvas, 0, 0);

    if (!displayOverlay) {
      displayOverlay = document.createElement('canvas');
      displayOverlay.width = width;
      displayOverlay.height = height;
      displayOverlay.className = 'overlay';
      displayCanvas.parentElement.appendChild(displayOverlay);
    }
    const sctx = displayOverlay.getContext('2d');
    sctx.clearRect(0, 0, width, height);
    sctx.drawImage(drawCanvas, 0, 0);
  }

  function toggleCompare() {
    if (!compareActive) {
      displayOverlay?.remove();
      drawOverlay?.remove();
      displayOverlay = null;
      drawOverlay = null;
    } else {
      updateOverlays();
    }
  }

  drawCanvas.addEventListener('pointerdown', e => {
    const pos = getPos(e);
    if (currentTool === 'pen') {
      drawing = true;
      stateChanged = true;
      drawCtx.beginPath();
      drawCtx.moveTo(pos.x, pos.y);
    } else if (currentTool === 'eraser') {
      const idx = vertices.findIndex(v => Math.hypot(v.x - pos.x, v.y - pos.y) <= 6);
      if (idx >= 0) {
        vertices.splice(idx, 1);
        stateChanged = true;
        render();
      } else {
        drawing = true;
        stateChanged = true;
        drawCtx.beginPath();
        drawCtx.moveTo(pos.x, pos.y);
      }
    } else if (currentTool === 'vertex') {
      const idx = vertices.findIndex(v => Math.hypot(v.x - pos.x, v.y - pos.y) <= 6);
      if (idx >= 0) {
        draggingVertex = idx;
      } else {
        vertices.push(pos);
        draggingVertex = vertices.length - 1;
      }
      stateChanged = true;
      render();
    }
  });

  drawCanvas.addEventListener('pointermove', e => {
    const pos = getPos(e);
    if (drawing && (currentTool === 'pen' || currentTool === 'eraser')) {
      drawCtx.lineTo(pos.x, pos.y);
      drawCtx.stroke();
    } else if (currentTool === 'vertex' && draggingVertex !== null) {
      vertices[draggingVertex] = pos;
      stateChanged = true;
      render();
    }
  });

  function stopInteraction() {
    if (drawing) {
      drawing = false;
      penLayer = drawCtx.getImageData(0, 0, width, height);
      render();
    }
    if (draggingVertex !== null) {
      draggingVertex = null;
      render();
    }
    if (stateChanged) {
      saveState();
      stateChanged = false;
    }
  }

  drawCanvas.addEventListener('pointerup', stopInteraction);
  drawCanvas.addEventListener('pointerleave', stopInteraction);

  // Initial render
  render();
  saveState();
});

