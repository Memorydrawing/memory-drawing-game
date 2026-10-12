import {jest} from '@jest/globals';
import {createSketchClock} from '../quick_sketch_clock.js';
beforeEach(() => jest.useFakeTimers()); afterEach(() => jest.useRealTimers());
const flush = async () => {await Promise.resolve(); await Promise.resolve();};
function setup(extra = {}) {
  const prepare = jest.fn(async () => {}), record = jest.fn(), tick = jest.fn(), complete = jest.fn(), failure = jest.fn();
  const clock = createSketchClock({seconds: 1, count: 2, prepare, record, tick, complete, failure, now: () => Date.now(), ...extra});
  return {clock, prepare, record, tick, complete, failure};
}
test('selected count produces exactly that many saved attempts before review', async () => {
  const {clock, prepare, record, complete} = setup(); await clock.start();
  jest.advanceTimersByTime(1000); await flush();
  expect(record).toHaveBeenNthCalledWith(1, 0, false); expect(prepare).toHaveBeenCalledTimes(2);
  jest.advanceTimersByTime(1000); await flush();
  expect(record).toHaveBeenNthCalledWith(2, 1, false); expect(complete).toHaveBeenCalledTimes(1); expect(clock.getState()).toBe('done');
});
test('pause preserves remaining time and resume does not skip intervals', async () => {
  const {clock, record} = setup(); await clock.start(); jest.advanceTimersByTime(400); clock.pause();
  jest.advanceTimersByTime(10000); expect(record).not.toHaveBeenCalled();
  clock.resume(); jest.advanceTimersByTime(599); expect(record).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1); await flush(); expect(record).toHaveBeenCalledTimes(1);
});
test('timer waits for reference generation and cancel prevents a late start', async () => {
  let resolve; const {clock, record} = setup({prepare: () => new Promise(r => {resolve = r;})});
  const pending = clock.start(); jest.advanceTimersByTime(10000); expect(record).not.toHaveBeenCalled();
  clock.cancel(); resolve(); await pending; jest.advanceTimersByTime(10000); expect(clock.getState()).toBe('cancelled'); expect(record).not.toHaveBeenCalled();
});
test('early Finish saves current attempt once and completes; errors do not score a missing reference', async () => {
  const {clock, record, complete} = setup(); await clock.start(); clock.finish(); clock.finish();
  expect(record).toHaveBeenCalledTimes(1); expect(record).toHaveBeenCalledWith(0, true); expect(complete).toHaveBeenCalledTimes(1);
  const bad = setup({prepare: async () => {throw new Error('bad model');}}); await bad.clock.start();
  expect(bad.failure).toHaveBeenCalled(); expect(bad.record).not.toHaveBeenCalled();
});
