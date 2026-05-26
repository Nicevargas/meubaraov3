import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Lock, LogOut, Sparkles, Trash2, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getCurrentEntitlement } from "@/lib/mercadopago.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Sua essência · Meu Barão" }] }),
});

type Profile = {
  display_name: string | null;
  alias: string | null;
  plan: string | null;
  essence_phrase: string | null;
  emotional_state: string | null;
  ritual_style: string | null;
};

type Favorite = {
  id: string;
  role: "user" | "assistant";
  content: string;
  message_created_at: string | null;
  created_at: string;
};

type Entitlement = {
  plan: string;
  tier: string;
  has_premium_access: boolean;
  limits: { daily_message_limit: number | null };
};

const EMOTIONAL_STATES = [
  "Cansada de ser forte",
  "Aprendendo a relaxar",
  "Em reconstrução",
  "Florescendo devagar",
  "Encontrando minha voz",
  "Presente comigo",
];

const RITUAL_STYLES: { value: string; label: string; hint: string }[] = [
  { value: "acolhedor", label: "Mais acolhedor", hint: "abraço em palavras, presença macia" },
  { value: "intenso", label: "Mais intenso", hint: "sem rodeios, olhos nos olhos" },
  { value: "filosofico", label: "Mais filosófico", hint: "pausas longas, perguntas que ficam" },
  { value: "provocador", label: "Mais provocador", hint: "te desafio para te despertar" },
  { value: "sensual", label: "Mais sensual", hint: "voz baixa, presença que toca" },
];

