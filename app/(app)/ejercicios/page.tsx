"use client";
import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Card, SectionHeader, Badge } from "@/components/ui/card";
import { EXERCISES } from "@/lib/data";
import Image from "next/image";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  core: "Core", strength: "Fuerza", mobility: "Movilidad", stretch: "Estiramiento",
};
const categoryColors: Record<string, string> = {
  core: "warning", strength: "success", mobility: "info", stretch: "default",
};

export default function EjerciciosPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const categories = ["all", "core", "strength", "mobility"] as const;

  const filtered = EXERCISES.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.nameEs.toLowerCase().includes(search.toLowerCase()) ||
      ex.muscles.some((m) => m.toLowerCase().includes(search.toLowerCase()));
    const matchCat = activeCategory === "all" || ex.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <SectionHeader title="Biblioteca de Ejercicios" subtitle="Todos los ejercicios del programa · Seguros para L5-S1" />

      {/* Search + filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ejercicio o músculo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary text-foreground text-sm rounded-lg pl-9 pr-4 py-2.5 border border-border focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {cat === "all" ? "Todos" : categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {filtered.map((ex) => (
          <Card key={ex.id} className="overflow-hidden">
            <button
              className="w-full flex items-center gap-4 text-left"
              onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                <Image src={ex.imageUrl} alt={ex.name} fill className="object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{ex.name}</p>
                  <Badge variant={categoryColors[ex.category] as "warning" | "success" | "info" | "default"}>
                    {categoryLabels[ex.category]}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ex.nameEs}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-primary">{ex.sets} series × {ex.reps ? `${ex.reps} reps` : `${ex.duration}s`}</span>
                  <span className="text-[10px] text-accent">✓ Seguro L5-S1</span>
                </div>
              </div>
              {expanded === ex.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expanded === ex.id && (
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                {/* Full image */}
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <Image src={ex.imageUrl} alt={ex.name} fill className="object-cover" unoptimized />
                </div>

                <p className="text-sm text-muted-foreground">{ex.description}</p>

                {/* Steps */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Instrucciones</p>
                  <ol className="space-y-2">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-xs">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Muscles */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Músculos trabajados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.muscles.map((m) => (
                      <span key={m} className="bg-secondary px-2 py-0.5 rounded-full text-[10px]">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Note */}
                {ex.notes && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-[11px] text-yellow-400">⚠️ {ex.notes}</p>
                  </div>
                )}

                {/* Prescription */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-primary">{ex.sets}</p>
                    <p className="text-[10px] text-muted-foreground">Series</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-accent">{ex.reps ?? `${ex.duration}s`}</p>
                    <p className="text-[10px] text-muted-foreground">{ex.reps ? "Reps" : "Duración"}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-yellow-400">30s</p>
                    <p className="text-[10px] text-muted-foreground">Descanso</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* McGill information */}
      <Card className="border-primary/20 bg-primary/5">
        <p className="text-xs font-semibold text-primary mb-3">🏅 McGill Big 3 – El protocolo de la NASA para columna</p>
        <p className="text-[11px] text-muted-foreground mb-3">
          Creado por Stuart McGill, el científico de columna más reconocido del mundo. 
          Es el mismo protocolo que usan atletas olímpicos y militares para proteger sus discos lumbares.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {["Bird Dog", "Dead Bug", "Side Plank"].map((ex) => (
            <div key={ex} className="bg-primary/10 rounded-lg p-2 text-center">
              <p className="text-xs font-bold text-primary">{ex}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">McGill Big 3</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Hacer los 3 consecutivamente: 6 reps × 3 series con 10 segundos de contracción.
          Ideal antes de nadar como activación pre-piscina.
        </p>
      </Card>
    </div>
  );
}
