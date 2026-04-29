import { EXERCISE_LIBRARY, MUSCLE_GROUPS, PRIORITY_LEVELS } from "./data.js";
import {
  buildLogsByExercise,
  createMesocycle,
  generateNextWeekRecommendations,
  getWeekLabel,
  validateSplit
} from "./planner.js";
import { clearState, loadState, saveState } from "./storage.js";
import { createId, formatPriority } from "./utils.js";

const app = document.querySelector("#app");
const BUILDER_STEPS = [
  {
    id: "setup",
    label: "Cycle setup",
    title: "Choose your cycle frame",
    description: "Start with the number of training days and the mesocycle length."
  },
  {
    id: "priorities",
    label: "Priorities",
    title: "Set muscle priorities",
    description: "Choose which muscles should push hardest this cycle and which ones just maintain."
  },
  {
    id: "split",
    label: "Split",
    title: "Build your weekly split",
    description: "Decide which muscles you train on each day."
  },
  {
    id: "exercises",
    label: "Exercises",
    title: "Pick exercises",
    description: "Choose at least one exercise for each day-muscle block."
  },
  {
    id: "baseline",
    label: "Week 1",
    title: "Set week 1 baselines",
    description: "Enter starting load, sets, and rep ranges before creating the mesocycle."
  }
];

let state = loadState() || {
  customExercises: [],
  appData: null,
  draft: createInitialDraft()
};

state.draft.builderStep ??= 0;
state.draft.priorities ??= {};
state.draft.prioritySelections ??= {
  HIGH: [],
  MEDIUM: [],
  MAINTAIN: []
};
state.draft.priorityModal ??= null;
state.draft.exerciseDrafts ??= {};

render();

function createInitialDraft() {
  return {
    buildWeeks: 6,
    trainingDays: 4,
    priorities: {},
    dayAssignments: Array.from({ length: 4 }, (_, index) => ({
      name: `Day ${index + 1}`,
      assignedMuscles: []
    })),
    exerciseSelections: {},
    baselineInputs: {},
    prioritySelections: {
      HIGH: [],
      MEDIUM: [],
      MAINTAIN: []
    },
    priorityModal: null,
    exerciseDrafts: {},
    builderStep: 0
  };
}

function render() {
  if (!state.appData) {
    renderBuilder();
    return;
  }

  renderDashboard();
}

