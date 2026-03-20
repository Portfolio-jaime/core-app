import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "success" | "destructive";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "default", size = "md", children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg",
        variant === "outline" && "border border-border text-foreground hover:bg-secondary",
        variant === "ghost" && "text-muted-foreground hover:text-foreground hover:bg-secondary",
        variant === "success" && "bg-accent text-accent-foreground hover:bg-accent/90",
        variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-9 px-4 text-sm",
        size === "lg" && "h-11 px-6 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
