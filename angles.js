import { playSound } from './src/utils.js';

const canvas = document.getElementById('angleCanvas');
const ctx = canvas.getContext('2d');
const optionsContainer = document.getElementById('angleOptions');
const result = document.getElementById('angleResult');
const startBtn = document.getElementById('startBtn');
const step = parseInt(new URLSearchParams(window.location.search).get('step')) || 5;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let rotation = 0;
let centerX = 0;
let centerY = 0;
const length = 200;

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
  audioCtx.resume();
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
    parent.classList.remove('correct', 'incorrect', 'close');
  });
  startBtn.disabled = true;
  playing = true;
  nextAngle();
}

function drawAngle(angle) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  centerX = canvas.width / 2;
  centerY = canvas.height / 2;
  rotation = Math.random() * Math.PI * 2;

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

function showSelection(angle, grade) {
  const x = centerX + length * Math.cos(rotation + angle * Math.PI / 180);
  const y = centerY + length * Math.sin(rotation + angle * Math.PI / 180);
  ctx.save();
  ctx.strokeStyle = grade === 'green' ? 'green' : grade === 'yellow' ? 'yellow' : 'red';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

function onSelect(e) {
  if (!playing) return;
  playing = false;
  const selected = parseInt(e.target.dataset.angle);
  e.target.disabled = true;
  const label = e.target.parentElement;
  const diff = Math.abs(selected - currentAngle);
  let grade;
  if (diff === 0) {
    grade = 'green';
    label.classList.add('correct');
    correct++;
  } else if (diff === step) {
    grade = 'yellow';
    label.classList.add('close');
  } else {
    grade = 'red';
    label.classList.add('incorrect');
  }
  total++;
  playSound(audioCtx, grade);
  showSelection(selected, grade);
  remainingAngles = remainingAngles.filter(a => a !== selected);
  const done = remainingAngles.length === 0;
  setTimeout(() => {
    if (done) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      result.textContent = `You got ${correct} out of ${total} correct.`;
      startBtn.disabled = false;
      playing = false;
    } else {
      nextAngle();
      playing = true;
    }
  }, 500);
}

function nextAngle() {
  const idx = Math.floor(Math.random() * remainingAngles.length);
  currentAngle = remainingAngles[idx];
  drawAngle(currentAngle);
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
});
