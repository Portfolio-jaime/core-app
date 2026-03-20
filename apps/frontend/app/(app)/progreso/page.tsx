"use client";
import { useState, useEffect } from "react";
import { TrendingUp, Plus, Scale, Ruler, Zap, Heart } from "lucide-react";
import { Card, SectionHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getWeeklyRecords, saveWeeklyRecord, getSwimmingSessions } from "@/lib/store";
import { getCurrentWeek } from "@/lib/utils";
import { WEIGHT_PROJECTIONS, SWIMMING_PROJECTIONS, USER_PROFILE } from "@/lib/data";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, Legend
} from "recharts";
import type { WeeklyRecord } from "@/types";

const PROGRAM_START = USER_PROFILE.programStartDate;

function RecordModal({ week, onClose }: { week: number; onClose: () => void }) {
  const [form, setForm] = useState({ weight: 110, waist: 105, energyLevel: 3 as 1|2|3|4|5, lumbarPain: 2 as 1|2|3|4|5, notes: "" });

  function save() {
    const record: WeeklyRecord = {
      id: `week-${week}`,
      week,
      date: new Date().toISOString().split("T")[0],
      ...form,
    };
    saveWeeklyRecord(record);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm space-y-4">
        <SectionHeader title={`Registro Semana ${week}`} subtitle="Mide siempre en las mismas condiciones" />
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Peso (kg)</label>
          <input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: +e.target.value })}
            className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cintura (cm)</label>
          <input type="number" value={form.waist} onChange={(e) => setForm({ ...form, waist: +e.target.value })}
            className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nivel de energía (1–5)</label>
          <div className="flex gap-2">
            {([1,2,3,4,5] as const).map((v) => (
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
            {([1,2,3,4,5] as const).map((v) => (
              <button key={v} onClick={() => setForm({ ...form, lumbarPain: v })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${form.lumbarPain === v ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground"}`}>
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
          <Button size="sm" className="flex-1" onClick={save}>Guardar</Button>
        </div>
      </Card>
    </div>
  );
}

export default function ProgresoPage() {
  const [records, setRecords] = useState<WeeklyRecord[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [swimmingMeters, setSwimmingMeters] = useState<Record<number, number>>({});

  useEffect(() => {
    setCurrentWeek(getCurrentWeek(PROGRAM_START));
    setRecords(getWeeklyRecords());
    const sessions = getSwimmingSessions();
    const programStart = new Date(PROGRAM_START);
    const metersByWeek: Record<number, number> = {};
    sessions.forEach((s) => {
      const w = Math.floor((new Date(s.date).getTime() - programStart.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
      metersByWeek[w] = (metersByWeek[w] || 0) + s.totalMeters;
    });
    setSwimmingMeters(metersByWeek);
  }, [showModal]);

  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const weightLost = latestRecord ? USER_PROFILE.weightStart - latestRecord.weight : 0;
  const pctTotalGoal = Math.round((weightLost / (USER_PROFILE.weightStart - 90)) * 100);

  // Merge actual with projections for chart
  const weightChartData = WEIGHT_PROJECTIONS.map((p) => {
    const actual = records.find((r) => r.week === p.week);
    return { week: p.week, projected: p.weight, actual: actual?.weight ?? null };
  });

  const swimmingChartData = SWIMMING_PROJECTIONS.map((p) => ({
    week: p.week,
    projected: p.meters,
    actual: swimmingMeters[p.week] ?? null,
  }));

  // 12-week calendar grid
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    const record = records.find((r) => r.week === w);
    const month = w <= 4 ? 1 : w <= 8 ? 2 : 3;
    const monthLabel = ["", "Adaptación", "Quema grasa", "Resistencia"][month];
    return { w, record, month, monthLabel, isCurrent: w === currentWeek, isFuture: w > currentWeek };
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Seguimiento de Progreso" subtitle="12 semanas · Registra cada domingo por la mañana" />
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Semana {currentWeek}
        </Button>
      </div>

      {showModal && <RecordModal week={currentWeek} onClose={() => setShowModal(false)} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <Scale className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{latestRecord?.weight ?? 110}</p>
          <p className="text-[10px] text-muted-foreground">kg actuales</p>
        </Card>
        <Card className="text-center">
          <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold text-accent">{weightLost > 0 ? `-${weightLost.toFixed(1)}` : "0"}</p>
          <p className="text-[10px] text-muted-foreground">kg perdidos</p>
        </Card>
        <Card className="text-center">
          <Ruler className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{latestRecord?.waist ?? "–"}</p>
          <p className="text-[10px] text-muted-foreground">cm cintura</p>
        </Card>
        <Card className="text-center">
          <Heart className="w-5 h-5 text-destructive mx-auto mb-2" />
          <p className="text-2xl font-bold">{latestRecord?.lumbarPain ?? "–"}</p>
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
                {weeks.filter((w) => w.month === month).map(({ w, record, isCurrent, isFuture }) => (
                  <div
                    key={w}
                    className={`rounded-lg p-2.5 text-center transition-all ${
                      isCurrent ? "bg-primary/20 border border-primary" :
                      record ? "bg-accent/10 border border-accent/30" :
                      "bg-secondary/40 border border-border"
                    }`}
                  >
                    <p className={`text-xs font-bold ${isCurrent ? "text-primary" : record ? "text-accent" : "text-muted-foreground"}`}>
                      S{w}
                    </p>
                    {record ? (
                      <p className="text-[10px] mt-0.5 font-medium">{record.weight} kg</p>
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
                <YAxis domain={[93, 112]} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, name: string) => [`${v} kg`, name === "projected" ? "Proyectado" : "Real"]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="projected" stroke="rgba(14,165,233,0.4)" strokeWidth={1.5} dot={false} name="Proyectado" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="actual" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3, fill: "#0ea5e9" }} name="Real" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Swimming chart */}
        <Card>
          <SectionHeader title="Metros nadados por semana" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={swimmingChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, name: string) => [`${v} m`, name === "projected" ? "Proyectado" : "Real"]} />
                <Bar dataKey="projected" fill="rgba(34,197,94,0.15)" name="Proyectado" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" fill="#22c55e" name="Real" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Records table */}
      {records.length > 0 && (
        <Card>
          <SectionHeader title="Historial de registros" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left pb-2 pr-4">Semana</th>
                  <th className="text-right pb-2 pr-4">Peso</th>
                  <th className="text-right pb-2 pr-4">Cintura</th>
                  <th className="text-right pb-2 pr-4">Energía</th>
                  <th className="text-right pb-2">Dolor</th>
                </tr>
              </thead>
              <tbody>
                {records.slice().reverse().map((r) => (
                  <tr key={r.week} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">Semana {r.week}</td>
                    <td className="py-2 pr-4 text-right font-bold text-primary">{r.weight} kg</td>
                    <td className="py-2 pr-4 text-right">{r.waist} cm</td>
                    <td className="py-2 pr-4 text-right">
                      <span className="text-accent">{"★".repeat(r.energyLevel)}{"☆".repeat(5 - r.energyLevel)}</span>
                    </td>
                    <td className="py-2 text-right">
                      <Badge variant={r.lumbarPain <= 2 ? "success" : r.lumbarPain <= 3 ? "warning" : "danger"}>
                        {r.lumbarPain}/5
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Goals */}
      <Card className="border-primary/20 bg-primary/5">
        <SectionHeader title="Metas del programa" subtitle="110 kg → 90 kg en 6 meses (2 ciclos)" />
        <div className="space-y-3">
          {[
            { label: "Mes 1: 110 → 105 kg", current: USER_PROFILE.weightStart, target: USER_PROFILE.weightGoalMonth1 },
            { label: "Mes 2: 105 → 101 kg", current: USER_PROFILE.weightGoalMonth1, target: USER_PROFILE.weightGoalMonth2 },
            { label: "Mes 3: 101 → 97 kg", current: USER_PROFILE.weightGoalMonth2, target: USER_PROFILE.weightGoalMonth3 },
          ].map((g) => {
            const actual = records.length > 0 ? records[records.length - 1].weight : USER_PROFILE.weightStart;
            const pct = Math.min(Math.max(Math.round(((g.current - actual) / (g.current - g.target)) * 100), 0), 100);
            return (
              <div key={g.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs">{g.label}</span>
                  <span className="text-xs text-muted-foreground">{g.target} kg meta</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
