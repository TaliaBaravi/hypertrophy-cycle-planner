import { MUSCLE_GROUPS } from "./data.js";
import { average, clamp, createId, groupBy, roundToIncrement } from "./utils.js";

export const PRIORITY_CONFIG = {
  HIGH: {
    weeklySets: { start: 14, end: 20 },
    repRange: [6, 10],
    setJumpWeeks: [2, 4, 5]
  },
  MEDIUM: {
    weeklySets: { start: 10, end: 14 },
    repRange: [8, 12],
    setJumpWeeks: [3, 5]
  },
  MAINTAIN: {
    weeklySets: { start: 6, end: 8 },
    repRange: [10, 15],
    setJumpWeeks: [4]
  }
};

const DELOAD_MULTIPLIER = 0.55;
const DELOAD_LOAD_MULTIPLIER = 0.9;

export function getWeekLabel(mesocycle, weekNumber) {
  return weekNumber <= mesocycle.buildWeeks ? `Build Week ${weekNumber}` : "Deload Week";
}

export function getMuscleVolumeTarget(priority, buildWeek, buildWeeks) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MAINTAIN;
  const progress = buildWeeks === 1 ? 1 : (buildWeek - 1) / (buildWeeks - 1);
  const interpolated =
    config.weeklySets.start + (config.weeklySets.end - config.weeklySets.start) * progress;
  return Math.round(interpolated);
}

export function validateSplit(days, priorities) {
  const warnings = [];
  const appearances = new Map();

  days.forEach((day) => {
    day.assignedMuscles.forEach((muscleId) => {
      appearances.set(muscleId, (appearances.get(muscleId) || 0) + 1);
    });
  });

  MUSCLE_GROUPS.forEach((muscle) => {
    const priority = priorities[muscle.id] || "MAINTAIN";
    const count = appearances.get(muscle.id) || 0;

    if (priority === "HIGH" && count < 2) {
      warnings.push(`${muscle.name} is high priority but only appears on ${count || 0} day(s).`);
    }

    if (priority !== "MAINTAIN" && count === 0) {
      warnings.push(`${muscle.name} has ${priority.toLowerCase()} priority but is not assigned to any training day.`);
    }
  });

  return warnings;
}

export function createMesocycle({
  buildWeeks,
  trainingDays,
  priorities,
  dayAssignments,
  exerciseSelections,
  baselineInputs,
  exerciseIndex
}) {
  const mesocycleId = createId("mesocycle");
  const days = dayAssignments.map((assignment, index) => ({
    id: createId("day"),
    mesocycleId,
    dayIndex: index + 1,
    name: assignment.name || `Day ${index + 1}`,
    assignedMuscles: assignment.assignedMuscles
  }));

  const warnings = validateSplit(days, priorities);
  const exerciseSelectionsWithIds = exerciseSelections.map((selection, order) => ({
    id: createId("selection"),
    mesocycleId,
    order,
    ...selection,
    trainingDayId: days[selection.trainingDayIndex]?.id
  }));

  const mesocycle = {
    id: mesocycleId,
    userId: "local-user",
    startDate: new Date().toISOString(),
    buildWeeks,
    deloadWeekIncluded: true,
    status: "active",
    trainingDays,
    priorities,
    currentWeek: 1,
    trainingDaysDetail: days,
    warnings,
    exerciseSelections: exerciseSelectionsWithIds
  };

  const weekOne = generateWeekOnePrescription(mesocycle, baselineInputs, exerciseIndex);
  const prescriptions = { 1: weekOne };

  return {
    mesocycle,
    prescriptions,
    workoutLogs: {},
    recommendations: {}
  };
}

