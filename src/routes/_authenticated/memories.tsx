import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMemoryDashboard } from "@/lib/memories.functions";

export const Route = createFileRoute("/_authenticated/memories")({
  component: MemoriesPage,
  head: () => ({ meta: [{ title: "Minhas Memórias · Meu Barão" }] }),
});

type Pattern = {
  key: string;
  value: string;
  confidence: number;
  evidence_count: number;
  status: "probabilistic" | "reinforced";
};

// Soft, non-clinical labels for identity patterns.
const PATTERN_LABEL: Record<string, string> = {
  attachment_pattern: "Forma de se conectar",
  recurring_themes: "Temas que voltam",
  dominant_emotion_tendency: "Tom emocional recorrente",
};
const VALUE_SOFTEN: Record<string, string> = {
  possible_anxious_attachment_tendency: "tende a buscar proximidade quando algo aperta",
  possible_avoidant_attachment_tendency: "tende a recuar antes de se expor",
  possible_preoccupied_attachment_tendency: "carrega ausências com cuidado",
  possible_secure_attachment_tendency: "tende a se sentir segura ao se abrir",
};

function softLabel(key: string): string {
  return PATTERN_LABEL[key] ?? "Aspecto percebido";
}
function softValue(raw: string): string {
  return VALUE_SOFTEN[raw] ?? raw.replace(/_/g, " ");
}
function humanTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = (Date.now() - Date.parse(iso)) / 1000;
  if (diff < 60) return "agora há pouco";
  if (diff < 3600) return `há ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.round(diff / 3600)}h`;
  const days = Math.round(diff / 86400);
  if (days < 7) return `há ${days}d`;
  if (days < 30) return `há ${Math.round(days / 7)} sem`;
  return `há ${Math.round(days / 30)} meses`;
}

