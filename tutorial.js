import { getCanvasPos, clearCanvas } from './src/utils.js';

let canvas, ctx, instructions;
let mode = 'idle';
let points = [];
let p2pStep = 0;
let drawing = false;
let lastPos = null;

function randomPoint() {
  const margin = 20;
  return {
    x: Math.random() * (canvas.width - 2 * margin) + margin,
    y: Math.random() * (canvas.height - 2 * margin) + margin
  };
}

function drawPoints() {
  clearCanvas(ctx);
  ctx.fillStyle = 'black';
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function startP2P() {
  mode = 'p2p';
  p2pStep = 0;
  points = [randomPoint(), randomPoint()];
  drawPoints();
  instructions.textContent = 'Click the first point, then the second.';
}

function startFreehand() {
  mode = 'freehand';
  drawing = false;
  clearCanvas(ctx);
  instructions.textContent = 'Hold and drag on the canvas to draw.';
}

function handlePointerDown(e) {
  const pos = getCanvasPos(canvas, e);
  if (mode === 'p2p') {
    const target = points[p2pStep];
    const d = Math.hypot(pos.x - target.x, pos.y - target.y);
    if (d < 10) {
      if (p2pStep === 0) {
        p2pStep = 1;
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
        instructions.textContent = 'Great! Now try freehand drawing.';
        mode = 'idle';
      }
    }
  } else if (mode === 'freehand') {
    drawing = true;
    lastPos = pos;
  }
}

function handlePointerMove(e) {
  if (mode === 'freehand' && drawing) {
    const pos = getCanvasPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos = pos;
  }
}

function handlePointerUp() {
  if (mode === 'freehand') {
    drawing = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('tutorialCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  instructions = document.getElementById('instructions');
  document.getElementById('p2pBtn')?.addEventListener('click', startP2P);
  document.getElementById('freehandBtn')?.addEventListener('click', startFreehand);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);
});
