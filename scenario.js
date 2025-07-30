let scenarioTimer = null;

function startScenario() {
  clearTimeout(viewTimer);
  clearTimeout(scenarioTimer);

  const lookTime = Math.max(1000, parseFloat(document.getElementById('timeInput').value) * 1000);
  const bufferTime = Math.max(0, parseFloat(document.getElementById('bufferInput').value) * 1000);
  const challengeLength = Math.max(1000, parseFloat(document.getElementById('challengeInput').value) * 1000);
  const sides = parseInt(document.getElementById('sidesSelect').value);

  lastShape = originalShape.map(p => ({ ...p }));
  originalShape = generateShape(sides);
  playerShape = [];
  drawingEnabled = false;
  result.textContent = '';
  clearCanvas();
  drawGrid();
  drawShape(originalShape, 'black');

  viewTimer = setTimeout(() => {
    clearCanvas();
    drawGrid();
    drawGivenPoints(originalShape);
    setTimeout(() => {
      drawingEnabled = true;
      scenarioTimer = setTimeout(() => {
        revealShape();
      }, challengeLength);
    }, bufferTime);
  }, lookTime);
}
