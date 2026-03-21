"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Droplets, Scale, Flame, Activity, CheckCircle2, Circle,
  Waves, Dumbbell, Award, TrendingDown, Target, Loader2
} from "lucide-react";
import { Card, StatCard, ProgressBar, SectionHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { api, type UserStats, type DailyHabits } from "@/lib/api-client";
import { getTodayDayName, formatDate, getTodayISO } from "@/lib/utils";
import { WEEKLY_SCHEDULE, WEIGHT_PROJECTIONS } from "@/lib/data";

type HabitKey = keyof Pick<
  DailyHabits,
  "trained" | "lowCarbDinner" | "mindfulness" | "supplementation"
>;

const BOOLEAN_HABITS: { key: HabitKey; label: string; pts: number }[] = [
  { key: "trained", label: "Ejercicio", pts: 15 },
  { key: "lowCarbDinner", label: "Cena low-carb", pts: 20 },
  { key: "mindfulness", label: "Mindfulness", pts: 15 },
  { key: "supplementation", label: "Suplementos", pts: 10 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [habits, setHabits] = useState<DailyHabits | null>(null);
  const [loading, setLoading] = useState(true);

  const today = getTodayISO();

  const loadData = useCallback(async () => {
    try {
      const [statsData, habitsData] = await Promise.all([
        api.users.stats(),
        api.habits.get(today).catch(() => null),
      ]);
      setStats(statsData);
      setHabits(habitsData);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleBoolean(key: HabitKey) {
    if (!habits) return;
    const updated: DailyHabits = { ...habits, [key]: !habits[key] };
    setHabits(updated);
    const saved = await api.habits.upsert({ date: today, [key]: !habits[key] });
    setHabits(saved);
  }

  async function toggleWater() {
    if (!habits) return;
    const newVal = habits.waterMl >= 2000 ? 0 : 2000;
    setHabits({ ...habits, waterMl: newVal });
    const saved = await api.habits.upsert({ date: today, waterMl: newVal });
    setHabits(saved);
  }

  async function toggleSleep() {
    if (!habits) return;
    const newVal = habits.sleepHours >= 7 ? 0 : 7;
    setHabits({ ...habits, sleepHours: newVal });
    const saved = await api.habits.upsert({ date: today, sleepHours: newVal });
    setHabits(saved);
  }

  const todayName = getTodayDayName();
  const todaySchedule = WEEKLY_SCHEDULE.find((d) => d.day === todayName);

  const score = habits?.score ?? stats?.todayScore ?? 0;
  const currentWeek = stats?.currentWeek ?? 1;
  const latestWeight = stats?.latestWeight ?? 110;
  const weightGoal = stats?.weightGoalKg ?? 97;
  const weightLost = 110 - latestWeight;
  const weekMeters = stats?.weekMeters ?? 0;

  const typeLabel: Record<string, string> = {
    core: "🧘 Core",
    swimming: "🏊 Natación",
    strength: "💪 Fuerza",
    rest: "😴 Descanso",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            HealthOS 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(new Date())} · Semana {currentWeek}/12 · {stats?.currentPhase ?? ""}
          </p>
        </div>
        <Badge variant="info" className="text-xs px-3 py-1.5">
          Semana {currentWeek}
        </Badge>
      </div>

      {/* Week progress */}
      <Card className="glow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Progreso del Programa</span>
          <span className="text-xs text-muted-foreground">{currentWeek} de 12 semanas</span>
        </div>
        <ProgressBar value={currentWeek} max={12} color="primary" />
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>Mes 1 – Adaptación</span>
          <span>Mes 2 – Quema grasa</span>
          <span>Mes 3 – Resistencia</span>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Peso actual" value={latestWeight ?? "—"} unit="kg" icon={<Scale className="w-4 h-4" />} color="primary" />
        <StatCard label="Perdido" value={weightLost > 0 ? `-${weightLost.toFixed(1)}` : "0"} unit="kg" icon={<TrendingDown className="w-4 h-4" />} color="accent" />
        <StatCard label="Meta" value={weightGoal ?? "—"} unit="kg" icon={<Target className="w-4 h-4" />} color="warning" />
        <StatCard label="Score hoy" value={score} unit="/ 100" icon={<Award className="w-4 h-4" />} color={score >= 70 ? "accent" : "primary"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today + Habits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's workout */}
          {todaySchedule && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <SectionHeader title={`Hoy: ${typeLabel[todaySchedule.type] || todaySchedule.label}`} subtitle={`${todaySchedule.durationMin} min estimados`} />
                <Badge variant={todaySchedule.type === "rest" ? "default" : "info"}>
                  {todayName.charAt(0).toUpperCase() + todayName.slice(1)}
                </Badge>
              </div>
              {todaySchedule.type === "swimming" && todaySchedule.swimmingSets && (
                <div className="space-y-2">
                  {todaySchedule.swimmingSets.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50">
                      <div className="w-7 h-7 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">{s.laps}</div>
                      <div>
                        <p className="text-xs font-medium capitalize">{s.style === "warmup" ? "Calentamiento" : s.style === "freestyle" ? "Estilo libre" : s.style === "backstroke" ? "Espalda" : "Patada con tabla"}</p>
                        {s.note && <p className="text-[10px] text-muted-foreground">{s.note}</p>}
                      </div>
                      <span className="ml-auto text-[10px] text-muted-foreground">{s.laps * 25}m</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-sm font-bold text-primary">{todaySchedule.swimmingSets.reduce((a, s) => a + s.laps, 0) * 25} m</span>
                  </div>
                </div>
              )}
              {todaySchedule.type !== "swimming" && todaySchedule.exercises && (
                <div className="space-y-2">
                  {todaySchedule.exercises.map((ex) => (
                    <div key={ex} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50">
                      <Dumbbell className="w-4 h-4 text-primary" />
                      <p className="text-xs font-medium capitalize">{ex.replace(/-/g, " ")}</p>
                    </div>
                  ))}
                </div>
              )}
              {todaySchedule.type === "rest" && (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">😴</p>
                  <p className="text-sm text-muted-foreground">Día de descanso activo</p>
                  <p className="text-xs text-muted-foreground mt-1">Caminar 20 min o estiramientos</p>
                </div>
              )}
            </Card>
          )}

          {/* Daily habits checklist */}
          {habits !== undefined && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader title="Hábitos del día" subtitle="Marca los que vas completando" />
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{score}</p>
                  <p className="text-[10px] text-muted-foreground">/ 100 pts</p>
                </div>
              </div>
              <ProgressBar value={score} max={100} color={score >= 70 ? "accent" : "primary"} className="mb-4" />
              <div className="grid grid-cols-2 gap-2">
                {/* Water toggle */}
                <button
                  onClick={toggleWater}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
                    (habits?.waterMl ?? 0) >= 2000
                      ? "bg-accent/15 border border-accent/30"
                      : "bg-secondary/40 border border-transparent hover:border-border"
                  }`}
                >
                  {(habits?.waterMl ?? 0) >= 2000 ? (
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">2L agua</p>
                    <p className="text-[9px] text-muted-foreground">+10 pts</p>
                  </div>
                </button>

                {/* Sleep toggle */}
                <button
                  onClick={toggleSleep}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
                    (habits?.sleepHours ?? 0) >= 7
                      ? "bg-accent/15 border border-accent/30"
                      : "bg-secondary/40 border border-transparent hover:border-border"
                  }`}
                >
                  {(habits?.sleepHours ?? 0) >= 7 ? (
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">Dormir 7h</p>
                    <p className="text-[9px] text-muted-foreground">+15 pts</p>
                  </div>
                </button>

                {/* Boolean habits */}
                {BOOLEAN_HABITS.map((item) => {
                  const checked = habits?.[item.key] ?? false;
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleBoolean(item.key)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
                        checked
                          ? "bg-accent/15 border border-accent/30"
                          : "bg-secondary/40 border border-transparent hover:border-border"
                      }`}
                    >
                      {checked ? (
                        <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate">{item.label}</p>
                        <p className="text-[9px] text-muted-foreground">+{item.pts} pts</p>
                      </div>
                    </button>
                  );
                })}

                {/* Meals counter */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40 border border-transparent col-span-2">
                  <Activity className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium">Comidas con proteína</p>
                    <p className="text-[9px] text-muted-foreground">+15 pts (≥4 comidas)</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{habits?.mealsWithProtein ?? 0}/4</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Weight chart + weekly stats */}
        <div className="space-y-4">
          <Card>
            <SectionHeader title="Esta semana" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Metros nadados</span>
                </div>
                <span className="text-sm font-bold">{weekMeters} m</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Proteína hoy</span>
                </div>
                <span className="text-sm font-bold">{stats?.todayProteinG ?? 0} g</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">Score promedio</span>
                </div>
                <span className="text-sm font-bold">
                  {stats?.weeklyScores?.length
                    ? Math.round(stats.weeklyScores.reduce((a, b) => a + b, 0) / stats.weeklyScores.length)
                    : 0}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Proyección de peso" subtitle="110 → 97 kg en 12 semanas" />
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={WEIGHT_PROJECTIONS} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis domain={[95, 112]} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                    labelFormatter={(v) => `Semana ${v}`}
                    formatter={(v: number) => [`${v} kg`, "Peso"]}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Hidratación</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-6 rounded-sm transition-colors ${
                      i < Math.round(((habits?.waterMl ?? 0) / 2000) * 8) ? "bg-primary" : "bg-secondary"
                    }`}
                  />
                ))}
              </div>
              <div>
                <p className="text-sm font-bold">{(((habits?.waterMl ?? 0) / 1000)).toFixed(1)} L</p>
                <p className="text-[10px] text-muted-foreground">Meta: 2L</p>
              </div>
            </div>
            <Button
              size="sm"
              variant={(habits?.waterMl ?? 0) >= 2000 ? "success" : "outline"}
              className="w-full mt-3"
              onClick={toggleWater}
            >
              <Droplets className="w-3.5 h-3.5" />
              {(habits?.waterMl ?? 0) >= 2000 ? "✓ 2L completados" : "Marcar 2L"}
            </Button>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">Zona de Quema</span>
            </div>
            <p className="text-2xl font-bold text-foreground">105–122</p>
            <p className="text-[10px] text-muted-foreground">bpm · Zona 2 para quemar grasa</p>
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground">FC Máx: 175 bpm · Edad: 45 años</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