function renderBuilder() {
  const draft = state.draft;
  const currentStep = BUILDER_STEPS[draft.builderStep] || BUILDER_STEPS[0];
  const warnings = validateSplit(
    draft.dayAssignments.map((day, index) => ({
      id: `draft-day-${index}`,
      dayIndex: index + 1,
      assignedMuscles: day.assignedMuscles
    })),
    draft.priorities
  );
  const exercises = [...EXERCISE_LIBRARY, ...state.customExercises];
  const selectedExerciseIds = Object.values(draft.exerciseSelections).flat();
  const assignedBlocks = draft.dayAssignments.reduce((count, day) => count + day.assignedMuscles.length, 0);
  const isLastStep = draft.builderStep === BUILDER_STEPS.length - 1;
  const selectedPriorityCount = Object.keys(draft.priorities).length;

  app.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Cycle builder</p>
          <h2>${currentStep.title}</h2>
        </div>
        <p class="panel-copy">${currentStep.description}</p>
      </div>
      <div class="builder-stepper">
        ${BUILDER_STEPS.map((step, index) => `
          <div class="step-chip ${index === draft.builderStep ? "step-chip--active" : ""} ${index < draft.builderStep ? "step-chip--done" : ""}">
            <span>${index + 1}</span>
            <strong>${step.label}</strong>
          </div>
        `).join("")}
      </div>

      <section class="builder-stage">
        ${renderBuilderStepContent(draft, exercises, warnings)}
      </section>

      <section class="subsection">
        <div class="section-title-row">
          <h3>Builder snapshot</h3>
          <p>Quick view of what you've already locked in.</p>
        </div>
        <div class="overview-strip">
          <div class="overview-item">
            <span>Days</span>
            <strong>${draft.trainingDays}</strong>
          </div>
          <div class="overview-item">
            <span>Cycle</span>
            <strong>${draft.buildWeeks} + deload</strong>
          </div>
          <div class="overview-item">
            <span>Priorities set</span>
            <strong>${selectedPriorityCount}</strong>
          </div>
          <div class="overview-item">
            <span>Muscle blocks</span>
            <strong>${assignedBlocks}</strong>
          </div>
          <div class="overview-item">
            <span>Exercises</span>
            <strong>${selectedExerciseIds.length}</strong>
          </div>
        </div>
      </section>

      <div class="action-row">
        <div class="builder-nav">
          <button id="builder-back" class="ghost-button" ${draft.builderStep === 0 ? "disabled" : ""}>Back</button>
          ${isLastStep ? `<button id="create-cycle" class="primary-button">Create mesocycle</button>` : `<button id="builder-next" class="primary-button">Continue</button>`}
        </div>
        <button id="reset-builder" class="ghost-button">Reset builder</button>
      </div>
    </section>
  `;

  bindBuilderEvents();
}

function renderBuilderStepContent(draft, exercises, warnings) {
  const prioritizedMuscles = MUSCLE_GROUPS.filter((muscle) => draft.priorities[muscle.id]);

  switch (draft.builderStep) {
    case 0:
      return `
        <div class="grid-two">
          <label class="field">
            <span>Build phase length</span>
            <select name="buildWeeks">
              <option value="6" ${draft.buildWeeks === 6 ? "selected" : ""}>6 weeks + deload</option>
              <option value="8" ${draft.buildWeeks === 8 ? "selected" : ""}>8 weeks + deload</option>
            </select>
          </label>

          <label class="field">
            <span>Training days per week</span>
            <select name="trainingDays">
              ${[3, 4, 5, 6].map((days) => `<option value="${days}" ${draft.trainingDays === days ? "selected" : ""}>${days} days</option>`).join("")}
            </select>
          </label>
        </div>
      `;
    case 1:
      return `
        <div class="section-title-row">
          <h3>Muscle priorities</h3>
          <p>Choose muscles inside each priority bucket. A muscle can appear only once, and you can leave some muscles unassigned.</p>
        </div>
        <div class="priority-buckets">
          ${PRIORITY_LEVELS.map((level) => renderPriorityBucket(level, draft)).join("")}
        </div>
        ${renderPriorityModal(draft)}
      `;
    case 2:
      return `
        <div class="section-title-row">
          <h3>Weekly split</h3>
          <p>Assign only the muscles you selected in priorities. High-priority muscles should usually appear at least twice.</p>
        </div>
        <div class="builder-nav">
          <button type="button" class="secondary-button" id="auto-fill-split">Auto fill split</button>
        </div>
        ${prioritizedMuscles.length ? `
          <div class="day-grid">
            ${draft.dayAssignments.map((day, index) => `
              <article class="day-card">
                <label class="field">
                  <span>Day label</span>
                  <input type="text" data-day-name="${index}" value="${escapeHtml(day.name)}" />
                </label>
                <div class="checkbox-list">
                  ${prioritizedMuscles.map((muscle) => `
                    <label class="checkbox-pill">
                      <input type="checkbox" data-day-muscle="${index}" value="${muscle.id}" ${day.assignedMuscles.includes(muscle.id) ? "checked" : ""} />
                      <span>${muscle.name}</span>
                    </label>
                  `).join("")}
                </div>
              </article>
            `).join("")}
          </div>
          ${warnings.length ? `<div class="warning-box">${warnings.map((warning) => `<p>${warning}</p>`).join("")}</div>` : `<p class="success-line">Split coverage looks workable for the selected priorities.</p>`}
        ` : `<p class="muted">Choose at least one muscle in the priorities step before building the weekly split.</p>`}
      `;
    case 3:
      return `
        <div class="section-title-row">
          <h3>Exercise selection</h3>
          <p>Pick at least one exercise for each muscle you assigned to a day.</p>
        </div>
        <div class="builder-nav">
          <button type="button" class="secondary-button" id="auto-fill-exercises">Auto fill</button>
        </div>
        <div class="exercise-groups">
          ${draft.dayAssignments.map((day, dayIndex) => `
            <article class="exercise-card">
              <h4>${escapeHtml(day.name)}</h4>
              ${day.assignedMuscles.length ? renderExerciseDayPlanner(dayIndex, day, draft, exercises) : `<p class="muted">Add muscles to this day in the previous step to unlock exercise choices.</p>`}
            </article>
          `).join("")}
        </div>
        <form class="custom-exercise-form" id="custom-exercise-form">
          <h4>Add a custom exercise</h4>
          <div class="grid-three">
            <label class="field">
              <span>Name</span>
              <input required name="name" type="text" placeholder="Smith incline press" />
            </label>
            <label class="field">
              <span>Primary muscle</span>
              <select required name="primaryMuscle">
                ${MUSCLE_GROUPS.map((muscle) => `<option value="${muscle.id}">${muscle.name}</option>`).join("")}
              </select>
            </label>
            <label class="field">
              <span>Equipment</span>
              <input required name="equipment" type="text" placeholder="Smith machine" />
            </label>
          </div>
          <button type="submit" class="secondary-button">Add custom exercise</button>
        </form>
      `;
    case 4:
    default:
      return `
        <div class="section-title-row">
          <h3>Week 1 baseline</h3>
          <p>Set your starting weight, target sets, and rep range for each selected exercise.</p>
        </div>
        <div class="baseline-list">
          ${renderBaselineInputs(draft, exercises)}
        </div>
      `;
  }
}

function renderPriorityBucket(level, draft) {
  const selectedMuscles = getPriorityMuscles(level, draft.priorities);

  return `
    <article class="priority-bucket">
      <div class="section-title-row">
        <div>
          <h4>${formatPriority(level)}</h4>
          <p>${getPriorityDescription(level)}</p>
        </div>
        <span>${selectedMuscles.length} selected</span>
      </div>
      <div class="bucket-picker">
        <button type="button" class="secondary-button" data-priority-open="${level}">Add muscle</button>
      </div>
      <div class="selected-muscles">
        ${selectedMuscles.length ? selectedMuscles.map((muscle) => `
          <button type="button" class="selected-muscle-pill" data-priority-remove="${level}:${muscle.id}">
            <span>${muscle.name}</span>
            <strong>Remove</strong>
          </button>
        `).join("") : `<p class="muted">No muscles assigned here yet.</p>`}
      </div>
    </article>
  `;
}

function renderExerciseDayPlanner(dayIndex, day, draft, exercises) {
  const exerciseRows = day.assignedMuscles.flatMap((muscleId) => {
    const key = `${dayIndex}:${muscleId}`;
    return (draft.exerciseSelections[key] || []).map((exerciseId) => ({
      muscleId,
      exerciseId
    }));
  });
  const dayDraft = getExerciseDraft(dayIndex, draft, day);
  const availableExercises = dayDraft.muscleId
    ? exercises.filter((exercise) => exercise.primaryMuscle === dayDraft.muscleId)
    : [];

  return `
    <div class="exercise-pair-list">
      ${exerciseRows.length ? exerciseRows.map((row) => {
        const muscle = MUSCLE_GROUPS.find((entry) => entry.id === row.muscleId);
        const exercise = exercises.find((entry) => entry.id === row.exerciseId);
        return `
          <div class="exercise-pair-row">
            <div>
              <strong>${muscle?.name || row.muscleId}</strong>
              <span>${exercise?.name || row.exerciseId}</span>
            </div>
            <button type="button" class="exercise-remove-button" data-exercise-remove="${dayIndex}:${row.muscleId}:${row.exerciseId}">x</button>
          </div>
        `;
      }).join("") : `<p class="muted">No exercises added yet for this day.</p>`}
    </div>
    <div class="exercise-add-panel">
      <div class="grid-two">
        <label class="field compact">
          <span>Muscle</span>
          <select data-exercise-muscle="${dayIndex}">
            <option value="">Choose muscle</option>
            ${day.assignedMuscles.map((muscleId) => {
              const muscle = MUSCLE_GROUPS.find((entry) => entry.id === muscleId);
              return `<option value="${muscleId}" ${dayDraft.muscleId === muscleId ? "selected" : ""}>${muscle?.name || muscleId}</option>`;
            }).join("")}
          </select>
        </label>
        <label class="field compact">
          <span>Exercise</span>
          <select data-exercise-choice="${dayIndex}">
            <option value="">Choose exercise</option>
            ${availableExercises.map((exercise) => `<option value="${exercise.id}" ${dayDraft.exerciseId === exercise.id ? "selected" : ""}>${exercise.name}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="builder-nav">
        <button type="button" class="secondary-button" data-exercise-add="${dayIndex}" ${dayDraft.muscleId && dayDraft.exerciseId ? "" : "disabled"}>Add exercise</button>
      </div>
    </div>
  `;
}

function renderPriorityModal(draft) {
  if (!draft.priorityModal) {
    return "";
  }

  const level = draft.priorityModal;
  const availableMuscles = getAvailablePriorityMuscles(level, draft.priorities);
  const selectedSet = new Set(draft.prioritySelections[level] || []);

  return `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="section-title-row">
          <div>
            <h3>Add muscles to ${formatPriority(level)}</h3>
            <p>Select as many muscles as you want, then add them together.</p>
          </div>
          <button type="button" class="ghost-button" data-priority-close>Close</button>
        </div>
        <div class="modal-muscle-list">
          ${availableMuscles.length ? availableMuscles.map((muscle) => `
            <label class="checkbox-pill checkbox-pill--wide modal-muscle-option">
              <input type="checkbox" data-priority-modal-muscle="${level}" value="${muscle.id}" ${selectedSet.has(muscle.id) ? "checked" : ""} />
              <span>${muscle.name}</span>
            </label>
          `).join("") : `<p class="muted">No more muscles available for this category.</p>`}
        </div>
        <div class="builder-nav modal-actions">
          <button type="button" class="ghost-button" data-priority-clear="${level}">Clear</button>
          <button type="button" class="primary-button" data-priority-confirm="${level}" ${selectedSet.size ? "" : "disabled"}>Add selected</button>
        </div>
      </div>
    </div>
  `;
}

function autoFillExerciseSelections(draft, exercises) {
  const nextSelections = { ...draft.exerciseSelections };

  draft.dayAssignments.forEach((day, dayIndex) => {
    day.assignedMuscles.forEach((muscleId) => {
      const key = `${dayIndex}:${muscleId}`;
      const currentSelection = nextSelections[key] || [];
      if (currentSelection.length) {
        return;
      }

      const pool = shuffleArray(
        exercises.filter((exercise) => exercise.primaryMuscle === muscleId)
      );

      const targetCount = Math.min(pool.length, pool.length >= 2 ? 2 : 1);
      nextSelections[key] = pool.slice(0, targetCount).map((exercise) => exercise.id);
    });
  });

  state.draft.exerciseSelections = nextSelections;
}

function autoFillSplitFromPriorities(draft) {
  const selectedMuscles = Object.keys(draft.priorities);
  const trainingDayCount = draft.dayAssignments.length;

  if (!selectedMuscles.length || !trainingDayCount) {
    return false;
  }

  const nextDays = draft.dayAssignments.map((day) => ({
    ...day,
    assignedMuscles: []
  }));
  const appearancesPerMuscle = Math.min(trainingDayCount, 2);

  selectedMuscles.forEach((muscleId) => {
    const randomizedDayIndexes = shuffleArray(
      Array.from({ length: trainingDayCount }, (_, index) => index)
    ).slice(0, appearancesPerMuscle);

    randomizedDayIndexes.forEach((dayIndex) => {
      nextDays[dayIndex].assignedMuscles.push(muscleId);
    });
  });

  state.draft.dayAssignments = nextDays;
  return true;
}

function syncDraftToPriorities(draft) {
  const allowedMuscles = new Set(Object.keys(draft.priorities));

  draft.dayAssignments = draft.dayAssignments.map((day) => ({
    ...day,
    assignedMuscles: day.assignedMuscles.filter((muscleId) => allowedMuscles.has(muscleId))
  }));

  const nextExerciseSelections = {};
  Object.entries(draft.exerciseSelections).forEach(([key, exerciseIds]) => {
    const [, muscleId] = key.split(":");
    if (allowedMuscles.has(muscleId)) {
      nextExerciseSelections[key] = exerciseIds;
    }
  });
  draft.exerciseSelections = nextExerciseSelections;

  const nextExerciseDrafts = {};
  Object.entries(draft.exerciseDrafts || {}).forEach(([dayIndex, draftValue]) => {
    const day = draft.dayAssignments[Number(dayIndex)];
    const fallbackMuscleId = day?.assignedMuscles[0] || "";
    const muscleId = allowedMuscles.has(draftValue.muscleId) ? draftValue.muscleId : fallbackMuscleId;
    nextExerciseDrafts[dayIndex] = {
      muscleId,
      exerciseId: muscleId === draftValue.muscleId ? draftValue.exerciseId : ""
    };
  });
  draft.exerciseDrafts = nextExerciseDrafts;
}

function getExerciseDraft(dayIndex, draft, day) {
  const savedDraft = draft.exerciseDrafts[dayIndex];
  if (savedDraft) {
    return savedDraft;
  }

  return {
    muscleId: day.assignedMuscles[0] || "",
    exerciseId: ""
  };
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getPriorityMuscles(level, priorities) {
  return MUSCLE_GROUPS.filter((muscle) => priorities[muscle.id] === level);
}

function getAvailablePriorityMuscles(level, priorities) {
  return MUSCLE_GROUPS.filter((muscle) => !priorities[muscle.id] || priorities[muscle.id] === level);
}

function getPriorityDescription(level) {
  if (level === "HIGH") {
    return "More weekly sets and the most aggressive upward progression.";
  }

  if (level === "MEDIUM") {
    return "Solid growth focus without pushing volume as hard.";
  }

  return "Lower stable volume for muscles you only want to maintain.";
}

function renderBaselineInputs(draft, exercises) {
  const selectedExerciseIds = Object.values(draft.exerciseSelections).flat();
  if (!selectedExerciseIds.length) {
    return `<p class="muted">Choose exercises above to unlock baseline setup.</p>`;
  }

  return selectedExerciseIds.map((exerciseId) => {
    const exercise = exercises.find((entry) => entry.id === exerciseId);
    const baseline = draft.baselineInputs[exerciseId] || { targetLoad: "", targetSets: 3, repRangeMin: 8, repRangeMax: 12 };
    return `
      <article class="baseline-card">
        <h4>${exercise.name}</h4>
        <div class="grid-three">
          <label class="field compact">
            <span>Load</span>
            <input type="number" min="0" step="2.5" data-baseline-load="${exerciseId}" value="${baseline.targetLoad}" placeholder="kg" />
          </label>
          <label class="field compact">
            <span>Sets</span>
            <input type="number" min="2" max="8" step="1" data-baseline-sets="${exerciseId}" value="${baseline.targetSets}" />
          </label>
          <label class="field compact">
            <span>Rep range</span>
            <div class="inline-dual">
              <input type="number" min="4" max="20" step="1" data-baseline-rep-min="${exerciseId}" value="${baseline.repRangeMin}" />
              <input type="number" min="4" max="20" step="1" data-baseline-rep-max="${exerciseId}" value="${baseline.repRangeMax}" />
            </div>
          </label>
        </div>
      </article>
    `;
  }).join("");
}

function renderDashboard() {
  const { mesocycle, prescriptions, workoutLogs, recommendations } = state.appData;
  const currentWeek = mesocycle.currentWeek;
  const weekPrescription = prescriptions[currentWeek] || [];
  const weekLogs = workoutLogs[currentWeek] || [];
  const groupedByDay = mesocycle.trainingDaysDetail.map((day) => ({
    day,
    exercises: weekPrescription.filter((item) => item.trainingDayId === day.id)
  }));
  const weekRecommendations = recommendations[currentWeek] || [];
  const isDeloadWeek = currentWeek > mesocycle.buildWeeks;
  const selectedPriorityMuscles = MUSCLE_GROUPS.filter((muscle) => mesocycle.priorities[muscle.id]);

  app.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Active cycle</p>
          <h2>${getWeekLabel(mesocycle, currentWeek)}</h2>
        </div>
        <div class="summary-chip">
          <span>${mesocycle.trainingDays} days</span>
          <strong>${mesocycle.buildWeeks} build weeks + deload</strong>
        </div>
      </div>

      <section class="overview-strip">
        ${selectedPriorityMuscles.length ? selectedPriorityMuscles.map((muscle) => `
          <div class="overview-item">
            <span>${muscle.name}</span>
            <strong>${formatPriority(mesocycle.priorities[muscle.id])}</strong>
          </div>
        `).join("") : `<div class="overview-item"><span>Priorities</span><strong>Not set</strong></div>`}
      </section>

      ${mesocycle.warnings.length ? `<div class="warning-box">${mesocycle.warnings.map((warning) => `<p>${warning}</p>`).join("")}</div>` : ""}

      <section class="subsection">
        <div class="section-title-row">
          <h3>Weekly prescription</h3>
          <p>Log each set with load, reps, and RIR. Recommendations unlock when the week is logged.</p>
        </div>
        <div class="exercise-groups">
          ${groupedByDay.map(({ day, exercises }) => `
            <article class="exercise-card">
              <div class="section-title-row">
                <h4>${escapeHtml(day.name)}</h4>
                <span>${exercises.length} exercises</span>
              </div>
              ${exercises.map((exercise) => renderWorkoutLogger(exercise, weekLogs)).join("")}
            </article>
          `).join("")}
        </div>
      </section>

      <div class="action-row">
        <button id="save-week-logs" class="primary-button">Save week logs</button>
        <button id="generate-review" class="secondary-button" ${isDeloadWeek ? "disabled" : ""}>Generate next-week review</button>
      </div>

      <section class="subsection">
        <div class="section-title-row">
          <h3>Weekly review</h3>
          <p>Compare this week against next week’s plan, then confirm or edit it.</p>
        </div>
        ${isDeloadWeek ? `<p class="muted">Deload is the last week of the cycle. Finish the week, then start a fresh mesocycle.</p>` : weekRecommendations.length ? `
          <div class="review-list">
            ${weekRecommendations.map((recommendation) => {
              const current = weekPrescription.find((item) => item.exerciseId === recommendation.exerciseId);
              return `
                <article class="review-card">
                  <div class="section-title-row">
                    <h4>${recommendation.exerciseName}</h4>
                    <span>${current.targetSets} sets -> ${recommendation.suggestedSets} sets</span>
                  </div>
                  <p class="review-reason">${recommendation.reason}</p>
                  <div class="grid-three">
                    <label class="field compact">
                      <span>Load</span>
                      <input type="number" step="2.5" min="0" data-review-load="${recommendation.exerciseId}" value="${recommendation.suggestedLoad}" />
                    </label>
                    <label class="field compact">
                      <span>Sets</span>
                      <input type="number" step="1" min="2" max="8" data-review-sets="${recommendation.exerciseId}" value="${recommendation.suggestedSets}" />
                    </label>
                    <label class="field compact">
                      <span>Rep range</span>
                      <div class="inline-dual">
                        <input type="number" min="4" max="20" step="1" data-review-rep-min="${recommendation.exerciseId}" value="${recommendation.suggestedRepRange[0]}" />
                        <input type="number" min="4" max="20" step="1" data-review-rep-max="${recommendation.exerciseId}" value="${recommendation.suggestedRepRange[1]}" />
                      </div>
                    </label>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        ` : `<p class="muted">No review generated yet for this week.</p>`}
      </section>

      <div class="action-row">
        <button id="confirm-next-week" class="primary-button" ${weekRecommendations.length && !isDeloadWeek ? "" : "disabled"}>Confirm next week</button>
        <button id="restart-app" class="ghost-button">Start over</button>
      </div>
    </section>
  `;

  bindDashboardEvents();
}

function renderWorkoutLogger(exercise, savedLogs) {
  const logs = savedLogs.filter((entry) => entry.exerciseId === exercise.exerciseId);
  const rows = Array.from({ length: exercise.targetSets }, (_, index) => {
    const saved = logs[index] || {};
    return `
      <div class="set-row">
        <span class="set-index">Set ${index + 1}</span>
        <input type="number" min="0" step="1" placeholder="Reps" data-log-reps="${exercise.exerciseId}:${index + 1}" value="${saved.reps || ""}" />
        <input type="number" min="0" step="2.5" placeholder="Load" data-log-load="${exercise.exerciseId}:${index + 1}" value="${saved.load || exercise.targetLoad || ""}" />
        <input type="number" min="0" max="5" step="0.5" placeholder="RIR" data-log-rir="${exercise.exerciseId}:${index + 1}" value="${saved.rir || ""}" />
      </div>
    `;
  }).join("");

  return `
    <div class="logger-card">
      <div class="section-title-row">
        <div>
          <strong>${exercise.exerciseName}</strong>
          <p class="muted">${exercise.repRange[0]}-${exercise.repRange[1]} reps · ${exercise.targetLoad || 0} load target</p>
        </div>
        <span>${exercise.targetSets} sets</span>
      </div>
      <div class="set-grid">${rows}</div>
    </div>
  `;
}

function bindBuilderEvents() {
  app.querySelector('[name="buildWeeks"]')?.addEventListener("change", (event) => {
    state.draft.buildWeeks = Number(event.target.value);
    persistAndRender();
  });

  app.querySelector('[name="trainingDays"]')?.addEventListener("change", (event) => {
    const nextDays = Number(event.target.value);
    const dayAssignments = Array.from({ length: nextDays }, (_, index) => {
      return state.draft.dayAssignments[index] || { name: `Day ${index + 1}`, assignedMuscles: [] };
    });
    state.draft.trainingDays = nextDays;
    state.draft.dayAssignments = dayAssignments;
    persistAndRender();
  });

  app.querySelectorAll("[data-priority-select]").forEach((select) => {
    select.addEventListener("change", (event) => {
      state.draft.prioritySelections[event.target.dataset.prioritySelect] = event.target.value;
      saveState(state);
      render();
    });
  });

  app.querySelectorAll("[data-priority-open]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const level = event.currentTarget.dataset.priorityOpen;
      state.draft.priorityModal = level;
      state.draft.prioritySelections[level] = [];
      persistAndRender();
    });
  });

  app.querySelectorAll("[data-priority-modal-muscle]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const level = event.target.dataset.priorityModalMuscle;
      const selected = new Set(state.draft.prioritySelections[level] || []);
      if (event.target.checked) {
        selected.add(event.target.value);
      } else {
        selected.delete(event.target.value);
      }
      state.draft.prioritySelections[level] = [...selected];
      saveState(state);
      render();
    });
  });

  app.querySelector("[data-priority-close]")?.addEventListener("click", () => {
    state.draft.priorityModal = null;
    persistAndRender();
  });

  app.querySelectorAll("[data-priority-clear]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const level = event.currentTarget.dataset.priorityClear;
      state.draft.prioritySelections[level] = [];
      saveState(state);
      render();
    });
  });

  app.querySelectorAll("[data-priority-confirm]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const level = event.currentTarget.dataset.priorityConfirm;
      const muscleIds = state.draft.prioritySelections[level] || [];
      muscleIds.forEach((muscleId) => {
        state.draft.priorities[muscleId] = level;
      });
      state.draft.prioritySelections[level] = [];
      state.draft.priorityModal = null;
      syncDraftToPriorities(state.draft);
      persistAndRender();
    });
  });

  app.querySelectorAll("[data-priority-remove]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const [level, muscleId] = event.currentTarget.dataset.priorityRemove.split(":");
      if (state.draft.priorities[muscleId] === level) {
        delete state.draft.priorities[muscleId];
      }
      syncDraftToPriorities(state.draft);
      persistAndRender();
    });
  });

  app.querySelector("#auto-fill-split")?.addEventListener("click", () => {
    const didFill = autoFillSplitFromPriorities(state.draft);
    if (!didFill) {
      window.alert("Choose at least one muscle in the priorities step before auto-filling the split.");
      return;
    }
    persistAndRender();
  });

  app.querySelector("#auto-fill-exercises")?.addEventListener("click", () => {
    autoFillExerciseSelections(state.draft, buildExercisePool());
    persistAndRender();
  });

  app.querySelectorAll("[data-exercise-muscle]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const dayIndex = Number(event.target.dataset.exerciseMuscle);
      state.draft.exerciseDrafts[dayIndex] = {
        muscleId: event.target.value,
        exerciseId: ""
      };
      persistAndRender();
    });
  });

  app.querySelectorAll("[data-exercise-choice]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const dayIndex = Number(event.target.dataset.exerciseChoice);
      const current = state.draft.exerciseDrafts[dayIndex] || { muscleId: "", exerciseId: "" };
      state.draft.exerciseDrafts[dayIndex] = {
        ...current,
        exerciseId: event.target.value
      };
      saveState(state);
    });
  });

  app.querySelectorAll("[data-exercise-add]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const dayIndex = Number(event.currentTarget.dataset.exerciseAdd);
      const dayDraft = state.draft.exerciseDrafts[dayIndex];
      if (!dayDraft?.muscleId || !dayDraft?.exerciseId) {
        return;
      }

      const key = `${dayIndex}:${dayDraft.muscleId}`;
      const nextSelection = new Set(state.draft.exerciseSelections[key] || []);
      nextSelection.add(dayDraft.exerciseId);
      state.draft.exerciseSelections[key] = [...nextSelection];
      state.draft.exerciseDrafts[dayIndex] = {
        muscleId: dayDraft.muscleId,
        exerciseId: ""
      };
      persistAndRender();
    });
  });

  app.querySelectorAll("[data-day-name]").forEach((input) => {
    input.addEventListener("input", (event) => {
      state.draft.dayAssignments[Number(event.target.dataset.dayName)].name = event.target.value;
      saveState(state);
    });
  });

  app.querySelectorAll("[data-day-muscle]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const dayIndex = Number(event.target.dataset.dayMuscle);
      const assigned = new Set(state.draft.dayAssignments[dayIndex].assignedMuscles);
      if (event.target.checked) {
        assigned.add(event.target.value);
      } else {
        assigned.delete(event.target.value);
      }
      state.draft.dayAssignments[dayIndex].assignedMuscles = [...assigned];
      persistAndRender();
    });
  });

  app.querySelectorAll("[data-exercise-remove]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const [dayIndex, muscleId, exerciseId] = event.currentTarget.dataset.exerciseRemove.split(":");
      const key = `${dayIndex}:${muscleId}`;
      state.draft.exerciseSelections[key] = (state.draft.exerciseSelections[key] || []).filter(
        (selectedId) => selectedId !== exerciseId
      );
      persistAndRender();
    });
  });

  app.querySelector("#custom-exercise-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    state.customExercises.push({
      id: createId("custom"),
      name: String(formData.get("name")),
      primaryMuscle: String(formData.get("primaryMuscle")),
      secondaryMuscles: [],
      equipment: String(formData.get("equipment")),
      movementPattern: "Custom",
      source: "custom"
    });
    event.target.reset();
    persistAndRender();
  });

  app.querySelectorAll("[data-baseline-load]").forEach((input) => {
    input.addEventListener("input", updateBaselineState);
  });
  app.querySelectorAll("[data-baseline-sets]").forEach((input) => {
    input.addEventListener("input", updateBaselineState);
  });
  app.querySelectorAll("[data-baseline-rep-min]").forEach((input) => {
    input.addEventListener("input", updateBaselineState);
  });
  app.querySelectorAll("[data-baseline-rep-max]").forEach((input) => {
    input.addEventListener("input", updateBaselineState);
  });

  app.querySelector("#builder-back")?.addEventListener("click", () => {
    state.draft.builderStep = Math.max(0, state.draft.builderStep - 1);
    persistAndRender();
  });

  app.querySelector("#builder-next")?.addEventListener("click", () => {
    const error = getBuilderStepValidationError(state.draft.builderStep, state.draft);
    if (error) {
      window.alert(error);
      return;
    }

    state.draft.builderStep = Math.min(BUILDER_STEPS.length - 1, state.draft.builderStep + 1);
    persistAndRender();
  });

  app.querySelector("#reset-builder").addEventListener("click", () => {
    state = { customExercises: [], appData: null, draft: createInitialDraft() };
    persistAndRender();
  });

  app.querySelector("#create-cycle").addEventListener("click", () => {
    const exerciseSelections = flattenExerciseSelections(state.draft);
    const missing = getMissingExerciseAssignments(state.draft);
    const missingBaselines = exerciseSelections.some((selection) => {
      const baseline = state.draft.baselineInputs[selection.exerciseId];
      return !baseline || !baseline.targetLoad || !baseline.repRangeMin || !baseline.repRangeMax || !baseline.targetSets;
    });

    if (missing.length) {
      window.alert(`Choose at least one exercise for: ${missing.join(", ")}`);
      return;
    }

    if (missingBaselines) {
      window.alert("Please enter baseline load, sets, and rep range for every selected exercise.");
      return;
    }

    state.appData = createMesocycle({
      buildWeeks: state.draft.buildWeeks,
      trainingDays: state.draft.trainingDays,
      priorities: state.draft.priorities,
      dayAssignments: state.draft.dayAssignments,
      exerciseSelections,
      baselineInputs: normalizeBaselineInputs(state.draft.baselineInputs),
      exerciseIndex: buildExerciseIndex()
    });
    persistAndRender();
  });
}

