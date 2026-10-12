import {showReferenceDots} from './quick_sketch_landmarks.js';
import {createSessionReference} from './quick_sketch_references.js';
import {createSketchDrawing} from './quick_sketch_drawing.js';
import {createSketchClock} from './quick_sketch_clock.js';
import {gradeDrawing, averageAccuracy, STUDY_SIZE} from './quick_sketch_grading.js';

export function createQuickSketchSession(root = document, {referenceFactory = createSessionReference, drawingFactory = createSketchDrawing, clockFactory = createSketchClock} = {}) {
  const get = id => root.getElementById(id);
  const canvas = get('sketchDrawCanvas'), referenceCanvas = get('sketchReferenceCanvas');
  const ctx = referenceCanvas.getContext('2d');
  const dots = get('sketchReferenceDots');
  const drawing = drawingFactory(canvas, get('sketchToolbar'));
  let clock, source, current, attempts = [], token = 0, paused = false;
  function setPhase(phase) {
    get('quickSketchSetup').hidden = phase !== 'setup'; get('quickSketchActive').hidden = phase !== 'active'; get('quickSketchReview').hidden = phase !== 'review';
    root.querySelector('main').classList.toggle('quick-sketch-wide', phase !== 'setup');
    for (const name of ['setup', 'active', 'review']) {
      const element = get(`${name}Step`); if (name === phase) element.setAttribute('aria-current', 'step'); else element.removeAttribute('aria-current');
    }
  }
  function snapshot(image, ink, fade = false) {
    const result = root.createElement('canvas'); result.width = result.height = STUDY_SIZE;
    const context = result.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, STUDY_SIZE, STUDY_SIZE);
    if (image) {context.globalAlpha = fade ? .6 : 1; context.drawImage(image, 0, 0); context.globalAlpha = 1;}
    if (ink) {
      const layer = root.createElement('canvas'); layer.width = layer.height = STUDY_SIZE;
      const data = layer.getContext('2d').createImageData(STUDY_SIZE, STUDY_SIZE); data.data.set(ink);
      layer.getContext('2d').putImageData(data, 0, 0); context.drawImage(layer, 0, 0);
    }
    return result.toDataURL('image/png');
  }
  function record(index, partial) {
    drawing.setEnabled(false);
    const image = drawing.capture(), grade = gradeDrawing(image, current.matches);
    attempts.push({number: index + 1, name: current.name, partial, accuracy: grade.accuracy,
      drawing: snapshot(null, image.data), contourOverlay: snapshot(current.lines, grade.colored, true)});
    current = null;
  }
  function review() {
    ++token;
    drawing.setEnabled(false); source?.dispose(); source = null; setPhase('review');
    get('sketchAverage').textContent = `Average accuracy: ${averageAccuracy(attempts).toFixed(1)}% · ${attempts.length} ${attempts.length === 1 ? 'attempt' : 'attempts'}`;
    get('sketchAttempts').replaceChildren(...attempts.map(attempt => {
      const button = root.createElement('button'); button.type = 'button'; button.className = 'sketch-attempt';
      const image = root.createElement('img'); image.src = attempt.contourOverlay; image.alt = `Drawing from interval ${attempt.number}`;
      const caption = root.createElement('span'); caption.textContent = `Attempt ${attempt.number}${attempt.partial ? ' (ended early)' : ''} · ${attempt.accuracy.toFixed(1)}%`;
      button.append(image, caption); button.addEventListener('click', () => {
        get('sketchAttemptTitle').textContent = `Attempt ${attempt.number} · ${attempt.accuracy.toFixed(1)}%`;
        get('sketchAttemptImage').src = attempt.contourOverlay;
        get('sketchAttemptDialog').showModal();
      }); return button;
    }));
    get('sketchReviewTitle').focus();
  }
  function fail(error) {drawing.setEnabled(false); get('sketchActiveStatus').textContent = error.message || 'The reference could not be prepared.'; get('sketchPause').disabled = true;}
  function cancel() {++token; clock?.cancel(); clock = null; drawing.setEnabled(false); source?.dispose(); source = null; current = null;}
  async function start(session) {
    cancel(); const request = token;
    attempts = []; paused = false; setPhase('active'); get('activeTitle').focus();
    get('sketchPause').disabled = true; get('sketchPause').textContent = 'Pause';
    get('sketchActiveStatus').textContent = 'Preparing reference…'; get('sketchTimer').textContent = '—';
    get('sketchIntervalTally').textContent = `Interval 1 / ${session.intervals}`;
    drawing.reset(); showReferenceDots(dots); ctx.clearRect(0, 0, STUDY_SIZE, STUDY_SIZE);
    try {
      const prepared = await referenceFactory(session);
      if (request !== token) {prepared.dispose(); return;}
      source = prepared;
      clock = clockFactory({seconds: session.time, count: session.intervals,
        async prepare() {
          drawing.setEnabled(false); drawing.reset(); showReferenceDots(dots); get('sketchActiveStatus').textContent = 'Preparing next reference…';
          const reference = await source.next(); if (request !== token) return;
          current = reference; showReferenceDots(dots, reference.points); ctx.clearRect(0, 0, STUDY_SIZE, STUDY_SIZE); ctx.drawImage(reference.image, 0, 0);
          get('sketchActiveStatus').textContent = reference.name;
        }, record,
        tick(seconds, index, count) {
          get('sketchTimer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
          get('sketchIntervalTally').textContent = `Interval ${index} / ${count}`;
          const ready = clock?.getState() === 'running'; drawing.setEnabled(ready);
          get('sketchPause').disabled = clock?.getState() === 'loading';
          if (paused) get('sketchActiveStatus').textContent = 'Paused — press Resume when you’re ready.';
        }, complete: review, failure: fail});
      if (root.hidden) {paused = true; clock.pause(); get('sketchPause').textContent = 'Resume';}
      await clock.start();
    } catch (error) {if (request === token) fail(error);}
  }
  get('sketchPause').addEventListener('click', () => {
    paused = !paused; if (paused) clock?.pause(); else {get('sketchActiveStatus').textContent = current?.name || ''; clock?.resume();}
    get('sketchPause').textContent = paused ? 'Resume' : 'Pause';
  });
  root.addEventListener('visibilitychange', () => {
    if (root.hidden && !get('quickSketchActive').hidden && clock) {paused = true; clock.pause(); get('sketchPause').textContent = 'Resume';}
  });
  get('sketchFinish').addEventListener('click', () => {if (clock) clock.finish(); else {cancel(); review();}});
  get('sketchEditSetup').addEventListener('click', () => {cancel(); setPhase('setup'); get('sketchTime').focus();});
  get('sketchNewSession').addEventListener('click', () => {cancel(); setPhase('setup'); get('sketchTime').focus();});
  return {start, cancel, getAttempts: () => attempts};
}
