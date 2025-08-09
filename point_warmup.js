const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const result = document.getElementById('result');

let currentPoint = null;
let showing = false;
let playing = false;
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

function drawDot(pt, color) {
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function showPoint() {
  currentPoint = {
    x: Math.random() * (canvas.width - 40) + 20,
    y: Math.random() * (canvas.height - 40) + 20
  };
  clearCanvas();
  drawDot(currentPoint, 'black');
  showing = true;
  setTimeout(() => {
    clearCanvas();
    showing = false;
  }, 500);
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

function handleClick(e) {
  if (!playing || showing) return;
  const pos = getCanvasPos(e);
  const d = Math.hypot(pos.x - currentPoint.x, pos.y - currentPoint.y);
  stats.totalDist += d;
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
  if (Date.now() < endTime) {
    showPoint();
  } else {
    endGame();
  }
}

function endGame() {
  if (!playing) return;
  playing = false;
  clearTimeout(gameTimer);
  clearCanvas();
  const avg = stats.totalPoints ? stats.totalDist / stats.totalPoints : 0;
  result.textContent = `Average error: ${avg.toFixed(1)} px | Green: ${stats.green} Yellow: ${stats.yellow} Red: ${stats.red}`;
  startBtn.disabled = false;
}

startBtn.addEventListener('click', () => {
  audioCtx.resume();
  stats = { totalDist: 0, totalPoints: 0, green: 0, yellow: 0, red: 0 };
  playing = true;
  showing = false;
  startBtn.disabled = true;
  result.textContent = '';
  endTime = Date.now() + 60000;
  gameTimer = setTimeout(endGame, 60000);
  showPoint();
});

canvas.addEventListener('pointerdown', handleClick);
