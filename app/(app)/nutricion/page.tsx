"use client";
import { useState } from "react";
import { Apple, ChevronLeft, ChevronRight, Flame, Beef } from "lucide-react";
import { Card, SectionHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WEEK_MENUS } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { WeekMenu } from "@/types";

const weekLabels: Record<WeekMenu["week"], string> = {
  A: "Semana A", B: "Semana B", C: "Semana C", D: "Semana D",
};

const weekCycle: WeekMenu["week"][] = ["A", "B", "C", "D"];

const mealOrder = [
  { key: "desayuno", label: "☀️ Desayuno", time: "9:30 AM" },
  { key: "snack1", label: "🍎 Snack AM", time: "10:30 AM" },
  { key: "almuerzo", label: "🍽 Almuerzo", time: "1:00 PM" },
  { key: "snack2", label: "🧀 Snack PM", time: "4:00 PM" },
  { key: "cena", label: "🌙 Cena", time: "7:30 PM" },
] as const;

export default function NutricionPage() {
  const [weekIdx, setWeekIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);

  const currentWeekKey = weekCycle[weekIdx];
  const currentMenu = WEEK_MENUS.find((m) => m.week === currentWeekKey);
  const days = currentMenu?.days || [];
  const currentDay = days[dayIdx];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <SectionHeader title="Plan Nutricional" subtitle="157 g proteína diaria · 4 comidas · Alternar cenas keto" />

      {/* Key rules */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: "💧", label: "Agua", value: "2 L/día" },
          { icon: "🥩", label: "Proteína", value: "157 g/día" },
          { icon: "🍽", label: "Comidas", value: "4 al día" },
          { icon: "🌙", label: "Cenas keto", value: "Alternadas" },
        ].map((r) => (
          <Card key={r.label} className="text-center py-3">
            <p className="text-2xl">{r.icon}</p>
            <p className="text-xs text-muted-foreground mt-1">{r.label}</p>
            <p className="text-sm font-bold mt-0.5">{r.value}</p>
          </Card>
        ))}
      </div>

      {/* Week selector */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Button size="sm" variant="ghost" onClick={() => setWeekIdx((i) => (i - 1 + 4) % 4)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-bold">{weekLabels[currentWeekKey]}</p>
            <p className="text-[10px] text-muted-foreground">Ciclo: A → B → C → D (se repite cada mes)</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setWeekIdx((i) => (i + 1) % 4)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day tabs */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {days.map((d, i) => (
            <button
              key={i}
              onClick={() => setDayIdx(i)}
              className={cn(
                "rounded-lg py-1.5 text-center text-[10px] font-medium transition-all",
                dayIdx === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {d.day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Day meals */}
        {currentDay && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{currentDay.day}</p>
              <Badge variant={currentDay.cenat === "keto" ? "success" : "info"}>
                Cena: {currentDay.cenat === "keto" ? "🥑 Keto" : "🌽 Convencional"}
              </Badge>
            </div>

            {mealOrder.map(({ key, label, time }) => {
              const items = currentDay[key] as string[];
              return (
                <div key={key} className="p-3 rounded-lg bg-secondary/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{label}</p>
                    <span className="text-[10px] text-muted-foreground">{time}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((item, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                        <span className="text-primary">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {key === "cena" && currentDay.cenat === "keto" && (
                    <div className="mt-1 pt-1 border-t border-border/50">
                      <p className="text-[10px] text-accent">✓ Sin carbohidratos – el cuerpo quema grasa mientras duermes</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Protein distribution */}
      <Card>
        <SectionHeader title="Distribución de proteína" subtitle="Objetivo: 157 g/día" />
        <div className="space-y-2">
          {[
            { meal: "Desayuno (9:30)", amount: 35, example: "3 huevos = ~18g + queso = ~17g" },
            { meal: "Snack AM (10:30)", amount: 20, example: "Yogurt griego = ~15g + queso = ~5g" },
            { meal: "Almuerzo (1:00)", amount: 45, example: "Pechuga 150g = ~45g" },
            { meal: "Snack PM (4:00)", amount: 22, example: "Huevo cocido = ~6g + yogurt = ~15g" },
            { meal: "Cena (7:30)", amount: 35, example: "Atún 150g = ~33g" },
          ].map((p) => (
            <div key={p.meal} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50">
              <Beef className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{p.meal}</p>
                <p className="text-[10px] text-muted-foreground truncate">{p.example}</p>
              </div>
              <span className="text-sm font-bold text-orange-400">{p.amount}g</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-between">
          <span className="text-xs text-muted-foreground">Total diario</span>
          <span className="text-sm font-bold text-accent">~157 g</span>
        </div>
      </Card>

      {/* Keto vs Conventional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-accent/20 bg-accent/5">
          <p className="text-xs font-semibold text-accent mb-3">🥑 Cenas Keto (sin carbohidratos)</p>
          <ul className="space-y-1.5">
            {["Atún + Aguacate + Ensalada", "Carne magra + Ensalada verde", "Pollo + Verduras salteadas", "Salmón + Espárragos con aceite"].map((c) => (
              <li key={c} className="text-[11px] flex gap-2"><span className="text-accent">•</span><span>{c}</span></li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-2">El cuerpo quema grasa abdominal durante la noche</p>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold text-primary mb-3">🌽 Cenas Convencionales (con carbohidrato)</p>
          <ul className="space-y-1.5">
            {["Pollo + 1 Arepa + Ensalada", "Pescado + Papa cocida", "Sándwich integral de pollo", "Pollo + Arroz integral + Brócoli"].map((c) => (
              <li key={c} className="text-[11px] flex gap-2"><span className="text-primary">•</span><span>{c}</span></li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-2">Días de mayor entrenamiento o cuando se necesite</p>
        </Card>
      </div>

      {/* Shopping list */}
      <Card>
        <SectionHeader title="Lista de mercado semanal" subtitle="Comprar de una vez para evitar improvisación" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { category: "🥩 Proteínas", items: ["Pollo (1.5 kg)", "Salmón", "Pescado blanco", "Atún (latas)", "Carne magra", "Docena de huevos", "Yogurt griego x4", "Queso bajo grasa"] },
            { category: "🌾 Carbohidratos", items: ["Arroz integral", "Avena", "Quinoa", "Papas", "Pan integral", "Pasta integral", "Arepa (1 paq)"] },
            { category: "🥦 Verduras", items: ["Brócoli", "Espinaca", "Lechuga romana", "Tomate", "Pepino", "Champiñones", "Espárragos", "Cebolla"] },
            { category: "🥑 Grasas buenas", items: ["Aguacate (4-5)", "Aceite de oliva", "Nueces (100g)", "Almendras (100g)", "Mantequilla maní"] },
            { category: "🍎 Frutas", items: ["Manzanas", "Peras", "Arándanos", "Frutos rojos", "Banana", "Mandarina"] },
            { category: "💊 Suplementos", items: ["Proteína whey", "Magnesio glicinato", "Vitamina D3", "Omega-3", "Leche almendras"] },
          ].map((cat) => (
            <div key={cat.category}>
              <p className="text-xs font-semibold mb-2">{cat.category}</p>
              <ul className="space-y-0.5">
                {cat.items.map((item) => (
                  <li key={item} className="text-[10px] text-muted-foreground flex gap-1">
                    <span>·</span><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Paula's protocol box */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <p className="text-xs font-semibold text-yellow-400 mb-3">💡 Protocolo Paula Bedón – Wellness Coach</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { n: "1", t: "Hidratación", d: "2L agua/día. Los jugos son error de código: fructosa pura → triglicéridos. Agua con limón OK." },
            { n: "2", t: "4 comidas con proteína", d: "Evita picos de insulina y pérdida de músculo. La proteína = saciedad prolongada (leptina)." },
            { n: "3", t: "Carbohidratos al mediodía", d: "El cuerpo procesa mejor los carbohidratos con luz solar. En la noche: solo proteína + grasas." },
            { n: "4", t: "Zona 2 en bici/natación", d: "105–122 bpm: el motor usa grasa como combustible. Encima de 123 bpm quema azúcar." },
          ].map((r) => (
            <div key={r.n} className="flex gap-3 p-2.5 rounded-lg bg-background/50">
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {r.n}
              </div>
              <div>
                <p className="text-xs font-medium">{r.t}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.d}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