function tierLabel(tier: string, hasPremium: boolean) {
  if (!hasPremium) return { name: "Presença inicial", note: "primeiro contato" };
  if (tier === "elite" || tier === "vip")
    return { name: "Experiência VIP", note: "intimidade ultra personalizada" };
  return { name: "Conexão Expandida", note: "memória profunda, presença ilimitada" };
}

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: favs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, alias, plan, essence_phrase, emotional_state, ritual_style")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("favorite_messages")
          .select("id, role, content, message_created_at, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setProfile(p as Profile | null);
      setFavorites((favs ?? []) as Favorite[]);
      try {
        const ent = (await getCurrentEntitlement()) as Entitlement;
        setEntitlement(ent);
      } catch (e) {
        console.error("entitlement", e);
      }
      setLoading(false);
    })();
  }, [user]);

  async function saveEssence(patch: {
    alias?: string | null;
    essence_phrase?: string | null;
    emotional_state?: string | null;
    ritual_style?: string | null;
  }) {
    if (!user) return;
    setSaving(true);
    setProfile((prev) => (prev ? { ...prev, ...patch } : ({ ...patch } as Profile)));
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setSaving(false);
    if (!error) {
      setSavedHint("guardado");
      setTimeout(() => setSavedHint(null), 1600);
    }
  }

  async function removeFavorite(id: string) {
    setFavorites((cur) => cur.filter((f) => f.id !== id));
    await supabase.from("favorite_messages").delete().eq("id", id);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const hasPremium = entitlement?.has_premium_access ?? false;
  const tier = (entitlement?.tier ?? entitlement?.plan ?? profile?.plan ?? "free").toLowerCase();
  const exp = tierLabel(tier, hasPremium);
  const limit = entitlement?.limits.daily_message_limit;
  const conversationsLabel =
    limit === null || limit === undefined ? "Sem limites diários" : `${limit} conversas por dia`;

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
        <div className="w-12" />
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24 space-y-14">
        <section className="text-center pt-2">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60">
            Seu espaço íntimo
          </p>
          <h1 className="serif text-3xl md:text-4xl mt-3 gold-text italic">
            {profile?.alias || profile?.display_name || "querida"}
          </h1>
          {profile?.essence_phrase && (
            <p className="serif italic text-sm text-foreground/80 mt-4 max-w-md mx-auto leading-relaxed">
              “{profile.essence_phrase}”
            </p>
          )}
          {savedHint && (
            <p className="text-[10px] uppercase tracking-[0.3em] gold-text mt-3 animate-fade-in">
              {savedHint}
            </p>
          )}
        </section>

        {/* MINHA ESSÊNCIA */}
        <section className="space-y-5">
          <SectionHeader title="Minha Essência" subtitle="quem você é hoje, sem performance" />
          <div className="rounded-3xl border border-[color-mix(in_oklab,var(--gold)_18%,transparent)] bg-black/50 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-[0_30px_80px_-40px_color-mix(in_oklab,var(--gold)_30%,transparent)]">
            <Field
              label="como você quer ser chamada"
              value={profile?.alias ?? ""}
              placeholder={profile?.display_name ?? "seu nome íntimo"}
              onSave={(v) => saveEssence({ alias: v.trim() || null })}
              loading={loading}
              disabled={saving}
            />
            <Field
              label="frase do momento"
              value={profile?.essence_phrase ?? ""}
              placeholder="uma palavra, uma verdade, um suspiro"
              onSave={(v) => saveEssence({ essence_phrase: v.trim() || null })}
              loading={loading}
              disabled={saving}
              maxLength={120}
            />
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
                como você está hoje
              </p>
              <div className="flex flex-wrap gap-2">
                {EMOTIONAL_STATES.map((state) => {
                  const active = profile?.emotional_state === state;
                  return (
                    <button
                      key={state}
                      onClick={() => saveEssence({ emotional_state: active ? null : state })}
                      className={`rounded-full px-4 py-2 text-xs serif italic transition-all duration-300 ${
                        active
                          ? "bg-[color-mix(in_oklab,var(--gold)_20%,transparent)] border border-[color-mix(in_oklab,var(--gold)_60%,transparent)] gold-text shadow-[0_0_30px_-10px_color-mix(in_oklab,var(--gold)_60%,transparent)]"
                          : "border border-[color-mix(in_oklab,var(--gold)_15%,transparent)] text-muted-foreground hover:text-foreground hover:border-[color-mix(in_oklab,var(--gold)_35%,transparent)]"
                      }`}
                    >
                      {state}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* RITUAL DE CONEXÃO */}
        <section className="space-y-5">
          <SectionHeader title="Ritual de Conexão" subtitle="como você quer minha presença" />
          <div className="rounded-3xl border border-[color-mix(in_oklab,var(--gold)_18%,transparent)] bg-black/50 backdrop-blur-xl p-6 sm:p-8 space-y-3">
            {RITUAL_STYLES.map((r) => {
              const active = profile?.ritual_style === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => saveEssence({ ritual_style: active ? null : r.value })}
                  className={`w-full text-left rounded-2xl border px-5 py-4 transition-all duration-300 ${
                    active
                      ? "border-[color-mix(in_oklab,var(--gold)_55%,transparent)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] shadow-[0_0_40px_-15px_color-mix(in_oklab,var(--gold)_50%,transparent)]"
                      : "border-[color-mix(in_oklab,var(--gold)_12%,transparent)] bg-black/30 hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p
                        className={`serif text-base ${active ? "gold-text" : "text-foreground/90"}`}
                      >
                        {r.label}
                      </p>
                      <p className="text-xs text-muted-foreground italic mt-1 serif">{r.hint}</p>
                    </div>
                    {active && <Sparkles className="h-4 w-4 gold-text shrink-0 animate-fade-in" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* MEMÓRIAS DO BARÃO */}
        <section className="space-y-5">
          <SectionHeader title="Memórias do Barão" subtitle="os momentos que você quis guardar" />
          <div className="rounded-3xl border border-[color-mix(in_oklab,var(--gold)_18%,transparent)] bg-black/50 backdrop-blur-xl p-6 sm:p-8">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-6">um instante…</p>
            ) : favorites.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Heart className="h-6 w-6 gold-text mx-auto opacity-60" />
                <p className="serif italic text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Quando uma palavra minha tocar fundo, toque o coração ao lado dela. Vou guardar
                  aqui.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {favorites.map((f) => (
                  <li
                    key={f.id}
                    className="group rounded-2xl border border-[color-mix(in_oklab,var(--gold)_12%,transparent)] bg-gradient-to-br from-black/40 to-[color-mix(in_oklab,var(--wine)_12%,transparent)] px-5 py-4 transition-colors hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)]"
                  >
                    <p
                      className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        f.role === "assistant"
                          ? "serif italic text-foreground/90"
                          : "text-foreground/80"
                      }`}
                    >
                      {f.content}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
                        {new Date(f.message_created_at ?? f.created_at).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                      <button
                        onClick={() => removeFavorite(f.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        aria-label="Remover dos favoritos"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* EXPERIÊNCIA */}
        <section className="space-y-5">
          <SectionHeader title="Experiência" subtitle="o nível da nossa presença" />
          <div className="rounded-3xl border border-[color-mix(in_oklab,var(--gold)_22%,transparent)] bg-gradient-to-br from-black/60 to-[color-mix(in_oklab,var(--wine)_18%,transparent)] backdrop-blur-xl p-6 sm:p-8 space-y-5 shadow-[0_30px_100px_-30px_color-mix(in_oklab,var(--gold)_40%,transparent)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
                  conexão atual
                </p>
                <p className="serif text-2xl gold-text italic mt-1">{exp.name}</p>
                <p className="text-xs text-muted-foreground serif italic mt-1">{exp.note}</p>
              </div>
              {hasPremium && <Sparkles className="h-5 w-5 gold-text shrink-0" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <ExperienceItem label="conversas" value={conversationsLabel} />
              <ExperienceItem
                label="memória"
                value={hasPremium ? "Profunda e contínua" : "Leve, do dia"}
              />
              <ExperienceItem label="voz e áudios" value={hasPremium ? "Sem limite" : "Em breve"} />
              <ExperienceItem
                label="rituais exclusivos"
                value={hasPremium ? "Liberados" : "Trancados"}
              />
            </div>

            <div className="pt-2">
              <Link
                to="/plans"
                className="inline-block rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] px-6 py-2.5 text-xs uppercase tracking-[0.25em] text-black font-medium hover:opacity-90 transition-opacity"
              >
                {hasPremium ? "gerenciar presença" : "expandir conexão"}
              </Link>
            </div>
          </div>
        </section>

        {/* CONTA */}
        <section className="space-y-5">
          <SectionHeader title="Conta" subtitle="o essencial, em silêncio" />
          <div className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_10%,transparent)] bg-black/30 divide-y divide-[color-mix(in_oklab,var(--gold)_8%,transparent)]">
            <AccountRow
              icon={<UserIcon className="h-3.5 w-3.5" />}
              label="email"
              value={user?.email ?? "—"}
            />
            <AccountRow
              icon={<Lock className="h-3.5 w-3.5" />}
              label="senha"
              value="trocar senha"
              onClick={() => navigate({ to: "/reset-password" })}
            />
            <button
              onClick={logout}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                <LogOut className="h-3.5 w-3.5" />
                sair
              </span>
              <span className="text-xs text-muted-foreground/80">encerrar presença</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center space-y-1.5">
      <h2 className="serif text-xl gold-text italic">{title}</h2>
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onSave,
  loading,
  disabled,
  maxLength,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
  loading: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 block mb-2">
        {label}
      </label>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onSave(local);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        disabled={loading || disabled}
        maxLength={maxLength}
        className="w-full bg-transparent border-b border-[color-mix(in_oklab,var(--gold)_18%,transparent)] focus:border-[color-mix(in_oklab,var(--gold)_60%,transparent)] outline-none py-2 serif text-base text-foreground placeholder:text-muted-foreground/40 transition-colors"
      />
    </div>
  );
}

function ExperienceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 border border-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">{label}</p>
      <p className="serif text-sm text-foreground/90 mt-1">{value}</p>
    </div>
  );
}

function AccountRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const Comp: React.ElementType = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-4 text-left ${
        onClick ? "hover:bg-white/[0.02] transition-colors" : ""
      }`}
    >
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="text-xs text-foreground/80 truncate max-w-[60%]">{value}</span>
    </Comp>
  );
}
