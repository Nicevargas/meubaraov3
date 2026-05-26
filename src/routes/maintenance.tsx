import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Particles } from "@/components/Atmosphere";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Meu Barão — Uma nova forma de presença emocional está chegando" },
      {
        name: "description",
        content:
          "Uma experiência que une inteligência artificial, memória emocional, voz e presença. Entre na lista privada em meubarao.com.",
      },
      { property: "og:title", content: "Meu Barão — Em breve" },
      {
        property: "og:description",
        content: "Uma nova forma de presença emocional está chegando.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [audioOn, setAudioOn] = useState(false);
  const audioRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);

  // Ambient drone via Web Audio
  useEffect(() => {
    if (!audioOn) {
      audioRef.current?.stop();
      audioRef.current = null;
      return;
    }
    const AudioCtx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2.5);

    const freqs = [55, 82.4, 110, 164.8];
    const oscs: OscillatorNode[] = [];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = i % 2 ? "sine" : "triangle";
      o.frequency.value = f;
      g.gain.value = 0.25 / freqs.length;
      // slow LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.05 + i * 0.02;
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain).connect(g.gain);
      lfo.start();
      o.connect(g).connect(master);
      o.start();
      oscs.push(o);
    });

    audioRef.current = {
      ctx,
      stop: () => {
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
        setTimeout(() => {
          oscs.forEach((o) => o.stop());
          ctx.close();
        }, 1400);
      },
    };
    return () => audioRef.current?.stop();
  }, [audioOn]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 255) {
      setStatus("err");
      return;
    }
    setStatus("loading");
    try {
      const { error } = await supabase.from("waitlist").insert({
        email: trimmed,
        source: "maintenance",
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });
      // 23505 = unique_violation → email already registered; treat as success
      if (error && error.code !== "23505") {
        setStatus("err");
        return;
      }
      setStatus("ok");
    } catch {
      setStatus("err");
    }
  }

  return (
    <main className="bg-noir relative min-h-screen w-full overflow-hidden text-foreground">
      {/* Ambient layers */}
      <div className="fog" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 50%, oklch(0.78 0.13 75 / 0.10), transparent 70%)",
        }}
      />
      <Particles count={40} />

      {/* Audio toggle */}
      <button
        type="button"
        onClick={() => setAudioOn((v) => !v)}
        className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-full border border-[oklch(0.78_0.13_75/0.25)] bg-[oklch(0.18_0.02_40/0.5)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-[oklch(0.88_0.08_75)] backdrop-blur-md transition-all duration-700 hover:border-[oklch(0.78_0.13_75/0.6)]"
        aria-pressed={audioOn}
      >
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${audioOn ? "bg-[oklch(0.82_0.14_80)] animate-breath" : "bg-[oklch(0.5_0.04_60)]"}`}
        />
        Ambiente Sonoro
      </button>

      {/* Center stage */}
      <section className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <p className="divider-ornament mb-10">meubarao</p>
        </div>

        <h1
          className="serif gold-text animate-fade-up text-[18vw] leading-[0.9] sm:text-[140px]"
          style={{ animationDelay: "300ms", fontWeight: 300 }}
        >
          Meu Barão
        </h1>

        <div className="gold-line animate-fade-up mt-10 w-32" style={{ animationDelay: "700ms" }} />

        <p
          className="serif animate-fade-up mt-10 max-w-xl text-balance text-2xl italic text-[oklch(0.9_0.04_70)] sm:text-3xl"
          style={{ animationDelay: "900ms", fontWeight: 300 }}
        >
          Uma nova forma de presença emocional está chegando.
        </p>

        <p
          className="animate-fade-up mt-8 max-w-md text-balance text-sm leading-relaxed text-muted-foreground sm:text-base"
          style={{ animationDelay: "1200ms" }}
        >
          Estamos preparando uma experiência que une inteligência artificial, memória emocional,
          voz, presença e conexão humana de uma forma nunca vista antes.
        </p>

        {/* CTA */}
        <div className="animate-fade-up mt-16 w-full max-w-md" style={{ animationDelay: "1500ms" }}>
          <p className="mb-6 text-[10px] uppercase tracking-[0.4em] text-[oklch(0.78_0.10_75)]">
            Lista privada
          </p>
          <p className="serif mb-8 text-lg text-[oklch(0.92_0.03_70)] sm:text-xl">
            Entre na lista privada e seja uma das primeiras pessoas a acessar.
          </p>

          {status === "ok" ? (
            <div className="glass rounded-full px-6 py-5 text-sm text-[oklch(0.9_0.06_75)]">
              <span className="gold-text font-medium">Recebido.</span> Em breve, você receberá uma
              carta.
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="glass group flex flex-col items-stretch gap-2 rounded-full p-2 sm:flex-row sm:gap-0"
            >
              <input
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "err") setStatus("idle");
                }}
                placeholder="seu@email.com"
                className="w-full flex-1 bg-transparent px-5 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                aria-label="Seu email"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-gold !py-3 disabled:opacity-60"
              >
                {status === "loading" ? "Enviando" : "Entrar"}
              </button>
            </form>
          )}
          {status === "err" && (
            <p className="mt-3 text-xs text-[oklch(0.7_0.15_25)]">
              Verifique seu email e tente novamente.
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="absolute bottom-5 left-0 right-0 z-10 text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground/70">
          meubarao.com
        </p>
      </footer>
    </main>
  );
}