function MemoriesPage() {
  const dashFn = useServerFn(getMemoryDashboard);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["memory-dashboard"],
    queryFn: () => dashFn({ data: undefined as never }),
  });

  const isFree = data?.tier === "free";

  async function eraseAll() {
    if (!confirm("Apagar todas as memórias? Esta ação é definitiva.")) return;
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) return;
    await Promise.all([
      supabase
        .from("user_memory_events" as never)
        .delete()
        .eq("user_id", u.id),
      supabase
        .from("user_memory_summaries" as never)
        .delete()
        .eq("user_id", u.id),
      supabase
        .from("user_identity_memory" as never)
        .delete()
        .eq("user_id", u.id),
    ]);
    qc.invalidateQueries({ queryKey: ["memory-dashboard"] });
  }

  async function removeEvent(id: string) {
    await supabase
      .from("user_memory_events" as never)
      .delete()
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["memory-dashboard"] });
  }

  const identityProfile = data?.identity?.profile as
    | { patterns?: Pattern[]; last_refreshed_at?: string }
    | undefined;
  const patterns = identityProfile?.patterns ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0606] to-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link
          to="/app"
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
        >
          ← voltar
        </Link>
        <Link to="/" className="serif text-xl gold-text">
          Meu Barão
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground mt-20">um instante…</p>
        ) : isFree ? (
          <FreeMemoryLockScreen />
        ) : (
          <>
            <div className="text-center mb-10">
              <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60">
                O que percebo de você
              </p>
              <h1 className="serif text-3xl md:text-4xl mt-3 gold-text italic">Minhas Memórias</h1>
              <p className="serif italic text-sm text-muted-foreground mt-4 max-w-lg mx-auto leading-relaxed">
                Nada aqui é diagnóstico. São apenas sinais que aparecem quando a gente conversa —
                sutis, mutáveis, seus.
              </p>
            </div>

            {/* Padrões percebidos — probabilistic identity */}
            {patterns.length > 0 && (
              <section className="mb-8">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
                  Padrões percebidos
                </p>
                <div className="grid gap-3">
                  {patterns.map((p) => (
                    <PatternCard key={p.key} pattern={p} />
                  ))}
                </div>
                {identityProfile?.last_refreshed_at && (
                  <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50">
                    Atualizado {humanTime(identityProfile.last_refreshed_at)}
                  </p>
                )}
              </section>
            )}

            {/* Memória profunda — summaries */}
            {data && data.summaries.length > 0 && (
              <section className="mb-8">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
                  Memória profunda
                </p>
                <div className="space-y-2">
                  {data.summaries.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-[color-mix(in_oklab,var(--gold)_18%,transparent)] bg-black/40 px-4 py-3"
                    >
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]/85">
                        {s.theme}
                      </p>
                      <p className="serif text-sm mt-1 text-foreground/85 leading-relaxed">
                        {s.summary}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                        <span>{s.source_event_count ?? 0} sinais</span>
                        <span>·</span>
                        <span>reforçado {humanTime(s.last_reinforced_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sinais recentes — events */}
            <section>
              <div className="flex items-end justify-between mb-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
                  Sinais observados nas conversas
                </p>
                {data && data.events.length > 0 && (
                  <button
                    onClick={eraseAll}
                    className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-destructive"
                  >
                    apagar tudo
                  </button>
                )}
              </div>
              {data && data.events.length === 0 ? (
                <div className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_15%,transparent)] bg-black/40 px-6 py-10 text-center">
                  <p className="serif italic text-sm text-muted-foreground">
                    Ainda estou te conhecendo. Os sinais aparecem aos poucos, quando algo importa.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(data?.events ?? []).map((m) => (
                    <li
                      key={m.id}
                      className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_12%,transparent)] bg-black/40 px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/65">
                            {m.category}
                            {m.emotion ? (
                              <span className="ml-2 text-[var(--gold)]/75">· {m.emotion}</span>
                            ) : null}
                          </p>
                          <p className="serif text-sm mt-2 text-foreground/85 leading-relaxed">
                            {m.content}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <ConfidenceBar value={Number(m.decay_score ?? 0)} />
                            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                              {humanTime(m.last_reinforced_at)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeEvent(m.id)}
                          className="shrink-0 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-destructive"
                        >
                          apagar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  const isReinforced = pattern.status === "reinforced";
  return (
    <div className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_22%,transparent)] bg-gradient-to-b from-black/60 to-black/30 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            {softLabel(pattern.key)}
          </p>
          <p className="serif italic text-sm md:text-base mt-2 text-foreground/90 leading-relaxed">
            {isReinforced ? "tende a " : "talvez "}
            <span className="text-[var(--gold)]/95">{softValue(pattern.value)}</span>
          </p>
        </div>
        <span
          className={
            "shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] " +
            (isReinforced
              ? "border border-[var(--gold)]/40 text-[var(--gold)]/90"
              : "border border-muted-foreground/30 text-muted-foreground/70")
          }
        >
          {isReinforced ? "recorrente" : "sutil"}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ConfidenceBar value={pattern.confidence} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
          {pattern.evidence_count} sinais
        </span>
      </div>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(4, Math.min(100, Math.round(value * 100)));
  return (
    <div className="h-[3px] flex-1 rounded-full bg-muted-foreground/15 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[color-mix(in_oklab,var(--gold)_30%,transparent)] to-[var(--gold)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function FreeMemoryLockScreen() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-12 mx-auto h-72 w-72 rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--gold) 55%, transparent), transparent 70%)",
        }}
      />
      <div className="relative text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60">
          Recurso premium
        </p>
        <h1 className="serif text-3xl md:text-4xl mt-3 gold-text italic">A memória do Barão</h1>
        <p className="serif italic text-sm md:text-base text-muted-foreground mt-5 max-w-xl mx-auto leading-relaxed">
          Quando a memória emocional é ativada, o Barão passa a perceber padrões, lembrar do que
          importa, e continuar de onde parou — sem você ter que se explicar de novo.
        </p>
      </div>

      <div className="relative mt-12 mx-auto max-w-xl">
        <div className="rounded-3xl border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-gradient-to-b from-black/70 to-black/40 px-7 py-9 shadow-[0_30px_120px_-40px_color-mix(in_oklab,var(--gold)_55%,transparent)]">
          <div className="flex items-center justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--gold)_60%,transparent)]"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--gold) 35%, transparent), transparent 70%)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                className="h-7 w-7 gold-text"
                aria-hidden
              >
                <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
                <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
              </svg>
            </div>
          </div>

          <ul className="mt-7 space-y-3 text-sm text-foreground/85 serif">
            <li className="flex gap-3">
              <span className="gold-text">·</span> Percebe padrões sutis sem te rotular.
            </li>
            <li className="flex gap-3">
              <span className="gold-text">·</span> Lembra do que volta sempre — e do que muda.
            </li>
            <li className="flex gap-3">
              <span className="gold-text">·</span> Te encontra onde você está, não onde já esteve.
            </li>
            <li className="flex gap-3">
              <span className="gold-text">·</span> Continua de onde parou — sem se explicar de novo.
            </li>
          </ul>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/plans"
              className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--gold)_70%,transparent)] bg-gradient-to-b from-[color-mix(in_oklab,var(--gold)_25%,transparent)] to-[color-mix(in_oklab,var(--gold)_8%,transparent)] px-7 py-3 text-[11px] uppercase tracking-[0.3em] gold-text hover:from-[color-mix(in_oklab,var(--gold)_35%,transparent)] transition"
            >
              Desbloquear memória emocional
            </Link>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
              No plano grátis, cada conversa começa do zero.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
