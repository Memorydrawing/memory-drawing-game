import { generateShape, distancePointToSegment } from '../geometry.js';

describe('generateShape', () => {
  const width = 500;
  const height = 500;

  test('returns the requested number of points within bounds', () => {
    const points = generateShape(4, width, height, 'medium');
    expect(points).toHaveLength(4);
    points.forEach(pt => {
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.x).toBeLessThanOrEqual(width);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeLessThanOrEqual(height);
    });
  });

  test('handles single point generation', () => {
    const points = generateShape(1, width, height);
    expect(points).toHaveLength(1);
    const p = points[0];
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(width);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(height);
  });
});

describe('distancePointToSegment', () => {
  test('returns 0 for point on the segment', () => {
    const p = { x: 2, y: 2 };
    const a = { x: 0, y: 0 };
    const b = { x: 4, y: 4 };
    expect(distancePointToSegment(p, a, b)).toBeCloseTo(0);
  });

  test('computes perpendicular distance', () => {
    const p = { x: 0, y: 2 };
    const a = { x: 0, y: 0 };
    const b = { x: 4, y: 0 };
    expect(distancePointToSegment(p, a, b)).toBeCloseTo(2);
  });
});
