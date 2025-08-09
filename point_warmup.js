const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const result = document.getElementById('result');

let playing = false;
let awaitingClick = false;
let target = null;
let endTime = 0;
let gameTimer = null;
let stats = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawTarget() {
  const margin = 20;
  target = {
    x: Math.random() * (canvas.width - 2 * margin) + margin,
    y: Math.random() * (canvas.height - 2 * margin) + margin
  };
  clearCanvas();
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
  ctx.fill();
  setTimeout(() => {
    clearCanvas();
    awaitingClick = true;
  }, 700);
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

function flashTarget(callback) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 128, 0, 0.7)';
  ctx.beginPath();
  ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  setTimeout(() => {
    clearCanvas();
    callback();
  }, 300);
}

function pointerDown(e) {
  if (!awaitingClick) return;
  awaitingClick = false;
  const pos = getCanvasPos(e);
  const d = Math.hypot(pos.x - target.x, pos.y - target.y);
  stats.totalErr += d;
  stats.totalPoints++;
  let grade = 'red';
  if (d <= 5) {
    grade = 'green';
    stats.green++;
  } else if (d <= 10) {
    grade = 'yellow';
    stats.yellow++;
  } else {
    stats.red++;
  }
  playSound(grade);
  flashTarget(() => {
    if (Date.now() < endTime) {
      drawTarget();
    } else {
      endGame();
    }
  });
}

function startGame() {
  audioCtx.resume();
  stats = { totalErr: 0, totalPoints: 0, green: 0, yellow: 0, red: 0 };
  playing = true;
  awaitingClick = false;
  result.textContent = '';
  startBtn.disabled = true;
  endTime = Date.now() + 60000;
  gameTimer = setTimeout(endGame, 60000);
  drawTarget();
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  clearCanvas();
  const avg = stats.totalPoints ? stats.totalErr / stats.totalPoints : 0;
  result.textContent = `Average error: ${avg.toFixed(1)} px | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
  startBtn.disabled = false;
}

canvas.addEventListener('pointerdown', pointerDown);
startBtn.addEventListener('click', startGame);
