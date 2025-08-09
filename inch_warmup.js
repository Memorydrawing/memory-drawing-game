const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const result = document.getElementById('result');

let playing = false;
let drawing = false;
let startPos = null;
let endTime = 0;
let gameTimer = null;
let stats = null;
let currentArrow = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const PPI = window.devicePixelRatio * 96;

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawArrow() {
  const len = 40;
  const head = 10;
  const margin = PPI + len + head;
  currentArrow = {
    x: Math.random() * (canvas.width - 2 * margin) + margin,
    y: Math.random() * (canvas.height - 2 * margin) + margin,
    angle: Math.random() * Math.PI * 2
  };
  const endX = currentArrow.x + Math.cos(currentArrow.angle) * len;
  const endY = currentArrow.y + Math.sin(currentArrow.angle) * len;
  clearCanvas();
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(currentArrow.x, currentArrow.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX + Math.cos(currentArrow.angle + Math.PI * 5 / 6) * head,
             endY + Math.sin(currentArrow.angle + Math.PI * 5 / 6) * head);
  ctx.lineTo(endX + Math.cos(currentArrow.angle - Math.PI * 5 / 6) * head,
             endY + Math.sin(currentArrow.angle - Math.PI * 5 / 6) * head);
  ctx.closePath();
  ctx.fill();
}

function playSound(grade) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  if (grade === 'green') {
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (grade === 'yellow') {
    osc.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else {
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

function flashCorrectLine(callback) {
  const correctX = currentArrow.x + Math.cos(currentArrow.angle) * PPI;
  const correctY = currentArrow.y + Math.sin(currentArrow.angle) * PPI;
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 128, 0, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(currentArrow.x, currentArrow.y);
  ctx.lineTo(correctX, correctY);
  ctx.stroke();
  ctx.restore();
  setTimeout(() => {
    clearCanvas();
    callback();
  }, 300);
}

function pointerDown(e) {
  if (!playing) return;
  drawing = true;
  startPos = getCanvasPos(e);
  ctx.beginPath();
  ctx.moveTo(startPos.x, startPos.y);
}

function pointerMove(e) {
  if (!drawing) return;
  const pos = getCanvasPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function pointerUp(e) {
  if (!drawing) return;
  drawing = false;
  const pos = getCanvasPos(e);
  const d = Math.hypot(pos.x - startPos.x, pos.y - startPos.y);
  const inches = d / PPI;
  const err = Math.abs(inches - 1);
  stats.totalErr += err;
  stats.totalPoints++;
  let grade = 'red';
  if (err <= 1 / 32) {
    grade = 'green';
    stats.green++;
  } else if (err <= 1 / 16) {
    grade = 'yellow';
    stats.yellow++;
  } else {
    stats.red++;
  }
  playSound(grade);
  flashCorrectLine(() => {
    if (Date.now() < endTime) {
      drawArrow();
    } else {
      endGame();
    }
  });
}

function startGame() {
  audioCtx.resume();
  stats = { totalErr: 0, totalPoints: 0, green: 0, yellow: 0, red: 0 };
  playing = true;
  result.textContent = '';
  startBtn.disabled = true;
  endTime = Date.now() + 60000;
  gameTimer = setTimeout(endGame, 60000);
  drawArrow();
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  clearCanvas();
  const avg = stats.totalPoints ? stats.totalErr / stats.totalPoints : 0;
  result.textContent = `Average error: ${avg.toFixed(3)} in | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
  startBtn.disabled = false;
}

canvas.addEventListener('pointerdown', pointerDown);
canvas.addEventListener('pointermove', pointerMove);
canvas.addEventListener('pointerup', pointerUp);
startBtn.addEventListener('click', startGame);
