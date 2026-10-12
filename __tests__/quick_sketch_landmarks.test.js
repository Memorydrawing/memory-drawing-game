/** @jest-environment jsdom */
import {referenceExtrema, showReferenceDots} from '../quick_sketch_landmarks.js';
function image(points) {
  const data = new Uint8ClampedArray(20 * 20 * 4);
  points.forEach(([x, y]) => {data[(y * 20 + x) * 4 + 3] = 255;});
  return {width: 20, height: 20, data};
}
test('extrema lie on the rendered object, rather than bounding-box corners', () => {
  expect(referenceExtrema(image([[10, 2], [4, 9], [15, 8], [11, 17], [10, 8]]))).toEqual([
    {edge: 'top', x: 10, y: 2}, {edge: 'bottom', x: 11, y: 17}, {edge: 'left', x: 4, y: 9}, {edge: 'right', x: 15, y: 8}
  ]);
});
test('flat edges choose an actual middle pixel and empty references have no dots', () => {
  const points = referenceExtrema(image([[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [7, 12]]));
  expect(points[0]).toEqual({edge: 'top', x: 5, y: 3});
  expect(referenceExtrema(image([]))).toEqual([]);
});
test('dots are a separate SVG overlay replaced for each pose', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  showReferenceDots(svg, [{x: 10, y: 20}]);
  expect(svg.firstChild.getAttribute('cx')).toBe('10'); expect(svg.firstChild.getAttribute('r')).toBe('3');
  showReferenceDots(svg, [{x: 30, y: 40}]); expect(svg.childNodes.length).toBe(1);
  expect(svg.firstChild.getAttribute('cy')).toBe('40'); showReferenceDots(svg); expect(svg.childNodes.length).toBe(0);
});
