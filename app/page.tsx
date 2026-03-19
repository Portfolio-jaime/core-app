import Link from "next/link";
import {
  Activity, Waves, Apple, CheckSquare, TrendingUp, BookOpen,
  Dumbbell, Heart, ArrowRight, Shield, Zap
} from "lucide-react";

const features = [
  { icon: Activity, title: "Dashboard", desc: "Resumen diario, hábitos en tiempo real y gráficos de progreso", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", href: "/dashboard" },
  { icon: Dumbbell, title: "Entrenamiento", desc: "Plan semanal de core, fuerza y natación para tu columna", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", href: "/entrenamiento" },
  { icon: Waves, title: "Natación", desc: "Registro de sesiones, métricas de metros y rutinas terapéuticas", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", href: "/natacion" },
  { icon: Apple, title: "Nutrición", desc: "4 semanas de menús rotativos con estrategia keto nocturna", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", href: "/nutricion" },
  { icon: CheckSquare, title: "Hábitos", desc: "Sistema de puntos diario: 70 pts = arquitectura de alto rendimiento", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", href: "/habitos" },
  { icon: TrendingUp, title: "Progreso", desc: "Registro semanal de peso, cintura, energía y dolor lumbar", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", href: "/progreso" },
  { icon: BookOpen, title: "Ejercicios", desc: "Biblioteca con imágenes, pasos y notas de seguridad L5-S1", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", href: "/ejercicios" },
];

const stats = [
  { value: "12", label: "Semanas de programa" },
  { value: "7", label: "Módulos integrados" },
  { value: "10+", label: "Ejercicios terapéuticos" },
  { value: "4", label: "Menús rotativos" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-sm">HealthOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register" className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium">
              Comenzar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary font-medium mb-8">
            <Shield className="w-3.5 h-3.5" />
            Diseñado para Espondilolistesis L5-S1
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
            Tu sistema
            <span className="block bg-gradient-to-r from-primary via-cyan-400 to-accent bg-clip-text text-transparent">
              personal de
            </span>
            bienestar
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            HealthOS integra entrenamiento, natación, nutrición y seguimiento de hábitos
            en un solo lugar. Programa de 12 semanas diseñado específicamente para tu cuerpo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all hover:scale-105 text-sm">
              Crear mi cuenta <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 border border-border bg-card/50 text-foreground px-8 py-4 rounded-xl font-semibold hover:border-primary/50 transition-all text-sm">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-border/50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-black text-primary mb-1">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Todo lo que necesitas</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Cada módulo trabaja en conjunto para darte una visión completa de tu progreso
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <Link key={f.title} href={f.href} className={`group p-5 rounded-2xl border ${f.bg} hover:scale-[1.02] transition-all`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${f.bg}`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                      {f.title}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-br from-primary/10 via-cyan-500/5 to-accent/10 border border-primary/20">
            <Zap className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">¿Listo para comenzar?</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">
              Crea tu cuenta, configura tu perfil y empieza el programa hoy.
            </p>
            <Link href="/register" className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all hover:scale-105 text-sm">
              Empezar programa <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 px-6 text-center">
        <p className="text-xs text-muted-foreground">HealthOS · Programa personalizado · 12 semanas · L5-S1 safe</p>
      </footer>
    </div>
  );
}
