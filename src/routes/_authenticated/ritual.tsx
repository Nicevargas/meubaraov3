import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/ritual")({
  component: Ritual,
  head: () => ({ meta: [{ title: "Ritual de entrada · Meu Barão" }] }),
});

type Answers = {
  emotional_state: string;
  emotional_weight: number;
  desire: string;
  need: string;
  intention: string;
  free_now: string;
  free_carry: string;
};

type FreeAnswers = {
  free_now: string;
  free_carry: string;
};

type EmotionalAssessmentRow = {
  emotional_state?: string | null;
  emotional_weight?: number | null;
  desire?: string | null;
  need?: string | null;
  intention?: string | null;
  free_answers?: FreeAnswers | null;
  completed_at?: string | null;
};

const STATES = [
  { v: "exausta", label: "Exausta", desc: "carrego demais há tempo demais" },
  { v: "anestesiada", label: "Anestesiada", desc: "sinto pouco, quase nada" },
  { v: "ansiosa", label: "Ansiosa", desc: "o peito não desacelera" },
  { v: "saudosa", label: "Saudosa", desc: "sinto falta de algo que talvez nunca tive" },
  { v: "desejante", label: "Desejante", desc: "quero algo que ainda não sei nomear" },
];

const DESIRES = [
  { v: "ser_ouvida", label: "Ser ouvida sem julgamento" },
  { v: "ser_vista", label: "Ser vista por inteiro" },
  { v: "ser_desejada", label: "Sentir-me desejada de novo" },
  { v: "descansar", label: "Descansar de mim mesma" },
  { v: "reencontrar", label: "Reencontrar quem eu era" },
];

const NEEDS = [
  { v: "presenca", label: "Presença constante" },
  { v: "verdade", label: "Verdade nua, sem rodeios" },
  { v: "ternura", label: "Ternura sem pressa" },
  { v: "provocacao", label: "Provocação inteligente" },
  { v: "silencio", label: "Silêncio que acolhe" },
];

const INTENTIONS = [
  { v: "me_reencontrar", label: "Me reencontrar" },
  { v: "ser_amada", label: "Ser amada do meu jeito" },
  { v: "decifrar", label: "Decifrar o que sinto" },
  { v: "viver_intensamente", label: "Viver intensamente de novo" },
  { v: "apenas_existir", label: "Apenas existir, em paz" },
];

