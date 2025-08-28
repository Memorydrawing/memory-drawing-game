export function calculateScore(stats, durationMs) {
  const green = stats.green || 0;
  const yellow = stats.yellow || 0;
  const red = stats.red || 0;
  const total = green + yellow + red;
  const accuracy = total ? (green + yellow * 0.5) / total : 0;
  const accuracyPct = accuracy * 100;
  const seconds = durationMs > 0 ? durationMs / 1000 : 0;
  const speed = seconds > 0 ? green / seconds : 0;
  const score = Math.round(accuracy * 1000 + speed * 100);
  return { score, accuracyPct, speed };
}