function getBuilderStepValidationError(step, draft) {
  if (step === 2) {
    const assignedMuscles = draft.dayAssignments.flatMap((day) => day.assignedMuscles);
    if (!assignedMuscles.length) {
      return "Choose at least one muscle in your weekly split before continuing.";
    }
  }

  if (step === 3) {
    const missing = getMissingExerciseAssignments(draft);
    if (missing.length) {
      return `Choose at least one exercise for: ${missing.join(", ")}`;
    }
  }

  return "";
}

function bindDashboardEvents() {
  app.querySelector("#save-week-logs").addEventListener("click", () => {
    const week = state.appData.mesocycle.currentWeek;
    state.appData.workoutLogs[week] = collectWeekLogs();
    persistAndRender();
  });

  app.querySelector("#generate-review").addEventListener("click", () => {
    const currentWeek = state.appData.mesocycle.currentWeek;
    const currentLogs = state.appData.workoutLogs[currentWeek] || collectWeekLogs();
    if (!currentLogs.length) {
      window.alert("Log at least one set before generating the next-week review.");
      return;
    }

    state.appData.workoutLogs[currentWeek] = currentLogs;
    const { recommendations, nextWeekPrescription } = generateNextWeekRecommendations({
      mesocycle: state.appData.mesocycle,
      currentWeek,
      currentWeekPrescription: state.appData.prescriptions[currentWeek],
      logsByExercise: buildLogsByExercise(currentLogs),
      exerciseIndex: buildExerciseIndex()
    });
    state.appData.recommendations[currentWeek] = recommendations;
    state.appData.pendingPrescription = nextWeekPrescription;
    persistAndRender();
  });

  app.querySelector("#confirm-next-week").addEventListener("click", () => {
    const currentWeek = state.appData.mesocycle.currentWeek;
    const nextWeek = currentWeek + 1;
    const nextWeekPrescription = (state.appData.pendingPrescription || []).map((item) => {
      const load = Number(app.querySelector(`[data-review-load="${item.exerciseId}"]`)?.value || item.targetLoad);
      const sets = Number(app.querySelector(`[data-review-sets="${item.exerciseId}"]`)?.value || item.targetSets);
      const repMin = Number(app.querySelector(`[data-review-rep-min="${item.exerciseId}"]`)?.value || item.repRange[0]);
      const repMax = Number(app.querySelector(`[data-review-rep-max="${item.exerciseId}"]`)?.value || item.repRange[1]);
      return {
        ...item,
        targetLoad: load,
        targetSets: sets,
        repRange: [repMin, repMax]
      };
    });

    state.appData.prescriptions[nextWeek] = nextWeekPrescription;
    state.appData.mesocycle.currentWeek = nextWeek;
    state.appData.pendingPrescription = null;
    persistAndRender();
  });

  app.querySelector("#restart-app").addEventListener("click", () => {
    clearState();
    state = { customExercises: [], appData: null, draft: createInitialDraft() };
    render();
  });
}

