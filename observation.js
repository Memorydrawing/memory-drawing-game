// Observation drills with tool-based drawing and vertex editing

document.addEventListener('DOMContentLoaded', () => {
  const playArea = document.getElementById('playArea');
  const displayCanvas = document.getElementById('displayCanvas');
  const drawCanvas = document.getElementById('drawCanvas');
  const leftHandToggle = document.getElementById('leftHandToggle');
  const penBtn = document.getElementById('penTool');
  const eraserBtn = document.getElementById('eraserTool');
  const vertexBtn = document.getElementById('vertexTool');

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
  const vertices = [];
  let penLayer = drawCtx.getImageData(0, 0, width, height);

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
  }

  drawCanvas.addEventListener('pointerdown', e => {
    const pos = getPos(e);
    if (currentTool === 'pen') {
      drawing = true;
      drawCtx.beginPath();
      drawCtx.moveTo(pos.x, pos.y);
    } else if (currentTool === 'eraser') {
      const idx = vertices.findIndex(v => Math.hypot(v.x - pos.x, v.y - pos.y) <= 6);
      if (idx >= 0) {
        vertices.splice(idx, 1);
        render();
      } else {
        drawing = true;
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
  }

  drawCanvas.addEventListener('pointerup', stopInteraction);
  drawCanvas.addEventListener('pointerleave', stopInteraction);

  // Initial render
  render();
});

