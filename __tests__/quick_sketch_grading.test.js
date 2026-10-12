import {gradeDrawing, rasterMatcher, vectorMatcher, averageAccuracy} from '../quick_sketch_grading.js';
import {pickPlate} from '../quick_sketch_references.js';
function image(width, height, pixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of pixels) data[(y * width + x) * 4 + 3] = 255;
  return {width, height, data};
}
test('raster grading separates accurate and inaccurate sections and ignores erased pixels', () => {
  const target = image(30, 30, Array.from({length: 30}, (_, x) => [x, 10]));
  const drawn = image(30, 30, [[3, 10], [4, 14], [5, 15], [6, 20]]);
  const result = gradeDrawing(drawn, rasterMatcher(target));
  expect(result.accuracy).toBe(50); expect(result.stats).toEqual({green: 2, red: 2});
  expect(result.colored[(10 * 30 + 3) * 4 + 1]).toBe(145);
  expect(result.colored[(20 * 30 + 6) * 4]).toBe(210);
  expect(gradeDrawing(image(30, 30, []), rasterMatcher(target)).accuracy).toBe(0);
});
test('vector matching uses segment projection and four-pixel tolerance', () => {
  const matches = vectorMatcher([[{x: 10, y: 10}, {x: 30, y: 10}]]);
  expect(matches(20, 14)).toBe(true); expect(matches(20, 15)).toBe(false); expect(matches(40, 10)).toBe(false);
});
test('reference shadow values are not treated as grading lines and empty targets fail', () => {
  const target = image(10, 10, [[3, 3]]); target.data.set([100, 100, 100, 255], (3 * 10 + 3) * 4);
  expect(() => rasterMatcher(target)).toThrow('No reference lines');
});
test('average includes blanks and vector selection avoids an immediate repeat', () => {
  expect(averageAccuracy([{accuracy: 100}, {accuracy: 0}, {accuracy: 50}])).toBe(50);
  const plates = [{name: 'a'}, {name: 'b'}]; expect(pickPlate(plates, plates[0], () => 0)).toBe(plates[1]);
  expect(pickPlate([plates[0]], plates[0])).toBe(plates[0]);
});