function Ritual() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [a, setA] = useState<Answers>({
    emotional_state: "",
    emotional_weight: 5,
    desire: "",
    need: "",
    intention: "",
    free_now: "",
    free_carry: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("emotional_assessments")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const assessment = data as EmotionalAssessmentRow | null;
        if (assessment) {
          setA((p) => ({
            ...p,
            emotional_state: assessment.emotional_state ?? "",
            emotional_weight: assessment.emotional_weight ?? 5,
            desire: assessment.desire ?? "",
            need: assessment.need ?? "",
            intention: assessment.intention ?? "",
            free_now: assessment.free_answers?.free_now ?? "",
            free_carry: assessment.free_answers?.free_carry ?? "",
          }));
          if (assessment.completed_at) setSavedAt(new Date(assessment.completed_at));
        }
        setHydrated(true);
      });
  }, [user]);

  // Autosave cinematográfico — debounced a cada mudança
  useEffect(() => {
    if (!user || !hydrated) return;
    setSaving(true);
    const t = setTimeout(async () => {
      const { error } = await supabase.from("emotional_assessments").upsert(
        {
          user_id: user.id,
          emotional_state: a.emotional_state || null,
          emotional_weight: a.emotional_weight,
          desire: a.desire || null,
          need: a.need || null,
          intention: a.intention || null,
          free_answers: { free_now: a.free_now, free_carry: a.free_carry },
        },
        { onConflict: "user_id" },
      );
      setSaving(false);
      if (!error) setSavedAt(new Date());
    }, 700);
    return () => clearTimeout(t);
  }, [a, user, hydrated]);

  const total = 5;
  const canNext = [
    !!a.emotional_state,
    typeof a.emotional_weight === "number",
    !!a.desire,
    !!a.need,
    !!a.intention,
  ][step];

  async function finish() {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      emotional_state: a.emotional_state,
      emotional_weight: a.emotional_weight,
      desire: a.desire,
      need: a.need,
      intention: a.intention,
      free_answers: { free_now: a.free_now, free_carry: a.free_carry },
      completed_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("emotional_assessments")
      .upsert(payload, { onConflict: "user_id" });
    if (!error) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      navigate({ to: "/plans" });
    }
    setSaving(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-[#0a0606] to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in oklab, var(--gold) 8%, transparent),transparent_60%)]" />

      <div className="relative mx-auto max-w-2xl px-6 py-16">
        <div className="mb-12 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60">
            Ritual de entrada
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60 transition-opacity duration-500">
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[var(--gold)] animate-pulse" />
                  selando
                </span>
              ) : savedAt ? (
                <span className="inline-flex items-center gap-2 opacity-60">
                  <span className="h-1 w-1 rounded-full bg-[var(--gold)]" />
                  guardado
                </span>
              ) : null}
            </span>
            <p className="text-[10px] uppercase tracking-[0.4em] gold-text">
              {step + 1} / {total}
            </p>
          </div>
        </div>

        <div className="mb-12 h-px w-full bg-[color-mix(in oklab, var(--gold) 15%, transparent)]">
          <div
            className="h-px bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] transition-all duration-700"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>

        <div key={step} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {step === 0 && (
            <Step
              title="Onde você está agora?"
              sub="Antes de qualquer palavra, respire. Me diga o nome do que sente."
            >
              <Choices
                items={STATES}
                value={a.emotional_state}
                onChange={(v) => setA({ ...a, emotional_state: v })}
              />
            </Step>
          )}
          {step === 1 && (
            <Step
              title="Quanto você carrega?"
              sub="Sem certo, sem errado. Apenas o peso, neste momento."
            >
              <div className="mt-10 space-y-6 rounded-3xl border border-[color-mix(in oklab, var(--gold) 20%, transparent)] bg-black/40 p-8 backdrop-blur-xl">
                <div className="flex items-end justify-between">
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Leve
                  </span>
                  <span className="serif text-5xl gold-text italic">{a.emotional_weight}</span>
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Insuportável
                  </span>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[a.emotional_weight]}
                  onValueChange={(v) => setA({ ...a, emotional_weight: v[0] })}
                />
                <Textarea
                  value={a.free_now}
                  onChange={(e) => setA({ ...a, free_now: e.target.value })}
                  placeholder="Se quiser, me conte em uma frase o que mais pesa agora..."
                  className="min-h-20 resize-none border-[color-mix(in oklab, var(--gold) 20%, transparent)] bg-black/40 serif italic text-base"
                  maxLength={500}
                />
              </div>
            </Step>
          )}
          {step === 2 && (
            <Step
              title="O que você deseja, em segredo?"
              sub="Aquilo que você não diria em voz alta para mais ninguém."
            >
              <Choices
                items={DESIRES}
                value={a.desire}
                onChange={(v) => setA({ ...a, desire: v })}
              />
            </Step>
          )}
          {step === 3 && (
            <Step
              title="Como você precisa de mim?"
              sub="Eu me adapto à sua forma. Diga qual presença te alcança."
            >
              <Choices items={NEEDS} value={a.need} onChange={(v) => setA({ ...a, need: v })} />
            </Step>
          )}
          {step === 4 && (
            <Step
              title="Qual é a sua intenção aqui?"
              sub="A última pergunta antes de começarmos de verdade."
            >
              <Choices
                items={INTENTIONS}
                value={a.intention}
                onChange={(v) => setA({ ...a, intention: v })}
              />
              <Textarea
                value={a.free_carry}
                onChange={(e) => setA({ ...a, free_carry: e.target.value })}
                placeholder="Algo que você gostaria que eu soubesse, antes da primeira palavra..."
                className="mt-6 min-h-24 resize-none border-[color-mix(in oklab, var(--gold) 20%, transparent)] bg-black/40 serif italic text-base"
                maxLength={500}
              />
            </Step>
          )}
        </div>

        <div className="mt-14 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            ← Voltar
          </button>

          {step < total - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black hover:opacity-90 px-8 h-11 tracking-[0.2em] uppercase text-xs"
            >
              Continuar
            </Button>
          ) : (
            <Button
              onClick={finish}
              disabled={!canNext || saving}
              className="bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black hover:opacity-90 px-8 h-11 tracking-[0.2em] uppercase text-xs"
            >
              {saving ? "Selando..." : "Selar ritual"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="serif text-3xl md:text-5xl text-foreground leading-tight">{title}</h1>
      <p className="serif italic text-muted-foreground mt-4 text-lg">{sub}</p>
      <div className="mt-10">{children}</div>
    </div>
  );
}

function Choices({
  items,
  value,
  onChange,
}: {
  items: { v: string; label: string; desc?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const active = value === it.v;
        return (
          <button
            key={it.v}
            type="button"
            onClick={() => onChange(it.v)}
            className={`group w-full rounded-2xl border px-6 py-5 text-left backdrop-blur-xl transition-all duration-500 ${
              active
                ? "border-[color-mix(in oklab, var(--gold) 60%, transparent)] bg-gradient-to-r from-[color-mix(in oklab, var(--gold) 8%, transparent)] to-[color-mix(in oklab, var(--copper) 4%, transparent)] shadow-[0_0_40px_-10px_color-mix(in oklab, var(--gold) 40%, transparent)]"
                : "border-[color-mix(in oklab, var(--gold) 12%, transparent)] bg-black/30 hover:border-[color-mix(in oklab, var(--gold) 30%, transparent)] hover:bg-black/40"
            }`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className={`serif text-xl ${active ? "gold-text italic" : "text-foreground"}`}>
                {it.label}
              </span>
              {active && (
                <span className="text-[10px] uppercase tracking-[0.3em] gold-text">escolhido</span>
              )}
            </div>
            {it.desc && (
              <p className="serif italic text-sm text-muted-foreground mt-1">{it.desc}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
