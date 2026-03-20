import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function getCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  return Math.min(Math.max(diff + 1, 1), 12);
}

export function getMonth(week: number): 1 | 2 | 3 {
  if (week <= 4) return 1;
  if (week <= 8) return 2;
  return 3;
}

export function getMonthLabel(week: number): string {
  const m = getMonth(week);
  return m === 1 ? "Mes 1 – Adaptación" : m === 2 ? "Mes 2 – Pérdida de grasa" : "Mes 3 – Resistencia";
}

export function calcHabitScore(habits: Record<string, boolean>): number {
  const points: Record<string, number> = {
    water2L: 10,
    noJuice: 5,
    meal1Protein: 4,
    meal2Protein: 4,
    meal3Protein: 4,
    meal4Protein: 3,
    exerciseDone: 15,
    sleep7h: 10,
    mindfulness: 15,
  };
  return Object.entries(points).reduce((acc, [key, pts]) => acc + (habits[key] ? pts : 0), 0);
}

export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function getSwimmingVolume(week: number): { label: string; target: string } {
  const m = getMonth(week);
  if (m === 1) return { label: "Semanas 1-4", target: "800–1.000 m/semana" };
  if (m === 2) return { label: "Semanas 5-8", target: "1.200–1.600 m/semana" };
  return { label: "Semanas 9-12", target: "1.800–2.200 m/semana" };
}

export function getTodayDayName(): "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo" {
  const days = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;
  return days[new Date().getDay()];
}
