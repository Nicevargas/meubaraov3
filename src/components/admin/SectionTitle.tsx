import type { ReactNode } from "react";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionTitle({ eyebrow, title, description, action }: SectionTitleProps) {
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--gold)]/80">
              {eyebrow}
            </p>
          )}
          <h1 className="serif mt-1 text-3xl md:text-4xl gold-text">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="gold-line mt-4 opacity-50" />
    </header>
  );
}
