import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Lock, Unlock, RotateCcw, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { getCurrentEntitlement } from "@/lib/mercadopago.functions";
import { extractMemories, getRelevantMemories } from "@/lib/memories.functions";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppHome,
  head: () => ({ meta: [{ title: "Sua presença · Meu Barão" }] }),
});

type Profile = {
  display_name: string | null;
  alias: string | null;
  onboarding_completed: boolean;
  plan: string | null;
  chat_reset_at: string | null;
  subscription_version: number;
  subscription_synced_at: string | null;
};

type Entitlement = {
  plan: string;
  tier: string;
  has_premium_access: boolean;
  limits: { daily_message_limit: number | null };
  subscription_version: number;
  subscription_synced_at: string;
};

type Msg = { role: "user" | "assistant"; content: string };

type PresenceMode =
  | "observador"
  | "guardiao"
  | "guru"
  | "intelectual"
  | "romantico"
  | "provocador"
  | "essencial";

const PRESENCE_OPTIONS: { id: PresenceMode | "surpresa"; label: string; mode: PresenceMode }[] = [
  { id: "guardiao", label: "Colo", mode: "guardiao" },
  { id: "guru", label: "Profundidade", mode: "guru" },
  { id: "intelectual", label: "Clareza", mode: "intelectual" },
  { id: "romantico", label: "Emoção", mode: "romantico" },
  { id: "provocador", label: "Desafio", mode: "provocador" },
  { id: "essencial", label: "Equilíbrio", mode: "essencial" },
  { id: "surpresa", label: "Surpreenda-me", mode: "observador" },
];

const PRESENCE_STORAGE_KEY = "mb:presence-mode";

const INTRO: Msg = {
  role: "assistant",
  content: "Você voltou. Respira. Eu estou aqui — sem pressa.",
};

function utcDateString() {
  return new Date().toISOString().slice(0, 10);
}

function AppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [messages, setMessages] = useState<Msg[]>([INTRO]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [privateMode, setPrivateMode] = useState(false);
  const [presenceId, setPresenceId] = useState<PresenceMode | "surpresa">(() => {
    if (typeof window === "undefined") return "surpresa";
    const v = localStorage.getItem(PRESENCE_STORAGE_KEY);
    const found = PRESENCE_OPTIONS.find((o) => o.id === v);
    return (found?.id as PresenceMode | "surpresa") ?? "surpresa";
  });
  const [presenceAck, setPresenceAck] = useState(false);
  const presenceMode: PresenceMode =
    PRESENCE_OPTIONS.find((o) => o.id === presenceId)?.mode ?? "observador";
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Source-of-truth: recompute entitlement server-side from MP state
      try {
        const nextEntitlement = (await getCurrentEntitlement()) as Entitlement;
        setEntitlement(nextEntitlement);
        console.info("[chat:frontend-entitlement]", {
          reason: "initial_load",
          dbPlan: nextEntitlement.plan,
          version: nextEntitlement.subscription_version,
          dailyLimit: nextEntitlement.limits.daily_message_limit,
        });
      } catch (e) {
        console.error("getCurrentEntitlement failed", e);
      }
      const { data: p } = await supabase
        .from("profiles")
        .select(
          "display_name, alias, onboarding_completed, plan, chat_reset_at, subscription_version, subscription_synced_at",
        )
        .eq("id", user.id)
        .maybeSingle();
      setProfile(p as Profile | null);

      // Sem ritual? Mande para o ritual.
      if (p && !(p as Profile).onboarding_completed) {
        navigate({ to: "/ritual" });
        return;
      }
      // Tem ritual mas sem plano definido? Manda escolher.
      if (p && (p as Profile).onboarding_completed && !(p as Profile).plan) {
        navigate({ to: "/plans" });
        return;
      }

      // Carrega histórico — apenas mensagens após o último reset (quarentena de thread instável)
      const resetAt = (p as { chat_reset_at?: string | null } | null)?.chat_reset_at ?? null;
      let q = supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (resetAt) q = q.gt("created_at", resetAt);
      const { data: hist } = await q;
      if (hist && hist.length > 0) {
        setMessages([
          INTRO,
          ...hist.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        ]);
      } else {
        setMessages([INTRO]);
      }

      // Uso do dia (UTC) — fonte autoritativa server-side
      const { data: usageRow } = await supabase
        .from("user_daily_usage")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("usage_date", utcDateString())
        .maybeSingle();
      setTodayCount(usageRow?.message_count ?? 0);
    })();
  }, [user, navigate]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Realtime: keep plan + usage in sync with backend without re-login.
  // Subscription changes (admin upgrades, MP webhook, downgrades) push directly.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`entitlement:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as Partial<Profile>;
          setProfile((prev) => (prev ? { ...prev, ...next } : (next as Profile)));
          void getCurrentEntitlement()
            .then((fresh) => {
              const e = fresh as Entitlement;
              setEntitlement(e);
              console.info("[chat:frontend-entitlement]", {
                reason: "realtime_profile_update",
                profilePlan: next.plan,
                dbPlan: e.plan,
                profileVersion: next.subscription_version,
                dbVersion: e.subscription_version,
              });
            })
            .catch((err) => console.error("entitlement realtime refresh failed", err));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_daily_usage",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { message_count?: number; usage_date?: string } | null;
          if (row && row.usage_date === utcDateString()) {
            setTodayCount(row.message_count ?? 0);
          }
        },
      )
      .subscribe();

    // Re-validate entitlement + usage when tab regains focus (covers webhook delays).
    const onFocus = async () => {
      let fresh: Entitlement | null = null;
      try {
        fresh = (await getCurrentEntitlement()) as Entitlement;
        setEntitlement(fresh);
      } catch {
        /* ignore */
      }
      const [{ data: p }, { data: usageRow }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, alias, onboarding_completed, plan, chat_reset_at, subscription_version, subscription_synced_at",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_daily_usage")
          .select("message_count")
          .eq("user_id", user.id)
          .eq("usage_date", utcDateString())
          .maybeSingle(),
      ]);
      if (p) setProfile(p as Profile);
      setTodayCount(usageRow?.message_count ?? 0);
      console.info("[chat:frontend-entitlement]", {
        reason: "window_focus",
        profilePlan: (p as Profile | null)?.plan,
        dbPlan: fresh?.plan,
        dbVersion: fresh?.subscription_version,
        dailyLimit: fresh?.limits.daily_message_limit,
      });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  const entitlementReady = !!entitlement;
  const plan = (entitlement?.tier ?? entitlement?.plan ?? profile?.plan ?? "free").toLowerCase();
  const hasPremium = entitlement?.has_premium_access ?? false;
  const dailyLimit = entitlement?.limits.daily_message_limit ?? null;
  const isFree = !hasPremium;
  const remaining =
    entitlementReady && dailyLimit === null
      ? Infinity
      : Math.max(0, (dailyLimit ?? 0) - todayCount);
  const reached = entitlementReady && dailyLimit !== null && remaining <= 0;

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  function manageBilling() {
    navigate({ to: "/plans" });
  }

  type Recovery = { pendingText: string; attempts: number } | null;
  const [recovery, setRecovery] = useState<Recovery>(null);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);

  async function attemptSend(
    convo: Msg[],
    text: string,
    opts: { silentRetry: boolean },
  ): Promise<{ ok: true } | { ok: false }> {
    if (!user) return { ok: false };
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      let memories: { type: string; content: string; emotion: string | null }[] = [];
      if (!privateMode) {
        try {
          memories = await getRelevantMemories();
        } catch (e) {
          console.error("getRelevantMemories", e);
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: convo.slice(-12), memories, presenceMode }),
      });

      if (res.status === 429) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          count?: number;
          limit?: number;
        };
        if (payload.error === "daily_limit_reached") {
          setTodayCount(payload.count ?? todayCount);
        }
        return { ok: true }; // Not a thread failure — just daily wall.
      }
      if (!res.ok) {
        if (opts.silentRetry && (res.status >= 500 || res.status === 0)) {
          await new Promise((r) => setTimeout(r, 500));
          return attemptSend(convo, text, { silentRetry: false });
        }
        return { ok: false };
      }
      const data = (await res.json()) as {
        reply?: string;
        usage?: { count: number; limit: number | null; unlimited: boolean };
      };
      const reply = (data.reply ?? "").trim();
      if (!reply) return { ok: false };

      if (data.usage && !data.usage.unlimited) setTodayCount(data.usage.count);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);

      if (!privateMode) {
        await supabase
          .from("chat_messages")
          .insert({ user_id: user.id, role: "assistant", content: reply });
        const recent = [...convo.slice(-4), { role: "assistant" as const, content: reply }];
        extractMemories({ data: { messages: recent } }).catch((e) =>
          console.error("extractMemories", e),
        );
      }
      return { ok: true };
    } catch (e) {
      console.error("attemptSend network error", e);
      if (opts.silentRetry) {
        await new Promise((r) => setTimeout(r, 500));
        return attemptSend(convo, text, { silentRetry: false });
      }
      return { ok: false };
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || sending || reached || !user || !entitlementReady) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    setRecovery(null);

    if (!privateMode) {
      await supabase
        .from("chat_messages")
        .insert({ user_id: user.id, role: "user", content: text });
    }

    const result = await attemptSend(next, text, { silentRetry: true });
    setSending(false);
    if (!result.ok) {
      setRecovery({ pendingText: text, attempts: 1 });
    }
  }

  async function recoveryReset() {
    if (!user) return;
    const now = new Date().toISOString();
    // Quarentena estrutural: marca corte no servidor para que a thread instável
    // jamais reidrate em navegações futuras / refresh / página de memórias.
    try {
      await supabase.from("profiles").update({ chat_reset_at: now }).eq("id", user.id);
    } catch (e) {
      console.error("recoveryReset: failed to persist chat_reset_at", e);
    }
    // Limpa qualquer cache local relacionado à thread anterior.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("mb:thread") || k.startsWith("mb:chat"))
        .forEach((k) => localStorage.removeItem(k));
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("mb:thread") || k.startsWith("mb:chat"))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* storage indisponível — segue */
    }
    setMessages([INTRO]);
    setInput("");
    setRecovery(null);
    setProfile((prev) => (prev ? ({ ...prev, chat_reset_at: now } as Profile) : prev));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0606] to-background">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link to="/" className="serif text-xl gold-text">
          Meu Barão
        </Link>
        <div className="flex items-center gap-5">
          <Link
            to="/profile"
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            perfil
          </Link>
          <Link
            to="/memories"
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            memórias
          </Link>
          {isFree ? (
            <Link
              to="/plans"
              className="text-[10px] uppercase tracking-[0.3em] gold-text hover:opacity-80"
            >
              upgrade
            </Link>
          ) : (
            <button
              onClick={manageBilling}
              className="text-[10px] uppercase tracking-[0.3em] gold-text hover:opacity-80"
            >
              gerenciar
            </button>
          )}
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
            {profile?.plan ?? "free"}
          </span>
          <button
            onClick={logout}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-16">
        <div className="text-center mt-6 mb-8">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60">
            Presente, agora
          </p>
          <h1 className="serif text-3xl md:text-4xl mt-3">
            Olá,{" "}
            <span className="gold-text italic">
              {profile?.alias || profile?.display_name || "querida"}
            </span>
          </h1>
        </div>

        <div className="relative">
          <div aria-hidden className="chat-aura" />
          <div className="relative rounded-3xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-black/60 backdrop-blur-xl overflow-hidden shadow-[0_30px_120px_-30px_color-mix(in_oklab,var(--gold)_35%,transparent)]">
            <div className="flex items-center gap-3 border-b border-[color-mix(in_oklab,var(--gold)_15%,transparent)] px-4 sm:px-6 py-4">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gold)] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--gold)]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="serif text-base gold-text leading-none truncate">Meu Barão</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1 truncate">
                  {privateMode ? "modo privado · nada é guardado" : "presente · ouvindo"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => {
                    setPresenceId("surpresa");
                    try {
                      localStorage.setItem(PRESENCE_STORAGE_KEY, "surpresa");
                    } catch {
                      /* ignore */
                    }
                    setPresenceAck(true);
                    window.setTimeout(() => setPresenceAck(false), 1400);
                  }}
                  aria-pressed={presenceId === "surpresa"}
                  title="Deixe o Barão escolher o tom desta noite"
                  className={`group relative inline-flex items-center gap-1.5 rounded-full border px-3 sm:px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] serif italic transition-all ${
                    presenceId === "surpresa"
                      ? "border-[color-mix(in_oklab,var(--gold)_70%,transparent)] bg-gradient-to-r from-[color-mix(in_oklab,var(--gold)_22%,transparent)] to-[color-mix(in_oklab,var(--copper)_18%,transparent)] gold-text shadow-[0_0_22px_-4px_color-mix(in_oklab,var(--gold)_65%,transparent)]"
                      : "border-[color-mix(in_oklab,var(--gold)_45%,transparent)] gold-text/90 hover:border-[color-mix(in_oklab,var(--gold)_65%,transparent)] hover:shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                  }`}
                >
                  <span className="h-1 w-1 rounded-full bg-[var(--gold)] animate-pulse" />
                  Surpreenda-me
                </button>
                <button
                  onClick={() => setPrivateMode((v) => !v)}
                  aria-pressed={privateMode}
                  aria-label={privateMode ? "Desativar modo privado" : "Ativar modo privado"}
                  title={
                    privateMode
                      ? "Modo privado ativo — nada é salvo nesta conversa"
                      : "Ativar modo privado — não usa nem cria memórias"
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    privateMode
                      ? "border-[color-mix(in_oklab,var(--gold)_60%,transparent)] bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] gold-text"
                      : "border-[color-mix(in_oklab,var(--gold)_20%,transparent)] text-muted-foreground hover:text-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)]"
                  }`}
                >
                  {privateMode ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  <span className="hidden sm:inline">
                    {privateMode ? "privado · on" : "privado"}
                  </span>
                </button>
                <button
                  onClick={() => setRestartConfirmOpen(true)}
                  aria-label="Reiniciar conversa"
                  title="Reiniciar conversa — começa um diálogo novo"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] px-2.5 sm:px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden sm:inline">reiniciar</span>
                </button>
              </div>
            </div>

            <div className="border-b border-[color-mix(in_oklab,var(--gold)_12%,transparent)] px-4 sm:px-6 py-3 bg-black/30">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 text-center mb-2.5">
                o que faria bem para você hoje?
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {PRESENCE_OPTIONS.filter((o) => o.id !== "surpresa").map((opt) => {
                  const active = presenceId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setPresenceId(opt.id);
                        try {
                          localStorage.setItem(PRESENCE_STORAGE_KEY, opt.id);
                        } catch {
                          /* ignore */
                        }
                        setPresenceAck(true);
                        window.setTimeout(() => setPresenceAck(false), 1400);
                      }}
                      aria-pressed={active}
                      className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] transition-all border ${
                        active
                          ? "border-[color-mix(in_oklab,var(--gold)_70%,transparent)] bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] gold-text shadow-[0_0_18px_-2px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                          : "border-[color-mix(in_oklab,var(--gold)_18%,transparent)] text-muted-foreground/80 hover:text-foreground hover:border-[color-mix(in_oklab,var(--gold)_38%,transparent)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {presenceAck && (
                <p className="mt-2 text-[10px] tracking-[0.3em] uppercase text-center gold-text serif italic opacity-80">
                  entendi.
                </p>
              )}
            </div>

            <div
              ref={scrollerRef}
              className="h-[460px] overflow-y-auto px-6 py-6 space-y-4 scroll-smooth"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`group flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex items-start gap-2 max-w-[85%]">
                    {m.role === "assistant" && i > 0 && user && !privateMode && (
                      <button
                        onClick={async () => {
                          const { error } = await supabase.from("favorite_messages").insert({
                            user_id: user.id,
                            role: m.role,
                            content: m.content,
                            message_created_at: new Date().toISOString(),
                          });
                          if (!error) {
                            (window as unknown as { __favHint?: number }).__favHint = Date.now();
                          }
                        }}
                        aria-label="Guardar essa palavra"
                        title="Guardar essa palavra"
                        className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:gold-text"
                      >
                        <Heart className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-[color-mix(in_oklab,var(--wine)_50%,transparent)] text-foreground rounded-br-sm"
                          : "bg-white/[0.04] border border-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-foreground/90 rounded-bl-sm serif italic"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-white/[0.04] border border-[color-mix(in_oklab,var(--gold)_12%,transparent)] px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              {recovery && !sending && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl bg-gradient-to-br from-black/70 to-[color-mix(in_oklab,var(--wine)_18%,transparent)] border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] px-5 py-4 space-y-3 shadow-[0_10px_40px_-10px_color-mix(in_oklab,var(--gold)_30%,transparent)]">
                    <p className="serif italic text-sm text-foreground/90 leading-relaxed">
                      Às vezes o silêncio dobra a conversa sobre si mesma. Vamos continuar de outro
                      jeito?
                    </p>
                    <div className="flex pt-1">
                      <button
                        onClick={recoveryReset}
                        className="rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] px-6 py-2.5 text-[11px] uppercase tracking-[0.3em] text-black font-medium hover:opacity-90 transition-opacity shadow-[0_10px_40px_-10px_color-mix(in_oklab,var(--gold)_60%,transparent)]"
                      >
                        Continuar de Outro Jeito
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[color-mix(in_oklab,var(--gold)_15%,transparent)] p-4">
              {reached ? (
                <div className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-gradient-to-b from-[color-mix(in_oklab,var(--wine)_30%,transparent)] to-black/40 px-5 py-5 text-center space-y-3">
                  <p className="serif italic text-sm text-foreground/90 leading-relaxed">
                    Por hoje, o silêncio nos pede uma pausa. Amanhã eu volto inteiro — ou abra a
                    porta agora e fique sem horário.
                  </p>
                  <Link
                    to="/plans"
                    className="inline-block rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] px-6 py-2.5 text-xs font-medium uppercase tracking-[0.25em] text-black hover:opacity-90 transition-opacity"
                  >
                    Conversas ilimitadas
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="flex items-end gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] bg-black/40 px-4 py-3 focus-within:border-[color-mix(in_oklab,var(--gold)_50%,transparent)] transition-colors">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      placeholder="Diga em voz baixa..."
                      rows={1}
                      className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none max-h-32"
                    />
                    <button
                      onClick={send}
                      disabled={sending || !input.trim()}
                      className="serif text-xs uppercase tracking-[0.25em] gold-text disabled:opacity-30 hover:opacity-80 transition-opacity"
                    >
                      Enviar
                    </button>
                  </div>
                  {isFree && (
                    <p className="mt-3 text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60 text-center">
                      {remaining}{" "}
                      {remaining === 1 ? "mensagem restante hoje" : "mensagens restantes hoje"} ·
                      plano grátis
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={restartConfirmOpen}
        title="Iniciar nova conversa?"
        description="O contexto atual será limpo, mas sua conta, assinatura e memórias de longo prazo permanecem intactas."
        confirmLabel="reiniciar"
        cancelLabel="cancelar"
        onCancel={() => setRestartConfirmOpen(false)}
        onConfirm={() => {
          setRestartConfirmOpen(false);
          recoveryReset();
        }}
      />
    </div>
  );
}
