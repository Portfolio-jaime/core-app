"use client";
import { DailyHabits, WeeklyRecord, SwimmingSession, TrainingSession } from "@/types";
import { getTodayISO, calcHabitScore } from "@/lib/utils";

const KEYS = {
  habits: "hos_habits",
  weeklyRecords: "hos_weekly_records",
  swimmingSessions: "hos_swimming",
  trainingSessions: "hos_training",
};

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Daily Habits ─────────────────────────────────────────────────────────────
export function getTodayHabits(): DailyHabits {
  const all = load<DailyHabits>(KEYS.habits);
  const today = getTodayISO();
  return (
    all.find((h) => h.date === today) ?? {
      id: today,
      date: today,
      water2L: false,
      meal1Protein: false,
      meal2Protein: false,
      meal3Protein: false,
      meal4Protein: false,
      exerciseDone: false,
      sleep7h: false,
      mindfulness: false,
      noJuice: false,
      score: 0,
    }
  );
}

export function saveHabits(habits: DailyHabits): void {
  const all = load<DailyHabits>(KEYS.habits).filter((h) => h.date !== habits.date);
  habits.score = calcHabitScore(habits as unknown as Record<string, boolean>);
  save(KEYS.habits, [...all, habits]);
}

export function getHabitsHistory(): DailyHabits[] {
  return load<DailyHabits>(KEYS.habits).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Weekly Records ───────────────────────────────────────────────────────────
export function getWeeklyRecords(): WeeklyRecord[] {
  return load<WeeklyRecord>(KEYS.weeklyRecords).sort((a, b) => a.week - b.week);
}

export function saveWeeklyRecord(record: WeeklyRecord): void {
  const all = load<WeeklyRecord>(KEYS.weeklyRecords).filter((r) => r.week !== record.week);
  save(KEYS.weeklyRecords, [...all, record]);
}

export function getLatestWeight(): number {
  const records = getWeeklyRecords();
  return records.length > 0 ? records[records.length - 1].weight : 110;
}

// ─── Swimming Sessions ────────────────────────────────────────────────────────
export function getSwimmingSessions(): SwimmingSession[] {
  return load<SwimmingSession>(KEYS.swimmingSessions).sort((a, b) => a.date.localeCompare(b.date));
}

export function saveSwimmingSession(session: SwimmingSession): void {
  const all = load<SwimmingSession>(KEYS.swimmingSessions).filter((s) => s.id !== session.id);
  save(KEYS.swimmingSessions, [...all, session]);
}

export function getTotalMetersByWeek(): Record<number, number> {
  const sessions = getSwimmingSessions();
  const programStart = new Date("2026-03-16");
  const result: Record<number, number> = {};
  sessions.forEach((s) => {
    const sessionDate = new Date(s.date);
    const weekNum = Math.floor((sessionDate.getTime() - programStart.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
    result[weekNum] = (result[weekNum] || 0) + s.totalMeters;
  });
  return result;
}

// ─── Training Sessions ────────────────────────────────────────────────────────
export function getTrainingSessions(): TrainingSession[] {
  return load<TrainingSession>(KEYS.trainingSessions);
}

export function saveTrainingSession(session: TrainingSession): void {
  const all = load<TrainingSession>(KEYS.trainingSessions).filter((s) => s.id !== session.id);
  save(KEYS.trainingSessions, [...all, session]);
}

export function getWeeklyStats() {
  const habits = getHabitsHistory();
  const sessions = getSwimmingSessions();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekHabits = habits.filter((h) => new Date(h.date) >= weekStart);
  const avgScore = thisWeekHabits.length > 0
    ? Math.round(thisWeekHabits.reduce((acc, h) => acc + h.score, 0) / thisWeekHabits.length)
    : 0;

  const thisWeekSessions = sessions.filter((s) => new Date(s.date) >= weekStart);
  const totalMeters = thisWeekSessions.reduce((acc, s) => acc + s.totalMeters, 0);

  return { avgScore, totalMeters, sessionCount: thisWeekSessions.length };
}
