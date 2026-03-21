import { tokenStore } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  condition?: string;
  proteinGoalG?: number;
  programStartDate?: string;
}

export interface UserStats {
  latestWeight: number | null;
  weightGoalKg: number | null;
  todayWaterMl: number;
  waterGoalMl: number;
  todayProteinG: number;
  proteinGoalG: number;
  todayScore: number;
  weeklyScores: number[];
  todayWorkout: unknown;
  weekMeters: number;
  currentWeek: number;
  currentPhase: string;
}

export interface OnboardingQuestion {
  id: string;
  label: string;
  type: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface OnboardingAnswers {
  name?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  condition?: string;
}

export interface DailyHabits {
  id: string;
  date: string;
  waterMl: number;
  mealsWithProtein: number;
  trained: boolean;
  lowCarbDinner: boolean;
  sleepHours: number;
  mindfulness: boolean;
  supplementation: boolean;
  score: number;
}

export type HabitUpsert = Partial<Omit<DailyHabits, "id" | "score">> & { date: string };

export interface SwimmingSession {
  id: string;
  date: string;
  totalMeters: number;
  durationMinutes: number;
  notes?: string;
}

export type CreateSwimmingSession = Omit<SwimmingSession, "id">;

export interface SwimmingStats {
  byWeek: { week: number; totalMeters: number }[];
}

export interface Meal {
  id: string;
  date: string;
  name: string;
  proteinG: number;
  calories?: number;
  mealType?: string;
}

export type CreateMeal = Omit<Meal, "id">;

export interface MealSummary {
  totalProtein: number;
  totalCalories: number;
  mealsCount: number;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weightKg?: number;
  waistCm?: number;
  energyLevel?: number;
  backPainLevel?: number;
  notes?: string;
}

export type CreateBodyMeasurement = Omit<BodyMeasurement, "id">;

export interface ApiExercise {
  id: string;
  name: string;
  musclesWorked: string[];
  sets?: number;
  reps?: number;
  durationSecs?: number;
  description?: string;
  imageUrl?: string;
}

export interface WorkoutPlanRow {
  id: string;
  week: number;
  day: string;
  type: string;
  targetMeters?: number;
  phase?: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  type: string;
  completed: boolean;
  notes?: string;
}

export type CreateWorkoutLog = Omit<WorkoutLog, "id">;

// ─── Internals ────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}: ${body}`);
  }
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data: { accessToken: string; refreshToken: string } = await res.json();
    tokenStore.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  opts: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  const doFetch = (token: string | null) =>
    fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers as Record<string, string> | undefined),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

  let res = await doFetch(tokenStore.getAccessToken());

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch(tokenStore.getAccessToken());
    } else {
      tokenStore.clear();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError(401, "Sesión expirada");
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Typed API client ─────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string }>("/auth/login", { method: "POST", body }),
    register: (body: { email: string; password: string; name: string }) =>
      request<{ accessToken: string; refreshToken: string }>("/auth/register", { method: "POST", body }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
  },

  users: {
    me: () => request<UserProfile>("/users/me"),
    updateMe: (body: Partial<UserProfile>) =>
      request<UserProfile>("/users/me", { method: "PUT", body }),
    stats: () => request<UserStats>("/users/me/stats"),
    onboarding: {
      questions: () => request<OnboardingQuestion[]>("/users/me/onboarding/questions"),
      submit: (body: OnboardingAnswers) =>
        request<UserProfile>("/users/me/onboarding", { method: "POST", body }),
    },
  },

  habits: {
    get: (date: string) => request<DailyHabits>(`/habits?date=${date}`),
    upsert: (body: HabitUpsert) => request<DailyHabits>("/habits", { method: "POST", body }),
    weekly: () => request<{ date: string; score: number }[]>("/habits/weekly"),
  },

  swimming: {
    list: (month?: string) =>
      request<SwimmingSession[]>(`/swimming${month ? `?month=${month}` : ""}`),
    create: (body: CreateSwimmingSession) =>
      request<SwimmingSession>("/swimming", { method: "POST", body }),
    stats: () => request<SwimmingStats>("/swimming/stats"),
    plan: (week = 1) => request<WorkoutPlanRow[]>(`/swimming/plan?week=${week}`),
  },

  meals: {
    list: (date?: string) => request<Meal[]>(`/meals${date ? `?date=${date}` : ""}`),
    create: (body: CreateMeal) => request<Meal>("/meals", { method: "POST", body }),
    summary: (date?: string) =>
      request<MealSummary>(`/meals/summary${date ? `?date=${date}` : ""}`),
  },

  body: {
    list: () => request<BodyMeasurement[]>("/body"),
    create: (body: CreateBodyMeasurement) =>
      request<BodyMeasurement>("/body", { method: "POST", body }),
    trend: () => request<BodyMeasurement[]>("/body/trend"),
  },

  exercises: {
    list: (muscleGroup?: string) =>
      request<ApiExercise[]>(`/exercises${muscleGroup ? `?muscleGroup=${encodeURIComponent(muscleGroup)}` : ""}`),
  },

  workouts: {
    list: () => request<WorkoutLog[]>("/workouts"),
    plan: () => request<WorkoutPlanRow[]>("/workouts/plan"),
    log: (body: CreateWorkoutLog) =>
      request<WorkoutLog>("/workouts", { method: "POST", body }),
    update: (id: string, body: Partial<CreateWorkoutLog>) =>
      request<WorkoutLog>(`/workouts/${id}`, { method: "PUT", body }),
  },
};
