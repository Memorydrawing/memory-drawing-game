import { calculateScore } from './scoring.js';

let stats = { green: 0, yellow: 0, red: 0 };
let startTime = 0;
let scoreEl = null;

export function startScoreboard(canvas) {
  let board = canvas?.nextElementSibling;
  if (!board || !board.classList.contains('scoreboard')) {
    board = document.createElement('div');
    board.className = 'scoreboard';
    const p = document.createElement('p');
    p.innerHTML = 'Score: <span class="score-value">0</span>';
    board.appendChild(p);
    canvas.insertAdjacentElement('afterend', board);
  }
  scoreEl = board.querySelector('.score-value');
  scoreEl.textContent = '0';
  stats = { green: 0, yellow: 0, red: 0 };
  startTime = Date.now();
}

export function updateScoreboard(color) {
  if (!scoreEl) return;
  if (color === 'green') stats.green++;
  else if (color === 'yellow' || color === 'orange') stats.yellow++;
  else stats.red++;
  const elapsed = Date.now() - startTime;
  const { score } = calculateScore(stats, elapsed);
  scoreEl.textContent = score.toString();
}

export function getCurrentScore() {
  const elapsed = Date.now() - startTime;
  const { score } = calculateScore(stats, elapsed);
  return score;
}