export function generateWeekOnePrescription(mesocycle, baselineInputs, exerciseIndex) {
  const buildWeek = 1;
  const muscleTargets = createMuscleTargets(mesocycle, buildWeek);
  const selectionsByMuscle = groupSelectionsByMuscle(mesocycle.exerciseSelections);
  const muscleSetAllocations = allocateSetsAcrossSelections(muscleTargets, selectionsByMuscle);

  return mesocycle.exerciseSelections.map((selection) => {
    const exercise = exerciseIndex[selection.exerciseId];
    const baseline = baselineInputs[selection.exerciseId];
    const repRange = baseline?.repRange || PRIORITY_CONFIG[mesocycle.priorities[selection.muscleGroupId]].repRange;
    return {
      id: createId("prescription"),
      mesocycleId: mesocycle.id,
      weekNumber: 1,
      trainingDayId: selection.trainingDayId,
      exerciseId: selection.exerciseId,
      exerciseName: exercise.name,
      muscleGroupId: selection.muscleGroupId,
      targetSets: muscleSetAllocations.get(selection.id) || baseline?.targetSets || 3,
      repRange,
      targetLoad: Number(baseline?.targetLoad || 0),
      notes: baseline?.notes || "Start at a controlled 2-3 RIR baseline."
    };
  });
}

export function generateNextWeekRecommendations({
  mesocycle,
  currentWeek,
  currentWeekPrescription,
  logsByExercise,
  exerciseIndex
}) {
  const isDeloadNext = currentWeek >= mesocycle.buildWeeks;
  const nextWeek = currentWeek + 1;
  if (isDeloadNext) {
    const deload = createDeloadPrescription(mesocycle, nextWeek, currentWeekPrescription);
    return {
      recommendations: deload.map((item) => ({
        id: createId("recommendation"),
        weekNumber: currentWeek,
        nextWeekNumber: nextWeek,
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
        suggestedSets: item.targetSets,
        suggestedRepRange: item.repRange,
        suggestedLoad: item.targetLoad,
        reason: item.notes
      })),
      nextWeekPrescription: deload
    };
  }

  const nextWeekMuscleTargets = createMuscleTargets(mesocycle, nextWeek);
  const selectionsByMuscle = groupSelectionsByMuscle(mesocycle.exerciseSelections);
  const nextSetAllocations = allocateSetsAcrossSelections(nextWeekMuscleTargets, selectionsByMuscle);

  const recommendations = currentWeekPrescription.map((item) => {
    const priority = mesocycle.priorities[item.muscleGroupId];
    const logEntries = logsByExercise[item.exerciseId] || [];
    const performance = summarizeExerciseLogs(logEntries);
    const nextSets = nextSetAllocations.get(findSelectionId(mesocycle, item.exerciseId, item.trainingDayId)) || item.targetSets;
    const suggestion = recommendExerciseProgression({
      exerciseName: item.exerciseName,
      current: item,
      performance,
      priority,
      nextSets
    });

    return {
      id: createId("recommendation"),
      weekNumber: currentWeek,
      nextWeekNumber: nextWeek,
      exerciseId: item.exerciseId,
      exerciseName: exerciseIndex[item.exerciseId].name,
      suggestedSets: suggestion.targetSets,
      suggestedRepRange: suggestion.repRange,
      suggestedLoad: suggestion.targetLoad,
      reason: suggestion.reason
    };
  });

  return {
    recommendations,
    nextWeekPrescription: recommendations.map((item) => ({
      id: createId("prescription"),
      mesocycleId: mesocycle.id,
      weekNumber: nextWeek,
      trainingDayId: findTrainingDayId(mesocycle, item.exerciseId),
      exerciseId: item.exerciseId,
      exerciseName: item.exerciseName,
      muscleGroupId: findMuscleGroupId(mesocycle, item.exerciseId),
      targetSets: item.suggestedSets,
      repRange: item.suggestedRepRange,
      targetLoad: item.suggestedLoad,
      notes: item.reason
    }))
  };
}

export function createDeloadPrescription(mesocycle, weekNumber, currentWeekPrescription) {
  return currentWeekPrescription.map((item) => ({
    id: createId("prescription"),
    mesocycleId: mesocycle.id,
    weekNumber,
    trainingDayId: item.trainingDayId,
    exerciseId: item.exerciseId,
    exerciseName: item.exerciseName,
    muscleGroupId: item.muscleGroupId,
    targetSets: Math.max(2, Math.round(item.targetSets * DELOAD_MULTIPLIER)),
    repRange: item.repRange,
    targetLoad: roundToIncrement(item.targetLoad * DELOAD_LOAD_MULTIPLIER, 2.5),
    notes: "Deload: cut sets and pull load back to recover before the next cycle."
  }));
}

