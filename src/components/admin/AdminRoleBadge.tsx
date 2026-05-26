import { ShieldCheck, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/admin.functions";

const LABEL: Record<string, string> = {
  super_admin: "SUPER ADMIN",
  admin: "ADMIN",
  moderator: "MODERATOR",
  support: "SUPORTE",
  finance: "FINANCE",
  analytics: "ANALYTICS",
  user: "USER",
};

export function AdminRoleBadge({
  role,
  size = "sm",
  className,
}: {
  role: AdminRole | "user";
  size?: "xs" | "sm";
  className?: string;
}) {
  const isSuper = role === "super_admin";
  const isAdmin = role === "admin";
  const Icon = isSuper ? ShieldCheck : isAdmin ? Shield : User;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 uppercase tracking-[0.22em]",
        size === "xs" ? "text-[9px]" : "text-[10px]",
        isSuper && "border-[var(--gold)]/55 bg-[var(--gold)]/10 text-[var(--gold)]",
        isAdmin && "border-zinc-400/40 bg-zinc-400/5 text-zinc-200",
        !isSuper && !isAdmin && "border-border/40 text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {LABEL[role] ?? role.toUpperCase()}
    </span>
  );
}
