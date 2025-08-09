const canvas = document.getElementById('angleCanvas');
const ctx = canvas.getContext('2d');
const optionsContainer = document.getElementById('angleOptions');
const result = document.getElementById('angleResult');

let availableAngles = [];
let currentAngle = null;
let correctCount = 0;
let totalSelected = 0;

function initOptions() {
  for (let a = 5; a <= 180; a += 5) {
    availableAngles.push(a);
    const label = document.createElement('label');
    label.className = 'angle-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.angle = a;

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

function drawAngle(angle) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const length = 200;
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
  const selected = parseInt(e.target.dataset.angle);
  e.target.disabled = true;
  const label = e.target.parentElement;
  if (selected === currentAngle) {
    label.classList.add('correct');
    correctCount++;
  } else {
    label.classList.add('incorrect');
  }
  totalSelected++;
  availableAngles = availableAngles.filter(a => a !== selected);

  if (totalSelected === 36) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    result.textContent = `You got ${correctCount} out of 36 correct.`;
  } else {
    nextAngle();
  }
}

function nextAngle() {
  if (!availableAngles.length) return;
  const idx = Math.floor(Math.random() * availableAngles.length);
  currentAngle = availableAngles[idx];
  drawAngle(currentAngle);
}

document.addEventListener('DOMContentLoaded', () => {
  initOptions();
  nextAngle();
});
