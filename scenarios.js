const builtInScenarios = {
  "Angle Challenge": { special: true },
  "Inch Drill": { special: true },
  "Point Drill 0.5 sec Look": { special: true },
  "Point Drill 0.25 sec Look": { special: true },
  "Point Drill 0.1 sec Look": { special: true }
};

function getSavedScenarios() {
  return JSON.parse(localStorage.getItem('scenarios') || '{}');
}

function getScenario(name) {
  return builtInScenarios[name] || getSavedScenarios()[name];
}

function getScenarioNames() {
  return [...Object.keys(builtInScenarios), ...Object.keys(getSavedScenarios())];
}
