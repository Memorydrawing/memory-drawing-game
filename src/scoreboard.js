import { calculateScore } from './scoring.js';

let stats = { green: 0, red: 0 };
let startTime = 0;
let scoreEl = null;
let boardEl = null;
let lastScore = 0;
let animFrame = null;

export function startScoreboard(canvas) {
  boardEl = canvas?.nextElementSibling;
  if (!boardEl || !boardEl.classList.contains('scoreboard')) {
    boardEl = document.createElement('div');
    boardEl.className = 'scoreboard';
    const p = document.createElement('p');
    p.className = 'score-value';
    p.textContent = '0';
    boardEl.appendChild(p);
    canvas.insertAdjacentElement('afterend', boardEl);
  }
  scoreEl = boardEl.querySelector('.score-value');
  scoreEl.textContent = '0';
  stats = { green: 0, red: 0 };
  startTime = Date.now();
  lastScore = 0;
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = null;
}

export function updateScoreboard(color) {
  if (!scoreEl) return;
  if (color === 'green') stats.green++;
  else stats.red++;
  const elapsed = Date.now() - startTime;
  const { score } = calculateScore(stats, elapsed);
  const delta = score - lastScore;
  animateScore(lastScore, score);
  if (delta !== 0 && boardEl) {
    scoreEl.classList.remove('increase', 'decrease');
    scoreEl.classList.add(delta > 0 ? 'increase' : 'decrease');
    setTimeout(() => scoreEl.classList.remove('increase', 'decrease'), 500);

    const changeEl = document.createElement('span');
    changeEl.className = `score-change ${delta > 0 ? 'positive' : 'negative'}`;
    changeEl.textContent = `${delta > 0 ? '+' : ''}${delta}`;
    boardEl.appendChild(changeEl);
    setTimeout(() => changeEl.remove(), 1000);
  }
  lastScore = score;
}

export function getCurrentScore() {
  const elapsed = Date.now() - startTime;
  const { score } = calculateScore(stats, elapsed);
  return score;
}

function animateScore(from, to) {
  if (!scoreEl) return;
  if (animFrame) cancelAnimationFrame(animFrame);
  const duration = 500;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.round(from + (to - from) * progress);
    scoreEl.textContent = value.toString();
    if (progress < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      animFrame = null;
    }
  };
  animFrame = requestAnimationFrame(step);
}
