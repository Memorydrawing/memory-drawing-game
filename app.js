const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const drawModeToggle = document.getElementById("drawModeToggle");
const drawModeLabel = document.getElementById("drawModeLabel");
const gridSelect = document.getElementById("gridSelect");
const result = document.getElementById("result");

let originalShape = [];
let playerShape = [];
let isDrawing = false;
let drawingEnabled = false;
let lastShape = [];
let viewTimer = null;

drawModeToggle.addEventListener("change", () => {
  drawModeLabel.textContent = drawModeToggle.checked ? "Point-to-Point" : "Freehand";
});

canvas.addEventListener("pointerdown", (e) => {
  if (!drawingEnabled) return;
  const pos = getCanvasPos(e);
  if (drawModeToggle.checked) {
    playerShape.push(pos);
    drawDots();
    if (playerShape.length === originalShape.length) {
      setTimeout(revealShape, 300);
    }
  } else {
    isDrawing = true;
    playerShape = [pos];
    drawFreehand();
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!drawingEnabled || drawModeToggle.checked || !isDrawing) return;
  const pos = getCanvasPos(e);
  playerShape.push(pos);
  drawFreehand();
});

canvas.addEventListener("pointerup", () => {
  if (!drawingEnabled || drawModeToggle.checked) return;
  isDrawing = false;
  revealShape();
});

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function getTimeMs() {
  const sec = parseFloat(document.getElementById("timeInput").value);
  return Math.max(1000, sec * 1000);
}

function newShape() {
  clearTimeout(viewTimer);
  const sides = parseInt(document.getElementById("sidesSelect").value);
  const time = getTimeMs();
  lastShape = originalShape.map(p => ({ ...p }));
  originalShape = generateShape(sides);
  playerShape = [];
  drawingEnabled = false;
  result.textContent = "";
  clearCanvas();
  drawGrid();
  drawShape(originalShape, "black");
  viewTimer = setTimeout(() => {
    clearCanvas();
    drawGrid();
    drawGivenPoints(originalShape);
    drawingEnabled = true;
  }, time);
}

function previousShape() {
  clearTimeout(viewTimer);
  if (!lastShape.length) return;
  originalShape = lastShape.map(p => ({ ...p }));
  playerShape = [];
  drawingEnabled = false;
  result.textContent = "";
  clearCanvas();
  drawGrid();
  drawShape(originalShape, "black");
  const time = getTimeMs();
  viewTimer = setTimeout(() => {
    clearCanvas();
    drawGrid();
    drawGivenPoints(originalShape);
    drawingEnabled = true;
  }, time);
}

function retryShape() {
  clearTimeout(viewTimer);
  const time = getTimeMs();
  playerShape = [];
  drawingEnabled = false;
  result.textContent = "";
  clearCanvas();
  drawGrid();
  drawShape(originalShape, "black");
  viewTimer = setTimeout(() => {
    clearCanvas();
    drawGrid();
    drawGivenPoints(originalShape);
    drawingEnabled = true;
  }, time);
}

function generateShape(sides) {
  if (sides === 1) {
    return [{
      x: Math.random() * (canvas.width - 40) + 20,
      y: Math.random() * (canvas.height - 40) + 20
    }];
  }

  const sizeMap = {
    small: 60,
    medium: 120,
    big: 180
  };
  const selectedSize = document.getElementById("sizeSelect");
  const radius = sizeMap[selectedSize.value] || 120;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const angleOffset = Math.random() * Math.PI * 2;

  const points = [];
  const angleStep = (2 * Math.PI) / sides;

  for (let i = 0; i < sides; i++) {
    const angle = angleStep * i + angleOffset;
    const r = radius * (0.9 + Math.random() * 0.2);
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }

  return points;
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
  const gridVal = parseInt(gridSelect.value);
  if (gridVal < 2) return;
  const spacing = canvas.width / gridVal;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < gridVal; i++) {
    let pos = spacing * i;
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(canvas.width, pos); ctx.stroke();
  }
}

function drawShape(points, color) {
  if (points.length === 1) { drawDot(points[0], color); return; }
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
}

function drawGivenPoints(points) {
  const extremes = {
    top: points.reduce((a, b) => (a.y < b.y ? a : b)),
    bottom: points.reduce((a, b) => (a.y > b.y ? a : b)),
    left: points.reduce((a, b) => (a.x < b.x ? a : b)),
    right: points.reduce((a, b) => (a.x > b.x ? a : b))
  };
  if (document.getElementById("giveHighest").checked) drawDot(extremes.top, "blue");
  if (document.getElementById("giveLowest").checked) drawDot(extremes.bottom, "blue");
  if (document.getElementById("giveLeftmost").checked) drawDot(extremes.left, "blue");
  if (document.getElementById("giveRightmost").checked) drawDot(extremes.right, "blue");
}

function drawDot(pt, color) {
  ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
}

function drawDots() {
  clearCanvas(); drawGrid();
  drawGivenPoints(originalShape);
  playerShape.forEach(pt => drawDot(pt, "red"));
}

function revealShape() {
  drawingEnabled = false;
  clearCanvas(); drawGrid(); drawShape(originalShape, "black");
  playerShape.forEach((p, i) => {
    const closest = originalShape.reduce((min, q) => {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      return d < min.d ? { d, q } : min;
    }, { d: Infinity });
    let color = "red";
    if (closest.d <= 5) color = "green";
    else if (closest.d <= 10) color = "orange";
    ctx.fillStyle = color;
    ctx.font = "16px sans-serif";
    ctx.fillText(i + 1, p.x + 6, p.y - 6);
  });
  result.textContent = "Reveal complete.";
  document.dispatchEvent(new CustomEvent('shapeRevealed'));
}

function drawFreehand() {
  clearCanvas(); drawGrid(); drawGivenPoints(originalShape);
  if (playerShape.length < 2) return;
  ctx.beginPath(); ctx.moveTo(playerShape[0].x, playerShape[0].y);
  for (let i = 1; i < playerShape.length; i++) ctx.lineTo(playerShape[i].x, playerShape[i].y);
  ctx.strokeStyle = "red"; ctx.lineWidth = 1.5; ctx.stroke();
}
