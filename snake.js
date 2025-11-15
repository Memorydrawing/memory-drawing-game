import { getCanvasPos, clearCanvas } from './src/utils.js';
import { overlayStartButton, hideStartButton } from './src/start-button.js';
import { createStrikeCounter } from './src/strike-counter.js';

const SNAKE_LENGTH = 420;
const SNAKE_SPEED = 95; // pixels per second
const STEP_SIZE = 4;
const TURN_ACCEL_VARIANCE = Math.PI * 1.5; // radians per second squared
const MAX_TURN_RATE = Math.PI / 2; // radians per second
const BOUNDARY_MARGIN = 35;
const TOLERANCE = 4;

let canvas;
let ctx;
let startBtn;
let timerDisplay;
let liveScoreEl;
let resultEl;
let scoreKey = 'snake';

let playing = false;
let animationId = null;
let lastTimestamp = null;

let snakePoints = [];
let snakeSegments = [];
let snakeLength = 0;
let headDirection = 0;
let turnVelocity = 0;

let drawing = false;
let lastPointerPos = null;
let playerSegments = [];
let playerLength = 0;
let score = 0;
let strikeCounter = null;
let strokeHadMiss = false;
let strokeHadMovement = false;

const MAX_STRIKES = 3;

function initSnake() {
  snakePoints = [];
  snakeSegments = [];
  snakeLength = 0;
  const startX = canvas.width / 2;
  const startY = canvas.height / 2;
  snakePoints.push({ x: startX, y: startY });
  snakePoints.push({ x: startX + 1, y: startY + 1 });
  snakeSegments.push(Math.sqrt(2));
  snakeLength = snakeSegments[0];
  headDirection = Math.random() * Math.PI * 2;
  turnVelocity = 0;
}

function advanceSnake(delta) {
  let distance = SNAKE_SPEED * delta;
  while (distance > 0) {
    const step = Math.min(STEP_SIZE, distance);
    const stepTime = step / SNAKE_SPEED;
    const turnAccel = (Math.random() - 0.5) * TURN_ACCEL_VARIANCE * stepTime;
    turnVelocity = Math.max(
      -MAX_TURN_RATE,
      Math.min(MAX_TURN_RATE, turnVelocity + turnAccel)
    );
    headDirection += turnVelocity * stepTime;

    const head = snakePoints[snakePoints.length - 1];
    let nextX = head.x + Math.cos(headDirection) * step;
    let nextY = head.y + Math.sin(headDirection) * step;

    if (
      nextX < BOUNDARY_MARGIN ||
      nextX > canvas.width - BOUNDARY_MARGIN ||
      nextY < BOUNDARY_MARGIN ||
      nextY > canvas.height - BOUNDARY_MARGIN
    ) {
      const centerAngle = Math.atan2(
        canvas.height / 2 - head.y,
        canvas.width / 2 - head.x
      );
      headDirection = centerAngle;
      turnVelocity = (Math.random() - 0.5) * (MAX_TURN_RATE / 2);
      nextX = head.x + Math.cos(headDirection) * step;
      nextY = head.y + Math.sin(headDirection) * step;
    }

    addSnakePoint(nextX, nextY);
    distance -= step;
  }
}

function addSnakePoint(x, y) {
  const last = snakePoints[snakePoints.length - 1];
  const dx = x - last.x;
  const dy = y - last.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  snakePoints.push({ x, y });
  snakeSegments.push(len);
  snakeLength += len;
  trimSnake();
}

function trimSnake() {
  let excess = snakeLength - SNAKE_LENGTH;
  while (excess > 0 && snakeSegments.length > 0) {
    const segLen = snakeSegments[0];
    if (segLen <= excess + 0.001) {
      excess -= segLen;
      snakeLength -= segLen;
      snakeSegments.shift();
      snakePoints.shift();
    } else {
      const ratio = excess / segLen;
      const first = snakePoints[0];
      const second = snakePoints[1];
      first.x += (second.x - first.x) * ratio;
      first.y += (second.y - first.y) * ratio;
      snakeSegments[0] = segLen - excess;
      snakeLength -= excess;
      excess = 0;
    }
  }
}

function trimPlayerPath() {
  let excess = playerLength - SNAKE_LENGTH;
  while (excess > 0 && playerSegments.length > 0) {
    const seg = playerSegments[0];
    if (seg.length <= excess + 0.001) {
      excess -= seg.length;
      playerLength -= seg.length;
      playerSegments.shift();
    } else {
      const ratio = excess / seg.length;
      seg.start.x += (seg.end.x - seg.start.x) * ratio;
      seg.start.y += (seg.end.y - seg.start.y) * ratio;
      seg.length -= excess;
      playerLength -= excess;
      excess = 0;
    }
  }
}

