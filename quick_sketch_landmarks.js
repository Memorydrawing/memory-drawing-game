// Find screen-space extrema of the reference ink. For a flat edge or tied
// extrema, choose an actual edge pixel near the middle of the tied points.
export function referenceExtrema({width, height, data}) {
  const edges = {top: [], bottom: [], left: [], right: []};
  let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 128 || Math.max(data[i], data[i + 1], data[i + 2]) > 80) continue;
    const point = {x, y};
    if (y < top) {top = y; edges.top = [];}
    if (y === top) edges.top.push(point);
    if (y > bottom) {bottom = y; edges.bottom = [];}
    if (y === bottom) edges.bottom.push(point);
    if (x < left) {left = x; edges.left = [];}
    if (x === left) edges.left.push(point);
    if (x > right) {right = x; edges.right = [];}
    if (x === right) edges.right.push(point);
  }
  return Object.entries(edges).filter(([, points]) => points.length).map(([edge, points]) => ({...points[Math.floor(points.length / 2)], edge}));
}
export function showReferenceDots(svg, points = []) {
  const doc = svg.ownerDocument;
  svg.replaceChildren(...points.map(point => {
    const dot = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', point.x); dot.setAttribute('cy', point.y); dot.setAttribute('r', '3');
    return dot;
  }));
}
