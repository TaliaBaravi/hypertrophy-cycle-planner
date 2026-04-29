import test from "node:test";
import assert from "node:assert/strict";

import {
  PRIORITY_CONFIG,
  allocateSetsAcrossSelections,
  createDeloadPrescription,
  generateNextWeekRecommendations,
  getMuscleVolumeTarget,
  recommendExerciseProgression,
  validateSplit
} from "../src/planner.js";

test("priority mapping gives high more sets than maintain", () => {
  const high = getMuscleVolumeTarget("HIGH", 4, 6);
  const medium = getMuscleVolumeTarget("MEDIUM", 4, 6);
  const maintain = getMuscleVolumeTarget("MAINTAIN", 4, 6);

  assert.ok(high > medium);
  assert.ok(medium > maintain);
});

test("split validation warns when high-priority muscle appears only once", () => {
  const warnings = validateSplit(
    [{ id: "day-1", dayIndex: 1, assignedMuscles: ["chest"] }],
    { chest: "HIGH", quads: "MEDIUM" }
  );

  assert.ok(warnings.some((warning) => warning.includes("high priority")));
});

test("set allocation spreads target sets across exercise selections", () => {
  const targets = new Map([["chest", 15]]);
  const allocations = allocateSetsAcrossSelections(
    targets,
    new Map([
      [
        "chest",
        [{ id: "a" }, { id: "b" }, { id: "c" }]
      ]
    ])
  );

  assert.equal(allocations.get("a") + allocations.get("b") + allocations.get("c"), 15);
});

test("exercise progression increases load when reps and RIR are strong", () => {
  const result = recommendExerciseProgression({
    current: {
      targetLoad: 100,
      targetSets: 3,
      repRange: [6, 10]
    },
    performance: {
      averageRir: 3,
      averageReps: 9.5
    },
    priority: "HIGH",
    nextSets: 4
  });

  assert.ok(result.targetLoad > 100);
  assert.equal(result.targetSets, 4);
});

test("exercise progression reduces load when fatigue is too high", () => {
  const result = recommendExerciseProgression({
    current: {
      targetLoad: 80,
      targetSets: 4,
      repRange: [8, 12]
    },
    performance: {
      averageRir: 0.5,
      averageReps: 7
    },
    priority: "MEDIUM",
    nextSets: 4
  });

  assert.ok(result.targetLoad < 80);
  assert.ok(result.reason.includes("Reduce load"));
});

test("deload week cuts sets and load", () => {
  const deload = createDeloadPrescription(
    { id: "meso-1" },
    7,
    [
      {
        trainingDayId: "day-1",
        exerciseId: "bench",
        exerciseName: "Bench",
        muscleGroupId: "chest",
        targetSets: 6,
        repRange: [6, 10],
        targetLoad: 100
      }
    ]
  );

  assert.equal(deload[0].targetSets, 3);
  assert.ok(deload[0].targetLoad < 100);
});

test("next-week recommendation escalates less for maintain muscles", () => {
  const mesocycle = {
    id: "meso-1",
    buildWeeks: 6,
    priorities: {
      chest: "HIGH",
      biceps: "MAINTAIN"
    },
    exerciseSelections: [
      { id: "sel-1", exerciseId: "bench", muscleGroupId: "chest", trainingDayId: "day-1" },
      { id: "sel-2", exerciseId: "curl", muscleGroupId: "biceps", trainingDayId: "day-2" }
    ]
  };
  const currentWeekPrescription = [
    {
      exerciseId: "bench",
      exerciseName: "Bench",
      muscleGroupId: "chest",
      trainingDayId: "day-1",
      targetSets: PRIORITY_CONFIG.HIGH.weeklySets.start,
      repRange: [6, 10],
      targetLoad: 100
    },
    {
      exerciseId: "curl",
      exerciseName: "Curl",
      muscleGroupId: "biceps",
      trainingDayId: "day-2",
      targetSets: PRIORITY_CONFIG.MAINTAIN.weeklySets.start,
      repRange: [10, 15],
      targetLoad: 30
    }
  ];
  const logsByExercise = {
    bench: [
      { reps: 10, load: 100, rir: 3 },
      { reps: 9, load: 100, rir: 3 }
    ],
    curl: [
      { reps: 15, load: 30, rir: 2 },
      { reps: 14, load: 30, rir: 2 }
    ]
  };
  const exerciseIndex = {
    bench: { name: "Bench" },
    curl: { name: "Curl" }
  };

  const result = generateNextWeekRecommendations({
    mesocycle,
    currentWeek: 1,
    currentWeekPrescription,
    logsByExercise,
    exerciseIndex
  });

  const bench = result.recommendations.find((entry) => entry.exerciseId === "bench");
  const curl = result.recommendations.find((entry) => entry.exerciseId === "curl");

  assert.ok(bench.suggestedSets >= currentWeekPrescription[0].targetSets);
  assert.ok(curl.suggestedSets <= currentWeekPrescription[1].targetSets + 1);
});
