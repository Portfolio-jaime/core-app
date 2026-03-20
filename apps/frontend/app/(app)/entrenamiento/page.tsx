"use client";
import { useState } from "react";
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card, SectionHeader, Badge } from "@/components/ui/card";
import { WEEKLY_SCHEDULE, EXERCISES } from "@/lib/data";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { TrainingDay } from "@/types";

const dayLabels: Record<string, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves",
  viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
};
const typeColor: Record<string, string> = {
  core: "text-yellow-400", swimming: "text-primary", strength: "text-accent", rest: "text-muted-foreground",
};
const typeIcon: Record<string, string> = {
  core: "🧘", swimming: "🏊", strength: "💪", rest: "😴",
};
const styleNames: Record<string, string> = {
  warmup: "Calentamiento", freestyle: "Estilo Libre", backstroke: "Espalda", kickboard: "Patada con tabla",
};

function ExerciseCard({ id }: { id: string }) {
  const ex = EXERCISES.find((e) => e.id === id);
  const [open, setOpen] = useState(false);
  if (!ex) return null;
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-sm">
          {ex.category === "core" ? "🧘" : ex.category === "strength" ? "💪" : ex.category === "mobility" ? "🔄" : "🤸"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{ex.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {ex.sets} series × {ex.reps ? `${ex.reps} reps` : `${ex.duration}s`}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border p-3 bg-background/50 space-y-3">
          <p className="text-xs text-muted-foreground">{ex.description}</p>
          <div className="relative w-full aspect-video rounded-md overflow-hidden bg-secondary">
            <Image src={ex.imageUrl} alt={ex.name} fill className="object-cover" unoptimized />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Pasos</p>
            <ol className="space-y-1">
              {ex.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-[11px]">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          {ex.notes && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2">
              <p className="text-[10px] text-yellow-400">⚠️ {ex.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DayCard({ day, isToday }: { day: TrainingDay; isToday: boolean }) {
  const [expanded, setExpanded] = useState(isToday);
  const [done, setDone] = useState(false);

  return (
    <Card className={cn("transition-all", isToday && "border-primary/40 glow")}>
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{typeIcon[day.type]}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{dayLabels[day.day]}</span>
              {isToday && <Badge variant="info">HOY</Badge>}
            </div>
            <p className={cn("text-xs", typeColor[day.type])}>{day.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{day.durationMin} min</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Swimming */}
          {day.type === "swimming" && day.swimmingSets && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Rutina de piscina</p>
              {day.swimmingSets.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50">
                  <div className="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
                    {s.laps}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium">{styleNames[s.style] || s.style}</p>
                    {s.note && <p className="text-[10px] text-muted-foreground">{s.note}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{s.laps * 25} m</span>
                </div>
              ))}
              <div className="flex justify-between mt-1 pt-2 border-t border-border text-xs">
                <span className="text-muted-foreground">Total largos</span>
                <span className="font-bold text-primary">
                  {day.swimmingSets.reduce((a, s) => a + s.laps, 0)} largos · {day.swimmingSets.reduce((a, s) => a + s.laps, 0) * 25} m
                </span>
              </div>
            </div>
          )}

          {/* Core / Strength exercises */}
          {(day.type === "core" || day.type === "strength") && day.exercises && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Ejercicios</p>
              {day.exercises.map((ex) => (
                <ExerciseCard key={ex} id={ex} />
              ))}
            </div>
          )}

          {/* Rest day */}
          {day.type === "rest" && (
            <div className="bg-secondary/40 rounded-lg p-4 text-center">
              <p className="text-2xl mb-2">🌟</p>
              <p className="text-xs font-medium">Descanso activo</p>
              <p className="text-[10px] text-muted-foreground mt-1">Caminar 20 min + estiramientos</p>
            </div>
          )}

          <button
            onClick={() => setDone(!done)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all",
              done ? "bg-accent/15 text-accent border border-accent/30" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            {done ? "¡Completado!" : "Marcar como completado"}
          </button>
        </div>
      )}
    </Card>
  );
}

export default function EntrenamientoPage() {
  const todayName = new Date().toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <SectionHeader title="Plan de Entrenamiento" subtitle="Semana tipo · 4 días natación + 3 días fuerza/core" />

      {/* Swimming schedule summary */}
      <Card className="bg-primary/5 border-primary/20">
        <p className="text-xs font-semibold text-primary mb-3">🏊 Frecuencia en piscina</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {["Martes", "Jueves", "Viernes", "Sábado"].map((d) => (
            <div key={d} className="bg-primary/10 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">{d}</p>
              <p className="text-xs font-bold text-primary mt-0.5">🏊</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">Mantén FC en Zona 2: 105–122 bpm</p>
      </Card>

      {/* Day cards */}
      <div className="space-y-3">
        {WEEKLY_SCHEDULE.map((day) => {
          const dayLabel = dayLabels[day.day].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return (
            <DayCard key={day.day} day={day} isToday={dayLabel === todayName} />
          );
        })}
      </div>

      {/* McGill tip */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Reglas de oro para L5-S1</p>
        <ul className="space-y-1">
          {[
            "No levantar la cabeza al respirar en natación",
            "Patada desde la cadera, no desde la rodilla",
            "Abdomen activo en todos los ejercicios",
            "Movimientos lentos y controlados",
            "Si hay dolor lumbar: detente inmediatamente",
          ].map((rule, i) => (
            <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
              <span>•</span><span>{rule}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
