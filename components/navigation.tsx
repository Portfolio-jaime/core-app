"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Waves,
  Apple,
  CheckSquare,
  TrendingUp,
  BookOpen,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/entrenamiento", icon: Dumbbell, label: "Entrenamiento" },
  { href: "/natacion", icon: Waves, label: "Natación" },
  { href: "/nutricion", icon: Apple, label: "Nutrición" },
  { href: "/habitos", icon: CheckSquare, label: "Hábitos" },
  { href: "/progreso", icon: TrendingUp, label: "Progreso" },
  { href: "/ejercicios", icon: BookOpen, label: "Ejercicios" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar – desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col z-50 border-r border-border bg-card/50 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">HealthOS</p>
            <p className="text-[10px] text-muted-foreground">Sistema de Bienestar</p>
          </div>
        </div>

        {/* Week badge */}
        <div className="px-4 py-3">
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
            <p className="text-[10px] text-primary font-medium">PROGRAMA 12 SEMANAS</p>
            <p className="text-xs text-muted-foreground mt-0.5">Inicio: 16 Mar 2026</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground font-medium shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
              JH
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Jaime Henao</p>
              <p className="text-[10px] text-muted-foreground">45 años · 1.80 m · 110 kg</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Bottom bar – mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="grid grid-cols-7 h-16">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[9px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden xs:block">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
