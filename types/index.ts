// ─── Core types for HealthOS ─────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  height: number; // cm
  weightStart: number; // kg
  weightGoalMonth1: number;
  weightGoalMonth2: number;
  weightGoalMonth3: number;
  condition: string;
  proteinGoal: number; // g/day
  waterGoal: number; // L/day
  programStartDate: string; // ISO date
}

export interface WeeklyRecord {
  id: string;
  week: number;
  date: string;
  weight: number;
  waist: number; // cm
  energyLevel: 1 | 2 | 3 | 4 | 5;
  lumbarPain: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface DailyHabits {
  id: string;
  date: string;
  water2L: boolean;
  meal1Protein: boolean;
  meal2Protein: boolean;
  meal3Protein: boolean;
  meal4Protein: boolean;
  exerciseDone: boolean;
  sleep7h: boolean;
  mindfulness: boolean;
  noJuice: boolean;
  score: number; // auto-calc 0-100
}

export type ExerciseType =
  | "bird-dog"
  | "dead-bug"
  | "glute-bridge"
  | "side-plank"
  | "hip-thrust"
  | "face-pull"
  | "farmer-carry"
  | "cat-cow"
  | "pelvic-tilt"
  | "thoracic-rotation";

export interface Exercise {
  id: ExerciseType;
  name: string;
  nameEs: string;
  category: "core" | "strength" | "mobility" | "stretch";
  sets: number;
  reps?: number;
  duration?: number; // seconds
  description: string;
  steps: string[];
  muscles: string[];
  imageUrl: string;
  videoUrl?: string;
  safeForL5S1: boolean;
  notes?: string;
}

export type SwimmingStyle = "warmup" | "freestyle" | "backstroke" | "kickboard";

export interface SwimmingSet {
  laps: number;
  style: SwimmingStyle;
  note?: string;
}

export interface SwimmingSession {
  id: string;
  date: string;
  day: "martes" | "jueves" | "viernes" | "sabado";
  sets: SwimmingSet[];
  totalLaps: number;
  totalMeters: number;
  durationMin: number;
  heartRateZone?: string;
  notes?: string;
}

export interface TrainingDay {
  day: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";
  type: "core" | "swimming" | "strength" | "rest";
  label: string;
  durationMin: number;
  exercises?: ExerciseType[];
  swimmingSets?: SwimmingSet[];
  completed?: boolean;
}

export interface TrainingSession {
  id: string;
  date: string;
  type: "core" | "swimming" | "strength";
  exercises: { exerciseId: ExerciseType; setsCompleted: number; repsCompleted: number }[];
  durationMin: number;
  notes?: string;
}

export type MealType = "desayuno" | "snack1" | "almuerzo" | "snack2" | "cena";
export type DinnerType = "keto" | "convencional";

export interface Meal {
  type: MealType;
  items: string[];
  proteinG: number;
  isKeto?: boolean;
}

export interface NutritionDay {
  date: string;
  meals: Meal[];
  totalProteinG: number;
  waterL: number;
  totalKcal: number;
  dinnerType: DinnerType;
}

export interface WeekMenu {
  week: "A" | "B" | "C" | "D";
  days: {
    day: string;
    desayuno: string[];
    snack1: string[];
    almuerzo: string[];
    snack2: string[];
    cena: string[];
    cenat: DinnerType;
  }[];
}

export interface ProgressPoint {
  week: number;
  weight: number;
  meters: number;
  score: number;
}