export function createMuscleTargets(mesocycle, weekNumber) {
  const targets = new Map();

  MUSCLE_GROUPS.forEach((muscle) => {
    targets.set(
      muscle.id,
      getMuscleVolumeTarget(
        mesocycle.priorities[muscle.id],
        clamp(weekNumber, 1, mesocycle.buildWeeks),
        mesocycle.buildWeeks
      )
    );
  });

  return targets;
}

export function allocateSetsAcrossSelections(muscleTargets, selectionsByMuscle) {
  const allocations = new Map();

  muscleTargets.forEach((targetSets, muscleId) => {
    const selections = selectionsByMuscle.get(muscleId) || [];
    if (!selections.length) {
      return;
    }

    const baseSets = Math.max(2, Math.floor(targetSets / selections.length));
    let remainder = targetSets - baseSets * selections.length;

    selections.forEach((selection) => {
      const bonus = remainder > 0 ? 1 : 0;
      allocations.set(selection.id, baseSets + bonus);
      remainder -= bonus;
    });
  });

  return allocations;
}

export function summarizeExerciseLogs(logEntries) {
  if (!logEntries.length) {
    return {
      averageRir: 2,
      averageReps: 0,
      averageLoad: 0,
      completedSets: 0
    };
  }

  return {
    averageRir: average(logEntries.map((entry) => Number(entry.rir))),
    averageReps: average(logEntries.map((entry) => Number(entry.reps))),
    averageLoad: average(logEntries.map((entry) => Number(entry.load))),
    completedSets: logEntries.length
  };
}

export function recommendExerciseProgression({ current, performance, priority, nextSets }) {
  let targetLoad = current.targetLoad;
  let repRange = [...current.repRange];
  let reason = "Hold steady while accumulating quality work.";

  const repSpan = repRange[1] - repRange[0];
  const priorityConfig = PRIORITY_CONFIG[priority];
  const setCap = priorityConfig.weeklySets.end;

  if (performance.averageRir >= 3 && performance.averageReps >= repRange[1] - 1) {
    targetLoad = roundToIncrement(current.targetLoad + Math.max(2.5, current.targetLoad * 0.025));
    reason = "Increase load: you reached the top of the range with room left in reserve.";
  } else if (performance.averageRir >= 2.5) {
    repRange = [repRange[0] + 1, repRange[1] + 1];
    reason = "Increase reps: effort stayed low, so build more work before the next load jump.";
  } else if (performance.averageRir <= 0.5) {
    targetLoad = roundToIncrement(current.targetLoad * 0.975);
    repRange = [Math.max(4, repRange[0] - 1), Math.max(6, repRange[1] - 1)];
    reason = "Reduce load slightly: fatigue was high and reps got too close to failure.";
  } else if (performance.averageReps < repRange[0]) {
    targetLoad = roundToIncrement(current.targetLoad * 0.98);
    reason = "Ease load slightly so next week lands back inside the target rep range.";
  }

  const targetSets = clamp(nextSets, 2, setCap);

  if (targetSets > current.targetSets && !reason.startsWith("Reduce")) {
    reason += " Add 1 set for the next week to support the planned volume climb.";
  }

  return {
    targetLoad,
    repRange,
    targetSets,
    reason
  };
}

export function buildLogsByExercise(entries) {
  return entries.reduce((map, entry) => {
    const current = map[entry.exerciseId] || [];
    current.push(entry);
    map[entry.exerciseId] = current;
    return map;
  }, {});
}

function groupSelectionsByMuscle(selections) {
  return groupBy(selections, (selection) => selection.muscleGroupId);
}

function findSelectionId(mesocycle, exerciseId, trainingDayId) {
  return mesocycle.exerciseSelections.find(
    (selection) => selection.exerciseId === exerciseId && selection.trainingDayId === trainingDayId
  )?.id;
}

function findTrainingDayId(mesocycle, exerciseId) {
  return mesocycle.exerciseSelections.find((selection) => selection.exerciseId === exerciseId)?.trainingDayId;
}

function findMuscleGroupId(mesocycle, exerciseId) {
  return mesocycle.exerciseSelections.find((selection) => selection.exerciseId === exerciseId)?.muscleGroupId;
}