function updateBaselineState(event) {
  const [kind, exerciseId] = Object.entries(event.target.dataset)[0];
  const baseline = state.draft.baselineInputs[exerciseId] || {
    targetLoad: "",
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 12
  };

  if (kind === "baselineLoad") {
    baseline.targetLoad = event.target.value;
  }
  if (kind === "baselineSets") {
    baseline.targetSets = Number(event.target.value);
  }
  if (kind === "baselineRepMin") {
    baseline.repRangeMin = Number(event.target.value);
  }
  if (kind === "baselineRepMax") {
    baseline.repRangeMax = Number(event.target.value);
  }

  state.draft.baselineInputs[exerciseId] = baseline;
  saveState(state);
}

function flattenExerciseSelections(draft) {
  const selections = [];
  draft.dayAssignments.forEach((day, dayIndex) => {
    day.assignedMuscles.forEach((muscleId) => {
      const key = `${dayIndex}:${muscleId}`;
      (draft.exerciseSelections[key] || []).forEach((exerciseId) => {
        selections.push({
          trainingDayIndex: dayIndex,
          muscleGroupId: muscleId,
          exerciseId
        });
      });
    });
  });
  return selections;
}

function getMissingExerciseAssignments(draft) {
  const missing = [];

  draft.dayAssignments.forEach((day) => {
    day.assignedMuscles.forEach((muscleId) => {
      const key = `${draft.dayAssignments.indexOf(day)}:${muscleId}`;
      if (!(draft.exerciseSelections[key] || []).length) {
        const muscleName = MUSCLE_GROUPS.find((muscle) => muscle.id === muscleId).name;
        missing.push(`${day.name} / ${muscleName}`);
      }
    });
  });

  return missing;
}

