// Time runs only while a pose is ready and the session is not paused.
export function createSketchClock({seconds, count, prepare, record, tick, complete, failure,
  now = () => performance.now(), schedule = (fn, ms) => setTimeout(fn, ms), unschedule = clearTimeout}) {
  let index = 0, remaining = seconds * 1000, deadline = 0, handle, generation = 0;
  let state = 'idle', paused = false;
  const stop = () => {unschedule(handle); handle = undefined;};
  function pulse() {
    if (state !== 'running') return;
    remaining = Math.max(0, deadline - now()); tick(Math.ceil(remaining / 1000), index + 1, count, paused);
    if (remaining <= 0) {
      stop(); state = 'between';
      try { record(index, false); } catch (error) {state = 'error'; failure(error); return;}
      index++;
      if (index >= count) {state = 'done'; complete();} else void next();
    } else handle = schedule(pulse, Math.min(100, remaining));
  }
  async function next() {
    const request = ++generation;
    state = 'loading'; remaining = seconds * 1000; tick(seconds, index + 1, count, paused);
    try {await prepare(index);} catch (error) {if (request === generation) {state = 'error'; failure(error);} return;}
    if (request !== generation) return;
    state = paused ? 'paused' : 'running'; deadline = now() + remaining;
    if (!paused) pulse(); else tick(seconds, index + 1, count, true);
  }
  return {
    start() {if (state === 'idle') return next();},
    pause() {paused = true; if (state === 'running') {remaining = Math.max(0, deadline - now()); stop(); state = 'paused'; tick(Math.ceil(remaining / 1000), index + 1, count, true);}},
    resume() {paused = false; if (state === 'paused') {state = 'running'; deadline = now() + remaining; pulse();}},
    finish() {
      if (state === 'done' || state === 'cancelled') return;
      stop(); ++generation;
      if (state === 'running' || state === 'paused') {
        try {record(index, true);} catch (error) {state = 'error'; failure(error); return;}
      }
      state = 'done'; complete();
    },
    cancel() {stop(); ++generation; state = 'cancelled';},
    getState: () => state
  };
}
