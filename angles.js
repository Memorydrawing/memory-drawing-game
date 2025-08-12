const canvas = document.getElementById('angleCanvas');
const ctx = canvas.getContext('2d');
let dpr = 1;
let displayWidth = 0;
let displayHeight = 0;
const optionsContainer = document.getElementById('angleOptions');
const result = document.getElementById('angleResult');
const startBtn = document.getElementById('startBtn');
const step = parseInt(new URLSearchParams(window.location.search).get('step')) || 5;

let remainingAngles = [];
let currentAngle = null;
let correct = 0;
let total = 0;
let playing = false;

function createOptions() {
  optionsContainer.innerHTML = '';
  for (let a = step; a <= 180; a += step) {
    const label = document.createElement('label');
    label.className = 'angle-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.angle = a;
    input.disabled = true;

    const box = document.createElement('span');
    box.className = 'box';

    const text = document.createTextNode(`${a}\u00B0`);

    label.appendChild(input);
    label.appendChild(box);
    label.appendChild(text);
    optionsContainer.appendChild(label);

    input.addEventListener('click', onSelect);
  }
}

function startGame() {
  remainingAngles = [];
  for (let a = step; a <= 180; a += step) remainingAngles.push(a);
  currentAngle = null;
  correct = 0;
  total = 0;
  result.textContent = '';
  optionsContainer.querySelectorAll('input').forEach(inp => {
    inp.disabled = false;
    inp.checked = false;
    const parent = inp.parentElement;
    parent.classList.remove('correct', 'incorrect');
  });
  startBtn.disabled = true;
  playing = true;
  nextAngle();
}

function drawAngle(angle) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const centerX = displayWidth / 2;
  const centerY = displayHeight / 2;
  const length = Math.min(displayWidth, displayHeight) / 2.5;
  const rotation = Math.random() * Math.PI * 2;

  const x1 = centerX + length * Math.cos(rotation);
  const y1 = centerY + length * Math.sin(rotation);
  const x2 = centerX + length * Math.cos(rotation + angle * Math.PI / 180);
  const y2 = centerY + length * Math.sin(rotation + angle * Math.PI / 180);

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'black';

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function onSelect(e) {
  if (!playing) return;
  const selected = parseInt(e.target.dataset.angle);
  e.target.disabled = true;
  const label = e.target.parentElement;
  if (selected === currentAngle) {
    label.classList.add('correct');
    correct++;
  } else {
    label.classList.add('incorrect');
  }
  total++;
  remainingAngles = remainingAngles.filter(a => a !== selected);
  if (remainingAngles.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    result.textContent = `You got ${correct} out of ${total} correct.`;
    playing = false;
    startBtn.disabled = false;
  } else {
    nextAngle();
  }
}

function nextAngle() {
  const idx = Math.floor(Math.random() * remainingAngles.length);
  currentAngle = remainingAngles[idx];
  drawAngle(currentAngle);
}

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  displayWidth = window.innerWidth;
  displayHeight = window.innerHeight;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (currentAngle !== null) drawAngle(currentAngle);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('backBtn')?.addEventListener('click', () => {
    window.location.href = 'scenarios.html';
  });
  createOptions();
  if (step !== 5) {
    const title = `Angle Challenge Drill (${step}\u00B0 increments)`;
    document.querySelector('h2').textContent = title;
    document.title = title;
  }
  startBtn.addEventListener('click', startGame);
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
});
