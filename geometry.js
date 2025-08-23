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

  const cx = width / 2;
  const cy = height / 2;
  const angleOffset = Math.random() * Math.PI * 2;

  const points = [];
  const angleStep = (2 * Math.PI) / sides;

  for (let i = 0; i < sides; i++) {
    const angle = angleStep * i + angleOffset;
    const r = radius * (0.4 + Math.random() * 0.8);
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }

  return points;
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

