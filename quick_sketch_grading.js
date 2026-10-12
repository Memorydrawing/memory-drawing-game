import {calculateScore} from './src/scoring.js';
import {distancePointToSegment} from './geometry.js';
export const STUDY_SIZE = 500;
export const LINE_TOLERANCE = 4;

// Use the same nearest-line tolerance as dexterity contours. A small spatial
// grid makes raster contour grading linear in the amount of drawn ink.
export function rasterMatcher(image, tolerance = LINE_TOLERANCE) {
  const {width, height, data} = image;
  const cells = new Map(), cellSize = Math.max(1, tolerance);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 128 || Math.max(data[i], data[i + 1], data[i + 2]) > 80) continue;
    const key = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push([x, y]);
  }
  if (!cells.size) throw new Error('No reference lines were generated. Try another model or orientation.');
  return (x, y) => {
    const cx = Math.floor(x / cellSize), cy = Math.floor(y / cellSize);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (const [px, py] of cells.get(`${cx + dx},${cy + dy}`) || []) {
        if ((px - x) ** 2 + (py - y) ** 2 <= tolerance ** 2) return true;
      }
    }
    return false;
  };
}
export function vectorMatcher(paths, tolerance = LINE_TOLERANCE) {
  return (x, y) => paths.some(path => path.slice(1).some((point, index) => distancePointToSegment({x, y}, path[index], point) <= tolerance));
}
export function gradeDrawing(image, matches) {
  const colored = new Uint8ClampedArray(image.data.length);
  const stats = {green: 0, red: 0};
  for (let i = 0; i < image.data.length; i += 4) {
    const alpha = image.data[i + 3];
    if (alpha < 32) continue;
    const pixel = i / 4, good = matches(pixel % image.width, Math.floor(pixel / image.width));
    stats[good ? 'green' : 'red']++;
    colored[i] = good ? 0 : 210; colored[i + 1] = good ? 145 : 25; colored[i + 2] = good ? 55 : 25; colored[i + 3] = alpha;
  }
  return {accuracy: calculateScore(stats, 0).accuracyPct, stats, colored};
}
export const averageAccuracy = attempts => attempts.length ? attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length : 0;
