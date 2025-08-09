const builtInScenarios = {
  "Triangle Warmup": {
    time: 5,
    buffer: 1,
    challenge: 10,
    sides: 3,
    size: "medium",
    grid: "0",
    drawMode: true,
    giveHighest: false,
    giveLowest: false,
    giveLeftmost: false,
    giveRightmost: false,
    afterAction: "end",
    thresholdPoints: 1,
    thresholdGrade: "green"
  },
  "Square Drill": {
    time: 5,
    buffer: 0,
    challenge: 10,
    sides: 4,
    size: "medium",
    grid: "0",
    drawMode: true,
    giveHighest: false,
    giveLowest: false,
    giveLeftmost: false,
    giveRightmost: false,
    afterAction: "end",
    thresholdPoints: 1,
    thresholdGrade: "green"
  },
  "Point Warmup": {
    special: true
  }
};

function getScenario(name) {
  return builtInScenarios[name];
}

function getScenarioNames() {
  return Object.keys(builtInScenarios);
}
