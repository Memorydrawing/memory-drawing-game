import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';

let canvas, ctx, message, tapInstruction, nextBtn;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const center = { x: 0, y: 0 };
const DOT_RADIUS = 10;
let stage = 0; // 0: waiting for tap, 1: showing grade text, 2: final dots
let finalDots = [];

function drawCenterDot() {
  clearCanvas(ctx);
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(center.x, center.y, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function handleInitialTap(e) {
  const pos = getCanvasPos(canvas, e);
  const d = Math.hypot(pos.x - center.x, pos.y - center.y);
  let grade = 'red';
  if (d <= 5) {
    grade = 'green';
  } else if (d <= 10) {
    grade = 'yellow';
  }
  clearCanvas(ctx);
  ctx.fillStyle = grade === 'yellow' ? 'orange' : grade;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  audioCtx.resume();
  playSound(audioCtx, grade);
  stage = 1;
  setTimeout(() => {
    message.textContent = grade === 'green' ? 'Accurate' : grade === 'yellow' ? 'Semi-accurate' : 'Inaccurate';
    setTimeout(showFinalStage, 2000);
  }, 500);
}

function showFinalStage() {
  message.textContent = 'Many of the drills are based on your ability to accurately see and tap points such as this one. They are colored based on accuracy, and accompanied by sound feed back.';
  tapInstruction.style.display = 'block';
  drawFinalDots();
  nextBtn.style.display = 'block';
  stage = 2;
}

function drawFinalDots() {
  clearCanvas(ctx);
  const offset = 40;
  const y = center.y;
  finalDots = [
    { x: center.x - offset, y, grade: 'green' },
    { x: center.x, y, grade: 'yellow' },
    { x: center.x + offset, y, grade: 'red' }
  ];
  finalDots.forEach(d => {
    ctx.fillStyle = d.grade === 'yellow' ? 'orange' : d.grade;
    ctx.beginPath();
    ctx.arc(d.x, d.y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
}

function handleFinalTap(e) {
  const pos = getCanvasPos(canvas, e);
  for (const d of finalDots) {
    if (Math.hypot(pos.x - d.x, pos.y - d.y) <= DOT_RADIUS) {
      audioCtx.resume();
      playSound(audioCtx, d.grade);
      break;
    }
  }
}

function handleCanvasPointerDown(e) {
  if (stage === 0) {
    message.textContent = '';
    handleInitialTap(e);
  } else if (stage === 2) {
    handleFinalTap(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('tutorialCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  message = document.getElementById('message');
  tapInstruction = document.getElementById('tapInstruction');
  nextBtn = document.getElementById('nextBtn');
  center.x = canvas.width / 2;
  center.y = canvas.height / 2;
  drawCenterDot();
  canvas.addEventListener('pointerdown', handleCanvasPointerDown);
  nextBtn?.addEventListener('click', () => {
    window.location.href = 'drills.html';
  });
});
