"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Circle, Award, Loader2, Plus, Minus } from "lucide-react";
import { Card, SectionHeader, ProgressBar, Badge } from "@/components/ui/card";
import { api, type DailyHabits } from "@/lib/api-client";
import { formatDate, getTodayISO } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

const HABITS_CONFIG = [
  { key: "water" as const, label: "Beber 2L de agua", icon: "💧", pts: 10, tip: "El solvente del metabolismo. Sin hidratación, no hay quema de grasa." },
  { key: "sleep" as const, label: "Dormir 7 horas", icon: "😴", pts: 15, tip: "Sin sueño, el cortisol sube y bloquea la pérdida de grasa abdominal." },
  { key: "trained" as const, label: "Ejercicio del día", icon: "🏋️", pts: 15, tip: "Natación, core o fuerza. Mínimo 20 min para contar." },
  { key: "lowCarbDinner" as const, label: "Cena low-carb", icon: "🌙", pts: 20, tip: "Proteína + vegetales. Sin arroz ni pan en la noche." },
  { key: "mindfulness" as const, label: "Pausa / mindfulness", icon: "🧘", pts: 15, tip: "5 min de respiración o caminar post-almuerzo." },
  { key: "supplementation" as const, label: "Suplementación", icon: "💊", pts: 10, tip: "Whey, creatina o vitaminas según tu protocolo." },
] as const;

type BooleanHabitKey = "trained" | "lowCarbDinner" | "mindfulness" | "supplementation";
type ScaleHabitKey = "water" | "sleep";

const SCORE_LEVELS = [
  { min: 0, max: 30, label: "Junior – Principiante", color: "text-destructive", desc: "Es hora de instalar los drivers básicos." },
  { min: 31, max: 60, label: "Semi-Senior – Intermedio", color: "text-yellow-400", desc: "Sistema estable, falta optimizar procesos." },
  { min: 61, max: 100, label: "Senior – Avanzado", color: "text-accent", desc: "¡Arquitectura de alto rendimiento!" },
];

function getLevel(score: number) {
  return SCORE_LEVELS.find((l) => score >= l.min && score <= l.max) || SCORE_LEVELS[0];
}

export default function HabitosPage() {
  const [today, setToday] = useState<DailyHabits | null>(null);
  const [history, setHistory] = useState<{ date: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = getTodayISO();

  const loadData = useCallback(async () => {
    try {
      const [todayData, weeklyData] = await Promise.all([
        api.habits.get(todayStr).catch(() => null),
        api.habits.weekly().catch(() => []),
      ]);
      setToday(todayData);
      setHistory(weeklyData.slice(-14));
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleBoolean(key: BooleanHabitKey) {
    if (!today) return;
    const newVal = !today[key];
    setToday({ ...today, [key]: newVal });
    const saved = await api.habits.upsert({ date: todayStr, [key]: newVal });
    setToday(saved);
  }

  async function toggleWater() {
    const current = today?.waterMl ?? 0;
    const newVal = current >= 2000 ? 0 : 2000;
    setToday((t) => t ? { ...t, waterMl: newVal } : t);
    const saved = await api.habits.upsert({ date: todayStr, waterMl: newVal });
    setToday(saved);
  }

  async function toggleSleep() {
    const current = today?.sleepHours ?? 0;
    const newVal = current >= 7 ? 0 : 7;
    setToday((t) => t ? { ...t, sleepHours: newVal } : t);
    const saved = await api.habits.upsert({ date: todayStr, sleepHours: newVal });
    setToday(saved);
  }

  async function adjustMeals(delta: number) {
    const current = today?.mealsWithProtein ?? 0;
    const newVal = Math.max(0, Math.min(4, current + delta));
    setToday((t) => t ? { ...t, mealsWithProtein: newVal } : t);
    const saved = await api.habits.upsert({ date: todayStr, mealsWithProtein: newVal });
    setToday(saved);
  }

  const isChecked = (key: ScaleHabitKey) =>
    key === "water" ? (today?.waterMl ?? 0) >= 2000 : (today?.sleepHours ?? 0) >= 7;

  const score = today?.score ?? 0;
  const level = getLevel(score);

  const chartData = history.map((h) => ({
    date: h.date.slice(5),
    score: h.score,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <SectionHeader title="Tracker de Hábitos" subtitle="100 puntos diarios · Sistema de bienestar HealthOS" />

      {/* Score card */}
      <Card className="glow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">{formatDate(new Date())}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-bold text-foreground">{score}</p>
              <span className="text-lg text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <Award className={`w-8 h-8 mx-auto ${level.color}`} />
            <p className={`text-xs font-semibold mt-1 ${level.color}`}>{level.label.split("–")[0].trim()}</p>
          </div>
        </div>
        <ProgressBar value={score} max={100} color={score >= 61 ? "accent" : score >= 31 ? "primary" : "destructive"} />
        <p className="text-[11px] text-muted-foreground mt-2">{level.desc}</p>
      </Card>

      {/* Habit checklist */}
      <Card>
        <SectionHeader title="Hábitos de hoy" subtitle="Toca para marcar/desmarcar" />
        <div className="space-y-2">
          {/* Scale habits: water, sleep */}
          {HABITS_CONFIG.filter((h) => h.key === "water" || h.key === "sleep").map((h) => {
            const key = h.key as ScaleHabitKey;
            const done = isChecked(key);
            return (
              <button
                key={h.key}
                onClick={key === "water" ? toggleWater : toggleSleep}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  done ? "bg-accent/10 border border-accent/30" : "bg-secondary/40 border border-transparent hover:border-border"
                }`}
              >
                {done ? <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                <span className="text-xl flex-shrink-0">{h.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{h.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{h.tip}</p>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${done ? "text-accent" : "text-muted-foreground"}`}>+{h.pts}</span>
              </button>
            );
          })}

          {/* Meals counter */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-transparent">
            <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-xl flex-shrink-0">🍗</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Comidas con proteína</p>
              <p className="text-[10px] text-muted-foreground">15 pts al completar 4 comidas</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => adjustMeals(-1)} className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center hover:bg-border transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-bold w-4 text-center text-primary">{today?.mealsWithProtein ?? 0}</span>
              <button onClick={() => adjustMeals(1)} className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center hover:bg-border transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs font-bold text-muted-foreground">+15</span>
          </div>

          {/* Boolean habits */}
          {HABITS_CONFIG.filter((h) => h.key !== "water" && h.key !== "sleep").map((h) => {
            const key = h.key as BooleanHabitKey;
            const done = today?.[key] ?? false;
            return (
              <button
                key={h.key}
                onClick={() => toggleBoolean(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  done ? "bg-accent/10 border border-accent/30" : "bg-secondary/40 border border-transparent hover:border-border"
                }`}
              >
                {done ? <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                <span className="text-xl flex-shrink-0">{h.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{h.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{h.tip}</p>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${done ? "text-accent" : "text-muted-foreground"}`}>+{h.pts}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* History chart */}
      {history.length > 1 && (
        <Card>
          <SectionHeader title="Historial de scores" subtitle="Últimos 14 días" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v} pts`, "Score"]}
                />
                <ReferenceLine y={61} stroke="#22c55e" strokeDasharray="4 2" />
                <ReferenceLine y={31} stroke="#eab308" strokeDasharray="4 2" />
                <Bar dataKey="score" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-accent" /><span className="text-[10px] text-muted-foreground">Senior ({">"}60 pts)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-yellow-500" /><span className="text-[10px] text-muted-foreground">Semi-Senior (31–60)</span></div>
          </div>
        </Card>
      )}

      {/* Error codes */}
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
