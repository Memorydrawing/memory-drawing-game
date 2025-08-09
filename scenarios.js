const builtInScenarios = {
  "Point Warmup": { special: true },
  "Angle Challenge": { special: true },
  "Inch Drill": { special: true }
};

function getSavedScenarios() {
  return JSON.parse(localStorage.getItem('scenarios') || '{}');
}

function getScenario(name) {
  return builtInScenarios[name] || getSavedScenarios()[name];
}

function getScenarioNames() {
  return Object.keys(builtInScenarios);
}
