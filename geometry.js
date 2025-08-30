export function generateShape(sides, width, height, size = 'medium') {
  if (sides === 1) {
    return [{
      x: Math.random() * (width - 40) + 20,
      y: Math.random() * (height - 40) + 20
    }];
  }

  const sizeMap = {
    small: 60,
    medium: 120,
    big: 180
  };
  const radius = sizeMap[size] || 120;
  const minDim = 60;
  const minArea = (radius * radius) / 2;

  const cx = width / 2;
  const cy = height / 2;
  const angleStep = (2 * Math.PI) / sides;
  let points = [];
  let boxWidth = 0;
  let boxHeight = 0;
  let area = 0;

  do {
    const angleOffset = Math.random() * Math.PI * 2;
    points = [];
    for (let i = 0; i < sides; i++) {
      const angle = angleStep * i + angleOffset;
      const r = radius * (0.4 + Math.random() * 0.8);
      points.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      });
    }
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    boxWidth = Math.max(...xs) - Math.min(...xs);
    boxHeight = Math.max(...ys) - Math.min(...ys);
    area = polygonArea(points);
  } while (boxWidth < minDim || boxHeight < minDim || area < minArea);

  return points;
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(sum) / 2;
}

export function distancePointToSegment(p, a, b) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  const t = abLenSq === 0 ? 0 : ((ap.x * ab.x + ap.y * ab.y) / abLenSq);
  const clampedT = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + clampedT * ab.x, y: a.y + clampedT * ab.y };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