function normalizeBaselineInputs(inputs) {
  return Object.fromEntries(
    Object.entries(inputs).map(([exerciseId, value]) => [
      exerciseId,
      {
        targetLoad: Number(value.targetLoad),
        targetSets: Number(value.targetSets),
        repRange: [Number(value.repRangeMin), Number(value.repRangeMax)]
      }
    ])
  );
}

function collectWeekLogs() {
  const week = state.appData.mesocycle.currentWeek;
  const prescription = state.appData.prescriptions[week];
  const entries = [];

  prescription.forEach((item) => {
    Array.from({ length: item.targetSets }, (_, index) => index + 1).forEach((setNumber) => {
      const reps = app.querySelector(`[data-log-reps="${item.exerciseId}:${setNumber}"]`)?.value;
      const load = app.querySelector(`[data-log-load="${item.exerciseId}:${setNumber}"]`)?.value;
      const rir = app.querySelector(`[data-log-rir="${item.exerciseId}:${setNumber}"]`)?.value;

      if (reps !== "" && load !== "" && rir !== "") {
        entries.push({
          id: createId("set-log"),
          workoutLogId: `${week}-${item.trainingDayId}`,
          trainingDayId: item.trainingDayId,
          exerciseId: item.exerciseId,
          setNumber,
          reps: Number(reps),
          load: Number(load),
          rir: Number(rir)
        });
      }
    });
  });

  return entries;
}

function buildExerciseIndex() {
  return Object.fromEntries([...EXERCISE_LIBRARY, ...state.customExercises].map((exercise) => [exercise.id, exercise]));
}

function buildExercisePool() {
  return [...EXERCISE_LIBRARY, ...state.customExercises];
}

function persistAndRender() {
  saveState(state);
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
