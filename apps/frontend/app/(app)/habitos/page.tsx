"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Award, TrendingUp } from "lucide-react";
import { Card, SectionHeader, ProgressBar, Badge } from "@/components/ui/card";
import { getTodayHabits, saveHabits, getHabitsHistory } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import type { DailyHabits } from "@/types";

const HABITS_CONFIG = [
  { key: "water2L" as const, label: "Beber 2L de agua", icon: "💧", pts: 10, tip: "El solvente del metabolismo. Sin hidratación, no hay quema de grasa." },
  { key: "noJuice" as const, label: "Sin jugos (agua o limonada)", icon: "🚫", pts: 5, tip: "Los jugos = fructosa pura → triglicéridos. La fruta entera sí." },
  { key: "meal1Protein" as const, label: "Proteína en desayuno", icon: "🍳", pts: 4, tip: "3 huevos = 18g. Inicia el día en modo construcción muscular." },
  { key: "meal2Protein" as const, label: "Proteína en snack AM", icon: "🧀", pts: 4, tip: "Yogurt + queso: evita el crash de insulina antes del almuerzo." },
  { key: "meal3Protein" as const, label: "Proteína en almuerzo", icon: "🍗", pts: 4, tip: "Pollo/Carne/Pescado: la comida más importante del día." },
  { key: "meal4Protein" as const, label: "Proteína en snack PM / cena", icon: "🥩", pts: 3, tip: "No dejes que el cuerpo entre en modo ahorro por la tarde." },
  { key: "exerciseDone" as const, label: "Ejercicio del día completado", icon: "🏋️", pts: 15, tip: "Natación, core o fuerza. Mínimo 20 min para contar." },
  { key: "sleep7h" as const, label: "Dormir 7 horas", icon: "😴", pts: 10, tip: "Sin sueño, el cortisol sube y bloquea la pérdida de grasa abdominal." },
  { key: "mindfulness" as const, label: "Pausa / mindfulness", icon: "🧘", pts: 15, tip: "5 min de respiración o caminar post-almuerzo. Reduce cortisol." },
] as const;

const SCORE_LEVELS = [
  { min: 0, max: 30, label: "Junior – Principiante", color: "text-destructive", desc: "Es hora de instalar los drivers básicos." },
  { min: 31, max: 55, label: "Semi-Senior – Intermedio", color: "text-yellow-400", desc: "Sistema estable, falta optimizar procesos." },
  { min: 56, max: 100, label: "Senior – Avanzado", color: "text-accent", desc: "¡Arquitectura de alto rendimiento!" },
];

function getLevel(score: number) {
  return SCORE_LEVELS.find((l) => score >= l.min && score <= l.max) || SCORE_LEVELS[0];
}

export default function HabitosPage() {
  const [today, setToday] = useState<DailyHabits | null>(null);
  const [history, setHistory] = useState<DailyHabits[]>([]);

  useEffect(() => {
    setToday(getTodayHabits());
    setHistory(getHabitsHistory().slice(-14));
  }, []);

  function toggle(key: keyof DailyHabits) {
    if (!today) return;
    const updated = { ...today, [key]: !today[key as keyof typeof today] };
    setToday(updated);
    saveHabits(updated);
  }

  const score = today
    ? HABITS_CONFIG.reduce((acc, h) => acc + (today[h.key] ? h.pts : 0), 0)
    : 0;
  const level = getLevel(score);

  const chartData = history.map((h) => ({
    date: h.date.slice(5),
    score: h.score,
  }));

  const totalPts = HABITS_CONFIG.reduce((a, h) => a + h.pts, 0); // 70

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <SectionHeader title="Tracker de Hábitos" subtitle="Basado en el Checklist de Bienestar de Paula Bedón" />

      {/* Score card */}
      <Card className="glow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">{formatDate(new Date())}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-bold text-foreground">{score}</p>
              <span className="text-lg text-muted-foreground">/ {totalPts}</span>
            </div>
          </div>
          <div className="text-right">
            <Award className={`w-8 h-8 mx-auto ${level.color}`} />
            <p className={`text-xs font-semibold mt-1 ${level.color}`}>{level.label.split("–")[0].trim()}</p>
          </div>
        </div>
        <ProgressBar value={score} max={totalPts} color={score >= 56 ? "accent" : score >= 31 ? "primary" : "destructive"} />
        <p className="text-[11px] text-muted-foreground mt-2">{level.desc}</p>
      </Card>

      {/* Habit checklist */}
      {today && (
        <Card>
          <SectionHeader title="Hábitos de hoy" subtitle="Toca para marcar/desmarcar" />
          <div className="space-y-2">
            {HABITS_CONFIG.map((h) => {
              const done = today[h.key] as boolean;
              return (
                <button
                  key={h.key}
                  onClick={() => toggle(h.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    done
                      ? "bg-accent/10 border border-accent/30"
                      : "bg-secondary/40 border border-transparent hover:border-border"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xl flex-shrink-0">{h.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{h.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{h.tip}</p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${done ? "text-accent" : "text-muted-foreground"}`}>
                    +{h.pts}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* History chart */}
      {history.length > 1 && (
        <Card>
          <SectionHeader title="Historial de scores" subtitle="Últimos 14 días" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} />
                <YAxis domain={[0, 70]} tick={{ fontSize: 9, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v} pts`, "Score"]}
                />
                <ReferenceLine y={56} stroke="#22c55e" strokeDasharray="4 2" />
                <ReferenceLine y={31} stroke="#eab308" strokeDasharray="4 2" />
                <Bar dataKey="score" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-accent" /><span className="text-[10px] text-muted-foreground">Senior ({">"}55 pts)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-yellow-500" /><span className="text-[10px] text-muted-foreground">Semi-Senior (31–55)</span></div>
          </div>
        </Card>
      )}

      {/* Error codes – Paula's framework */}
      <Card className="border-destructive/20 bg-destructive/5">
        <p className="text-xs font-semibold text-destructive mb-3">⚡ System Errors que debes evitar</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { code: "Error 404", label: "Hydration Not Found", desc: "Fatiga, dolor de cabeza, falta de enfoque." },
            { code: "Error 500", label: "Internal Server Error", desc: "Saltarse comidas, mala digestión, inflamación." },
            { code: "Memory Leak", label: "High Cortisol", desc: "Estrés crónico, falta de sueño, sedentarismo." },
            { code: "Low Battery", label: "Nutrient Deficiency", desc: "Falta de proteína y suplementación adecuada." },
          ].map((e) => (
            <div key={e.code} className="flex gap-3 p-2.5 rounded-lg bg-background/50">
              <Badge variant="danger" className="flex-shrink-0 self-start mt-0.5">{e.code}</Badge>
              <div>
                <p className="text-xs font-medium">{e.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