function renderSnake() {
  if (snakePoints.length < 2) return;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(snakePoints[0].x, snakePoints[0].y);
  for (let i = 1; i < snakePoints.length; i++) {
    ctx.lineTo(snakePoints[i].x, snakePoints[i].y);
  }
  ctx.stroke();

  const head = snakePoints[snakePoints.length - 1];
  const prev = snakePoints[snakePoints.length - 2];
  const angle = Math.atan2(head.y - prev.y, head.x - prev.x);
  const arrowLength = 16;
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(
    head.x - arrowLength * Math.cos(angle - Math.PI / 6),
    head.y - arrowLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    head.x - arrowLength * Math.cos(angle + Math.PI / 6),
    head.y - arrowLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function renderPlayerPath() {
  if (!playerSegments.length) return;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  playerSegments.forEach(seg => {
    ctx.strokeStyle = seg.color;
    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();
  });
}

function render() {
  clearCanvas(ctx);
  renderSnake();
  renderPlayerPath();
}

function animate(timestamp) {
  if (!playing) return;
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;
  advanceSnake(delta);
  render();
  animationId = requestAnimationFrame(animate);
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  let t = 0;
  if (lengthSq > 0) {
    t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
  }
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

function distanceToSnake(point) {
  if (snakePoints.length < 2) return Infinity;
  let minDist = Infinity;
  for (let i = 0; i < snakePoints.length - 1; i++) {
    const d = distanceToSegment(point, snakePoints[i], snakePoints[i + 1]);
    if (d < minDist) {
      minDist = d;
    }
  }
  return minDist;
}

function addPlayerSegment(start, end, color) {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length === 0) return;
  playerSegments.push({
    start: { ...start },
    end: { ...end },
    color,
    length
  });
  playerLength += length;
  trimPlayerPath();
}

function updateLiveScore() {
  if (liveScoreEl) {
    liveScoreEl.textContent = `Score: ${Math.round(score)}`;
  }
}

function pointerDown(e) {
  if (!playing) return;
  drawing = true;
  lastPointerPos = getCanvasPos(canvas, e);
  strokeHadMiss = false;
  strokeHadMovement = false;
  if (canvas.setPointerCapture) {
    canvas.setPointerCapture(e.pointerId);
  }
}

function pointerMove(e) {
  if (!playing || !drawing || !lastPointerPos) return;
  const pos = getCanvasPos(canvas, e);
  const segmentLength = Math.hypot(pos.x - lastPointerPos.x, pos.y - lastPointerPos.y);
  if (segmentLength === 0) return;

  strokeHadMovement = true;
  const midpoint = {
    x: (pos.x + lastPointerPos.x) / 2,
    y: (pos.y + lastPointerPos.y) / 2
  };
  const distance = distanceToSnake(midpoint);
  const color = distance <= TOLERANCE ? 'green' : 'red';
  if (color === 'green') {
    score += segmentLength;
    updateLiveScore();
  } else {
    strokeHadMiss = true;
  }
  addPlayerSegment(lastPointerPos, pos, color);
  lastPointerPos = pos;
}

function pointerUp(e) {
  if (!playing || !drawing) return;
  drawing = false;
  if (e.pointerId && canvas.releasePointerCapture) {
    try {
      if (!canvas.hasPointerCapture || canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // ignore browsers that throw if capture is already released
    }
  }
  lastPointerPos = null;

  if (!strokeHadMovement || !strikeCounter) {
    return;
  }
  if (strokeHadMiss) {
    if (strikeCounter.registerFailure()) {
      endGame('strikes');
    }
  } else {
    strikeCounter.registerSuccess();
  }
}

function resetPlayerPath() {
  playerSegments = [];
  playerLength = 0;
  lastPointerPos = null;
  score = 0;
  updateLiveScore();
}

function startGame() {
  hideStartButton(startBtn);
  playing = true;
  lastTimestamp = null;
  initSnake();
  resetPlayerPath();
  resultEl.textContent = '';
  render();
  strikeCounter = createStrikeCounter(timerDisplay, MAX_STRIKES);
  startBtn.disabled = true;
  animationId = requestAnimationFrame(animate);
}

function endGame(reason = 'complete') {
  if (!playing) return;
  playing = false;
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  render();
  const finalScore = Math.round(score);
  const prefix = reason === 'strikes' ? 'Out of strikes! ' : '';
  if (window.leaderboard) {
    window.leaderboard.updateLeaderboard(scoreKey, finalScore);
    const high = window.leaderboard.getHighScore(scoreKey);
    resultEl.textContent = `${prefix}Score: ${finalScore} (Best: ${high})`;
  } else {
    resultEl.textContent = `${prefix}Score: ${finalScore}`;
  }
  startBtn.style.display = '';
  startBtn.disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  startBtn = document.getElementById('startBtn');
  timerDisplay = document.getElementById('timer');
  liveScoreEl = document.getElementById('liveScore');
  resultEl = document.getElementById('result');
  scoreKey = canvas.dataset.scoreKey || scoreKey;

  overlayStartButton(canvas, startBtn);
  updateLiveScore();

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointerleave', pointerUp);
  startBtn.addEventListener('click', startGame);
});
