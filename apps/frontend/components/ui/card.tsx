import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function Card({ className, children, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-all",
        onClick && "cursor-pointer hover:border-primary/40",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("font-semibold text-sm text-foreground", className)}>{children}</h3>;
}

export function CardMeta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs text-muted-foreground mt-0.5", className)}>{children}</p>;
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "primary" | "accent" | "destructive";
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, color = "primary", className, showLabel }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color === "primary" && "bg-primary",
            color === "accent" && "bg-accent",
            color === "destructive" && "bg-destructive"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{value}</span>
          <span className="text-[10px] text-muted-foreground">{max}</span>
        </div>
      )}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
        variant === "default" && "bg-secondary text-foreground",
        variant === "success" && "bg-accent/20 text-accent",
        variant === "warning" && "bg-yellow-500/20 text-yellow-400",
        variant === "danger" && "bg-destructive/20 text-destructive",
        variant === "info" && "bg-primary/20 text-primary",
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "primary" | "accent" | "warning";
}

export function StatCard({ label, value, unit, icon, color = "primary" }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon && (
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              color === "primary" && "bg-primary/15 text-primary",
              color === "accent" && "bg-accent/15 text-accent",
              color === "warning" && "bg-yellow-500/15 text-yellow-400"
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
      </div>
    </Card>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}
