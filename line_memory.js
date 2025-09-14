import { getCanvasPos, clearCanvas, playSound } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { startCountdown } from './src/countdown.js';
import { calculateScore } from './src/scoring.js';
import { startScoreboard, updateScoreboard } from './src/scoreboard.js';

let canvas, ctx, startBtn, result, timerDisplay;
let playing = false;
let target = null;
let gameTimer = null;
let scoreKey = 'memory_lines';
let stopTimer = null;
let stats = { green: 0, yellow: 0, red: 0 };
let startTime = 0;

let drawing = false;
let minT = 1;
let maxT = 0;
let lastPos = null;
let offLineDist = 0;
let onLineDist = 0;

const tolerance = 4;
const maxOffSegmentRatio = 0.1;
const LINE_WIDTH = 2;
const PREVIEW_DELAY = 500; // ms to show previous target

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function randomLine() {
  const margin = 20;
  let x1, y1, x2, y2, dist;
  do {
    x1 = Math.random() * (canvas.width - 2 * margin) + margin;
    y1 = Math.random() * (canvas.height - 2 * margin) + margin;
    x2 = Math.random() * (canvas.width - 2 * margin) + margin;
    y2 = Math.random() * (canvas.height - 2 * margin) + margin;
    dist = Math.hypot(x2 - x1, y2 - y1);
  } while (dist < 20);
  return { x1, y1, x2, y2 };
}

function drawTarget() {
  clearCanvas(ctx);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(target.x1, target.y1);
  ctx.lineTo(target.x2, target.y2);
  ctx.stroke();

  const headLen = 10;
  const angle = Math.atan2(target.y2 - target.y1, target.x2 - target.x1);
  ctx.beginPath();
  ctx.moveTo(target.x2, target.y2);
  ctx.lineTo(
    target.x2 - headLen * Math.cos(angle - Math.PI / 6),
    target.y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    target.x2 - headLen * Math.cos(angle + Math.PI / 6),
    target.y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawTargetPreview(seg) {
  ctx.save();
  ctx.strokeStyle = 'gray';
  ctx.lineWidth = LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(seg.x1, seg.y1);
  ctx.lineTo(seg.x2, seg.y2);
  ctx.stroke();

  const headLen = 10;
  const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
  ctx.beginPath();
  ctx.moveTo(seg.x2, seg.y2);
  ctx.lineTo(
    seg.x2 - headLen * Math.cos(angle - Math.PI / 6),
    seg.y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    seg.x2 - headLen * Math.cos(angle + Math.PI / 6),
    seg.y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = 'gray';
  ctx.fill();
  ctx.restore();
}

function startGame() {
  hideStartButton(startBtn);
  audioCtx.resume();
  playing = true;
  stats = { green: 0, yellow: 0, red: 0 };
  startScoreboard(canvas);
  startTime = Date.now();
  result.textContent = '';
  startBtn.disabled = true;
  target = randomLine();
  drawTarget();
  stopTimer = startCountdown(timerDisplay, 60000);
  gameTimer = setTimeout(endGame, 60000);
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  if (stopTimer) stopTimer();
  clearCanvas(ctx);
  const elapsed = Date.now() - startTime;
  const { score: finalScore, accuracyPct, speed } = calculateScore(
    { green: stats.green, yellow: 0, red: stats.red },
    elapsed
  );
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, finalScore);
    const high = window.leaderboard.getHighScore(scoreKey);
    result.textContent = `Score: ${finalScore} (Best: ${high}) | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  } else {
    result.textContent = `Score: ${finalScore} | Accuracy: ${accuracyPct.toFixed(1)}% | Speed: ${speed.toFixed(2)}/s | Green: ${stats.green} Red: ${stats.red}`;
  }
}

function projectPointToSegment(p, seg) {
  const { x1, y1, x2, y2 } = seg;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = ((p.x - x1) * dx + (p.y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dist = Math.hypot(p.x - projX, p.y - projY);
  return { dist, t };
}

function pointerDown(e) {
  if (!playing) return;
  const pos = getCanvasPos(canvas, e);
  drawing = true;
  minT = 1;
  maxT = 0;
  offLineDist = 0;
  onLineDist = 0;
  lastPos = pos;

  const { dist } = projectPointToSegment(pos, target);
  if (dist <= tolerance) {
    // hide the target once drawing starts
    clearCanvas(ctx);
  } else {
    // still hide to enforce memory requirement
    clearCanvas(ctx);
  }

  canvas.setPointerCapture(e.pointerId);
}

function pointerMove(e) {
  if (!playing || !drawing) return;
  const pos = getCanvasPos(canvas, e);
  const dx = pos.x - lastPos.x;
  const dy = pos.y - lastPos.y;
  const segmentLen = Math.hypot(dx, dy);

  const { dist, t: normT } = projectPointToSegment(pos, target);

  ctx.beginPath();
  ctx.moveTo(lastPos.x, lastPos.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.lineWidth = LINE_WIDTH;
  if (dist <= tolerance) {
    ctx.strokeStyle = 'green';
    minT = Math.min(minT, normT);
    maxT = Math.max(maxT, normT);
    onLineDist += segmentLen;
  } else {
    ctx.strokeStyle = 'red';
    offLineDist += segmentLen;
  }
  ctx.stroke();
  lastPos = pos;
}

function pointerUp(e) {
  if (!playing || !drawing) return;
  drawing = false;
  canvas.releasePointerCapture(e.pointerId);
  const total = onLineDist + offLineDist;
  if (total > 0) {
    const offRatio = offLineDist / total;
    const coverage = maxT - minT;
    if (coverage >= 0.9 && offRatio <= maxOffSegmentRatio) {
      playSound(audioCtx, 'green');
      stats.green += 1;
      updateScoreboard('green');
    } else {
      playSound(audioCtx, 'red');
      stats.red += 1;
      updateScoreboard('red');
    }
  }
  const prevTarget = target;
  target = randomLine();
  drawTargetPreview(prevTarget);
  setTimeout(() => {
    clearCanvas(ctx);
    drawTarget();
  }, PREVIEW_DELAY);
  lastPos = null;
  onLineDist = 0;
  offLineDist = 0;
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  overlayStartButton(canvas, startBtn);
  result = document.getElementById('result');
  timerDisplay = document.getElementById('timer');
  scoreKey = canvas.dataset.scoreKey || scoreKey;

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  startBtn.addEventListener('click', startGame);
});

