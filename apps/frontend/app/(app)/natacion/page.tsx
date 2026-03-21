"use client";
import { useState, useEffect, useCallback } from "react";
import { Waves, Plus, Clock, Flame, Heart, Loader2 } from "lucide-react";
import { Card, SectionHeader, Badge, ProgressBar } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type SwimmingSession } from "@/lib/api-client";
import { getCurrentWeek, getSwimmingVolume, getTodayISO } from "@/lib/utils";
import { SWIMMING_PROJECTIONS, HEART_RATE_ZONES, USER_PROFILE } from "@/lib/data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const PROGRAM_START = USER_PROFILE.programStartDate;

function LogModal({ onClose, week, onSaved }: { onClose: () => void; week: number; onSaved: () => void }) {
  const m = week <= 4 ? 1 : week <= 8 ? 2 : 3;
  const [saving, setSaving] = useState(false);
  const lapsByDay: Record<string, number> = {
    martes: m === 1 ? 20 : m === 2 ? 26 : 34,
    jueves: m === 1 ? 20 : m === 2 ? 26 : 32,
    viernes: m === 1 ? 12 : m === 2 ? 16 : 12,
    sabado: m === 1 ? 26 : m === 2 ? 36 : 46,
  };
  const [form, setForm] = useState({
    dayType: "martes" as "martes" | "jueves" | "viernes" | "sabado",
    durationMinutes: 30,
    notes: "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      await api.swimming.create({
        date: getTodayISO(),
        totalMeters: (lapsByDay[form.dayType] ?? 20) * 25,
        durationMinutes: form.durationMinutes,
        notes: form.notes || undefined,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-4">
        <SectionHeader title="Registrar sesión de natación" />
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Día</label>
          <select
            value={form.dayType}
            onChange={(e) => setForm({ ...form, dayType: e.target.value as typeof form.dayType })}
            className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border"
          >
            <option value="martes">Martes – Técnica ({lapsByDay.martes * 25} m)</option>
            <option value="jueves">Jueves – Cardio ({lapsByDay.jueves * 25} m)</option>
            <option value="viernes">Viernes – Suave ({lapsByDay.viernes * 25} m)</option>
            <option value="sabado">Sábado – Largo ({lapsByDay.sabado * 25} m)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Duración (min)</label>
          <input
            type="number"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Notas (opcional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border resize-none"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function NatacionPage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [sessions, setSessions] = useState<SwimmingSession[]>([]);
  const [weeklyMeters, setWeeklyMeters] = useState<Record<number, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const w = getCurrentWeek(PROGRAM_START);
    setCurrentWeek(w);
    try {
      const [sessionList, statsData] = await Promise.all([
        api.swimming.list(),
        api.swimming.stats(),
      ]);
      setSessions(sessionList.slice(-10).reverse());
      const byWeek: Record<number, number> = {};
      statsData.byWeek.forEach(({ week, totalMeters }) => { byWeek[week] = totalMeters; });
      setWeeklyMeters(byWeek);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const vol = getSwimmingVolume(currentWeek);
  const thisWeekMeters = weeklyMeters[currentWeek] || 0;
  const targetMeters = currentWeek <= 4 ? 1000 : currentWeek <= 8 ? 1400 : 2000;
  const chartData = SWIMMING_PROJECTIONS.map((p) => ({ ...p, actual: weeklyMeters[p.week] ?? null }));
  const m = currentWeek <= 4 ? 1 : currentWeek <= 8 ? 2 : 3;

  const routineByMonth: Record<number, { day: string; sets: string; total: number }[]> = {
    1: [
      { day: "Martes", sets: "4 cal + 8 libre + 4 espalda + 4 tabla", total: 20 },
      { day: "Jueves", sets: "4 cal + 10 libre + 6 espalda", total: 20 },
      { day: "Viernes", sets: "8 libre + 4 espalda", total: 12 },
      { day: "Sábado", sets: "4 cal + 12 libre + 6 espalda + 4 tabla", total: 26 },
    ],
    2: [
      { day: "Martes", sets: "4 cal + 12 libre + 6 espalda + 4 tabla", total: 26 },
      { day: "Jueves", sets: "4 cal + 14 libre + 8 espalda", total: 26 },
      { day: "Viernes", sets: "10 libre + 6 espalda", total: 16 },
      { day: "Sábado", sets: "4 cal + 18 libre + 8 espalda + 6 tabla", total: 36 },
    ],
    3: [
      { day: "Martes", sets: "4 cal + 16 libre + 8 espalda + 6 tabla", total: 34 },
      { day: "Jueves", sets: "4 cal + 18 libre + 10 espalda", total: 32 },
      { day: "Viernes", sets: "12 libre", total: 12 },
      { day: "Sábado", sets: "4 cal + 24 libre + 10 espalda + 8 tabla", total: 46 },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Módulo de Natación" subtitle={`${vol.label} · Meta: ${vol.target}`} />
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Registrar
        </Button>
      </div>

      {showModal && (
        <LogModal onClose={() => setShowModal(false)} week={currentWeek} onSaved={loadData} />
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center border-primary/30 bg-primary/5">
          <Heart className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{HEART_RATE_ZONES.zone2Min}–{HEART_RATE_ZONES.zone2Max}</p>
          <p className="text-[10px] text-muted-foreground">bpm Zona 2</p>
        </Card>
        <Card className="text-center">
          <Waves className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-xl font-bold">{thisWeekMeters}</p>
          <p className="text-[10px] text-muted-foreground">m esta semana</p>
        </Card>
        <Card className="text-center">
          <Flame className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{sessions.length}</p>
          <p className="text-[10px] text-muted-foreground">sesiones totales</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Meta semanal</p>
          <span className="text-xs text-muted-foreground">{thisWeekMeters} / {targetMeters} m</span>
        </div>
        <ProgressBar value={thisWeekMeters} max={targetMeters} color={thisWeekMeters >= targetMeters ? "accent" : "primary"} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title={`Mes ${m} – Rutina semanal`} subtitle={`Semana ${currentWeek} · Piscina 25 m`} />
          <div className="space-y-3">
            {routineByMonth[m].map((r, i) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-primary">{r.day}</p>
                  <Badge variant="info">{r.total} largos · {r.total * 25} m</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{r.sets}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Progresión de metros" subtitle="Real vs proyección" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, name: string) => [`${v} m`, name === "meters" ? "Proyectado" : "Real"]}
                />
                <Bar dataKey="meters" fill="rgba(14,165,233,0.2)" name="Proyectado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#0ea5e9" name="Real" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { style: "Estilo Libre", icon: "🏊", tip: "Cuerpo horizontal, rotación suave del torso, respiración lateral. NO levantar la cabeza." },
          { style: "Espalda", icon: "🤽", tip: "Boca arriba, activa glúteos, abdomen contraído. Abre el pecho. Excelente para L5-S1." },
          { style: "Patada con tabla", icon: "🦵", tip: "Sostén la tabla al frente, patada desde la cadera (no rodilla). Abdomen profundo activo." },
        ].map((t) => (
          <Card key={t.style} className="border-primary/15">
            <div className="text-2xl mb-2">{t.icon}</div>
            <p className="text-xs font-semibold mb-1">{t.style}</p>
            <p className="text-[11px] text-muted-foreground">{t.tip}</p>
          </Card>
        ))}
      </div>

      {sessions.length > 0 && (
        <Card>
          <SectionHeader title="Sesiones recientes" />
          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50">
                <Waves className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{s.date}</p>
                  {s.notes && <p className="text-[10px] text-muted-foreground truncate">{s.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary">{s.totalMeters} m</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px]">{s.durationMinutes} min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="border-accent/20 bg-accent/5">
        <p className="text-xs font-semibold text-accent mb-3">🏥 Ejercicios terapéuticos en piscina</p>
        <div className="space-y-2">
          {[
            { name: "Descompresión flotando", desc: "5 min · Noodle bajo rodillas, flotar boca arriba, brazos abiertos.", icon: "🦦" },
            { name: "Caminata en agua profunda", desc: "5–10 min · Agua al pecho, caminar lento, abdomen activado.", icon: "🚶" },
            { name: "Patada dorsal", desc: "4–6 largos · Boca arriba, patada suave, abdomen contraído.", icon: "🏊" },
          ].map((ex) => (
            <div key={ex.name} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <span className="text-xl">{ex.icon}</span>
              <div>
                <p className="text-xs font-medium">{ex.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ex.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}