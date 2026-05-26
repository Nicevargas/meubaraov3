import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  estimated?: boolean;
  tone?: "default" | "gold" | "warn" | "danger";
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  estimated,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-xl p-5 transition-all hover:translate-y-[-1px]",
        tone === "gold" && "ring-1 ring-[var(--gold)]/30",
        tone === "warn" && "ring-1 ring-[var(--copper)]/40",
        tone === "danger" && "ring-1 ring-destructive/40",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px gold-line opacity-60" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        {estimated && (
          <span className="rounded-full border border-[var(--copper)]/40 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--copper)]">
            estimado
          </span>
        )}
      </div>
      <p className={cn("serif mt-3 text-3xl leading-none", tone === "gold" && "gold-text")}>
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
