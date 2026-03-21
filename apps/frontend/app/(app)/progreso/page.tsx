"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Plus, Scale, Ruler, Zap, Heart, Loader2 } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type BodyMeasurement } from "@/lib/api-client";
import { getCurrentWeek, getTodayISO } from "@/lib/utils";
import { WEIGHT_PROJECTIONS, SWIMMING_PROJECTIONS, USER_PROFILE } from "@/lib/data";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, Legend,
} from "recharts";

const PROGRAM_START = USER_PROFILE.programStartDate;

function weekFromDate(dateStr: string): number {
  const programStart = new Date(PROGRAM_START);
  const d = new Date(dateStr);
  return Math.max(1, Math.floor((d.getTime() - programStart.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1);
}

function RecordModal({ week, onClose, onSaved }: { week: number; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    weightKg: 110,
    waistCm: 105,
    energyLevel: 3 as 1 | 2 | 3 | 4 | 5,
    backPainLevel: 2 as 1 | 2 | 3 | 4 | 5,
    notes: "",
  });

  async function save() {
    setSaving(true);
    try {
      await api.body.create({ date: getTodayISO(), ...form });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm space-y-4">
        <SectionHeader title={`Registro Semana ${week}`} subtitle="Mide siempre en las mismas condiciones" />
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Peso (kg)</label>
          <input type="number" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: +e.target.value })}
            className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cintura (cm)</label>
          <input type="number" value={form.waistCm} onChange={(e) => setForm({ ...form, waistCm: +e.target.value })}
            className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nivel de energía (1–5)</label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((v) => (
              <button key={v} onClick={() => setForm({ ...form, energyLevel: v })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${form.energyLevel === v ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Dolor lumbar (1–5, 1=mínimo)</label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((v) => (
              <button key={v} onClick={() => setForm({ ...form, backPainLevel: v })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${form.backPainLevel === v ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border resize-none" />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1" onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ProgresoPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [swimmingMeters, setSwimmingMeters] = useState<Record<number, number>>({});
  const [currentWeek, setCurrentWeek] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setCurrentWeek(getCurrentWeek(PROGRAM_START));
    try {
      const [bodyData, swimmingStats] = await Promise.all([
        api.body.list(),
        api.swimming.stats(),
      ]);
      setMeasurements(bodyData.sort((a, b) => a.date.localeCompare(b.date)));
      const byWeek: Record<number, number> = {};
      swimmingStats.byWeek.forEach(({ week, totalMeters }) => { byWeek[week] = totalMeters; });
      setSwimmingMeters(byWeek);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const latestRecord = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const weightLost = latestRecord?.weightKg ? USER_PROFILE.weightStart - latestRecord.weightKg : 0;

  const weightChartData = WEIGHT_PROJECTIONS.map((p) => {
    const rec = measurements.find((m) => weekFromDate(m.date) === p.week);
    return { week: p.week, projected: p.weight, actual: rec?.weightKg ?? null };
  });

  const swimmingChartData = SWIMMING_PROJECTIONS.map((p) => ({
    week: p.week,
    projected: p.meters,
    actual: swimmingMeters[p.week] ?? null,
  }));

  const weeks = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    const rec = measurements.find((m) => weekFromDate(m.date) === w);
    const month = w <= 4 ? 1 : w <= 8 ? 2 : 3;
    return { w, rec, month, isCurrent: w === currentWeek };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Seguimiento de Progreso" subtitle="12 semanas · Registra cada domingo por la mañana" />
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Semana {currentWeek}
        </Button>
      </div>

      {showModal && <RecordModal week={currentWeek} onClose={() => setShowModal(false)} onSaved={loadData} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <Scale className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{latestRecord?.weightKg ?? 110}</p>
          <p className="text-[10px] text-muted-foreground">kg actuales</p>
        </Card>
        <Card className="text-center">
          <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold text-accent">{weightLost > 0 ? `-${weightLost.toFixed(1)}` : "0"}</p>
          <p className="text-[10px] text-muted-foreground">kg perdidos</p>
        </Card>
        <Card className="text-center">
          <Ruler className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{latestRecord?.waistCm ?? "–"}</p>
          <p className="text-[10px] text-muted-foreground">cm cintura</p>
        </Card>
        <Card className="text-center">
          <Heart className="w-5 h-5 text-destructive mx-auto mb-2" />
          <p className="text-2xl font-bold">{latestRecord?.backPainLevel ?? "–"}</p>
          <p className="text-[10px] text-muted-foreground">dolor lumbar (1–5)</p>
        </Card>
      </div>

      {/* 12-week calendar */}
      <Card>
        <SectionHeader title="Calendario 12 semanas" subtitle="Verde = registrado · Azul = semana actual · Gris = próximas" />
        <div className="space-y-3">
          {[1, 2, 3].map((month) => (
            <div key={month}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
                Mes {month} – {["", "Adaptación", "Pérdida de grasa", "Resistencia"][month]}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {weeks.filter((w) => w.month === month).map(({ w, rec, isCurrent }) => (
                  <div
                    key={w}
                    className={`rounded-lg p-2.5 text-center transition-all ${
                      isCurrent ? "bg-primary/20 border border-primary" :
                      rec ? "bg-accent/10 border border-accent/30" :
                      "bg-secondary/40 border border-border"
                    }`}
                  >
                    <p className={`text-xs font-bold ${isCurrent ? "text-primary" : rec ? "text-accent" : "text-muted-foreground"}`}>
                      S{w}
                    </p>
                    {rec ? (
                      <p className="text-[10px] mt-0.5 font-medium">{rec.weightKg} kg</p>
                    ) : (
                      <p className="text-[10px] mt-0.5 text-muted-foreground/50">{isCurrent ? "Hoy" : "–"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight chart */}
        <Card>
          <SectionHeader title="Peso real vs proyectado" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis domain={[92, 115]} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, n: string) => [`${v} kg`, n === "projected" ? "Proyectado" : "Real"]} />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => v === "projected" ? "Proyectado" : "Real"} />
                <Line type="monotone" dataKey="projected" stroke="rgba(14,165,233,0.3)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                <Line type="monotone" dataKey="actual" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Swimming chart */}
        <Card>
          <SectionHeader title="Metros nadados vs proyectados" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={swimmingChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, n: string) => [`${v} m`, n === "projected" ? "Proyectado" : "Real"]} />
                <Bar dataKey="projected" fill="rgba(14,165,233,0.2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Energy & pain trend */}
      {measurements.length > 1 && (
        <Card>
          <SectionHeader title="Energía y dolor lumbar" subtitle="Tendencia semanal (1–5)" />
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={measurements.slice(-12).map((m) => ({
                  week: `S${weekFromDate(m.date)}`,
                  energy: m.energyLevel,
                  pain: m.backPainLevel,
                }))}
                margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }} />
                <ReferenceLine y={3} stroke="rgba(255,255,255,0.1)" />
                <Line type="monotone" dataKey="energy" stroke="#22c55e" strokeWidth={2} name="Energía" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="pain" stroke="#ef4444" strokeWidth={2} name="Dolor" dot={{ r: 4 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-green-400" /><span className="text-[10px] text-muted-foreground">Energía</span></div>
            <div className="flex items-center gap-1.5"><Heart className="w-3 h-3 text-red-400" /><span className="text-[10px] text-muted-foreground">Dolor lumbar</span></div>
          </div>
        </Card>
      )}
    </div>
  );
}