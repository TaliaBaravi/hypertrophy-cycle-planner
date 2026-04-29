export const PRIORITY_LEVELS = ["HIGH", "MEDIUM", "MAINTAIN"];

export const MUSCLE_GROUPS = [
  { id: "chest", name: "Chest" },
  { id: "front-delts", name: "Front delts" },
  { id: "side-delts", name: "Side delts" },
  { id: "rear-delts", name: "Rear delts" },
  { id: "lats", name: "Lats" },
  { id: "upper-back", name: "Upper back" },
  { id: "biceps", name: "Biceps" },
  { id: "triceps", name: "Triceps" },
  { id: "quads", name: "Quads" },
  { id: "hamstrings", name: "Hamstrings" },
  { id: "glutes", name: "Glutes" },
  { id: "calves", name: "Calves" },
  { id: "abs", name: "Abs" }
];

export const EXERCISE_LIBRARY = [
  {
    id: "barbell-bench-press",
    name: "Barbell Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front-delts", "triceps"],
    equipment: "Barbell",
    movementPattern: "Horizontal press",
    source: "curated"
  },
  {
    id: "incline-dumbbell-press",
    name: "Incline Dumbbell Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front-delts", "triceps"],
    equipment: "Dumbbell",
    movementPattern: "Incline press",
    source: "curated"
  },
  {
    id: "cable-fly",
    name: "Cable Fly",
    primaryMuscle: "chest",
    secondaryMuscles: [],
    equipment: "Cable",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "machine-shoulder-press",
    name: "Machine Shoulder Press",
    primaryMuscle: "front-delts",
    secondaryMuscles: ["triceps"],
    equipment: "Machine",
    movementPattern: "Vertical press",
    source: "curated"
  },
  {
    id: "dumbbell-lateral-raise",
    name: "Dumbbell Lateral Raise",
    primaryMuscle: "side-delts",
    secondaryMuscles: [],
    equipment: "Dumbbell",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "cable-lateral-raise",
    name: "Cable Lateral Raise",
    primaryMuscle: "side-delts",
    secondaryMuscles: [],
    equipment: "Cable",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "reverse-pec-deck",
    name: "Reverse Pec Deck",
    primaryMuscle: "rear-delts",
    secondaryMuscles: ["upper-back"],
    equipment: "Machine",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    primaryMuscle: "lats",
    secondaryMuscles: ["biceps", "upper-back"],
    equipment: "Cable",
    movementPattern: "Vertical pull",
    source: "curated"
  },
  {
    id: "chest-supported-row",
    name: "Chest Supported Row",
    primaryMuscle: "upper-back",
    secondaryMuscles: ["lats", "rear-delts", "biceps"],
    equipment: "Machine",
    movementPattern: "Horizontal pull",
    source: "curated"
  },
  {
    id: "single-arm-cable-row",
    name: "Single Arm Cable Row",
    primaryMuscle: "lats",
    secondaryMuscles: ["upper-back", "biceps"],
    equipment: "Cable",
    movementPattern: "Horizontal pull",
    source: "curated"
  },
  {
    id: "barbell-curl",
    name: "Barbell Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    equipment: "Barbell",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "cable-curl",
    name: "Cable Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    equipment: "Cable",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "cable-pushdown",
    name: "Cable Pushdown",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "Cable",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "overhead-triceps-extension",
    name: "Overhead Triceps Extension",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "Cable",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "high-bar-squat",
    name: "High Bar Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
    equipment: "Barbell",
    movementPattern: "Squat",
    source: "curated"
  },
  {
    id: "leg-press",
    name: "Leg Press",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
    equipment: "Machine",
    movementPattern: "Squat",
    source: "curated"
  },
  {
    id: "leg-extension",
    name: "Leg Extension",
    primaryMuscle: "quads",
    secondaryMuscles: [],
    equipment: "Machine",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes"],
    equipment: "Barbell",
    movementPattern: "Hip hinge",
    source: "curated"
  },
  {
    id: "seated-leg-curl",
    name: "Seated Leg Curl",
    primaryMuscle: "hamstrings",
    secondaryMuscles: [],
    equipment: "Machine",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "barbell-hip-thrust",
    name: "Barbell Hip Thrust",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "Barbell",
    movementPattern: "Hip thrust",
    source: "curated"
  },
  {
    id: "glute-bias-back-extension",
    name: "Glute Bias Back Extension",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "Bodyweight",
    movementPattern: "Hip hinge",
    source: "curated"
  },
  {
    id: "standing-calf-raise",
    name: "Standing Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "Machine",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "seated-calf-raise",
    name: "Seated Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "Machine",
    movementPattern: "Isolation",
    source: "curated"
  },
  {
    id: "cable-crunch",
    name: "Cable Crunch",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "Cable",
    movementPattern: "Core flexion",
    source: "curated"
  },
  {
    id: "hanging-knee-raise",
    name: "Hanging Knee Raise",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "Bodyweight",
    movementPattern: "Core flexion",
    source: "curated"
  }
];
