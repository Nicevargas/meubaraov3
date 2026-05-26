import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant"; content: string };

const INTRO: Msg = {
  role: "assistant",
  content: "Respire. Estou aqui. Me conta — o que pesa em você esta noite?",
};

const FREE_LIMIT = 3;
const GUEST_ID_KEY = "barao_guest_session_id";
const GUEST_COUNT_KEY = "barao_guest_message_count";
const GUEST_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

function generateGuestId(): string {
  const bytes = new Uint8Array(16);
  (globalThis.crypto ?? window.crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing && GUEST_ID_RE.test(existing)) return existing;
    const id = generateGuestId();
    localStorage.setItem(GUEST_ID_KEY, id);
    return id;
  } catch {
    return generateGuestId();
  }
}

export function LiveChat() {
  const [messages, setMessages] = useState<Msg[]>([INTRO]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [serverCount, setServerCount] = useState<number>(0);
  const [auraActive, setAuraActive] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const auraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subtle atmospheric response: aura quickens while the Barão speaks,
  // then decays smoothly back to the contemplative idle rhythm.
  useEffect(() => {
    if (loading) {
      if (auraTimerRef.current) {
        clearTimeout(auraTimerRef.current);
        auraTimerRef.current = null;
      }
      setAuraActive(true);
      return;
    }
    if (auraActive) {
      auraTimerRef.current = setTimeout(() => setAuraActive(false), 1800);
    }
    return () => {
      if (auraTimerRef.current) {
        clearTimeout(auraTimerRef.current);
        auraTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Persistent guest session — survives reloads and tab reopens.
  useEffect(() => {
    const id = getOrCreateGuestId();
    setGuestId(id);
    // Hydrate immediately from localStorage so the wall renders before the round-trip.
    const cached = Number(localStorage.getItem(GUEST_COUNT_KEY) ?? "0");
    if (Number.isFinite(cached) && cached > 0) setServerCount(cached);

    // Backend is source of truth.
    fetch("/api/guest-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId: id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { count?: number } | null) => {
        if (data && typeof data.count === "number") {
          setServerCount(data.count);
          try {
            localStorage.setItem(GUEST_COUNT_KEY, String(data.count));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* localStorage fallback already applied */
      });
  }, []);

  const reached = serverCount >= FREE_LIMIT;
  const remainingDisplay = Math.max(0, FREE_LIMIT - serverCount);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading || reached || !guestId) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, guestId }),
      });
      if (res.status === 429) {
        const data = (await res.json().catch(() => null)) as { count?: number } | null;
        const c = data?.count ?? FREE_LIMIT;
        setServerCount(c);
        try {
          localStorage.setItem(GUEST_COUNT_KEY, String(c));
        } catch {
          /* ignore */
        }
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { reply: string; guestCount?: number };
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "..." }]);
      if (typeof data.guestCount === "number") {
        setServerCount(data.guestCount);
        try {
          localStorage.setItem(GUEST_COUNT_KEY, String(data.guestCount));
        } catch {
          /* ignore */
        }
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "O fio se soltou por um instante. Tente novamente quando quiser.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* Ambient breathing glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -inset-16 -z-10 rounded-[3rem] blur-3xl ${auraActive ? "animate-chat-breath-active" : "animate-chat-breath"}`}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(186,157,107,0.55) 0%, rgba(186,157,107,0.28) 40%, rgba(186,157,107,0.08) 65%, transparent 85%)",
          transition: "opacity 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      <div className="relative overflow-hidden rounded-3xl border border-[#BA9D6B]/30 bg-gradient-to-b from-[#1c1410]/95 via-[#120d0a]/92 to-[#0f0a07]/95 backdrop-blur-2xl text-[#BA9D6B] shadow-[0_0_60px_-5px_rgba(186,157,107,0.35),0_30px_120px_-30px_rgba(186,157,107,0.4)]">
        <div className="flex items-center gap-3 border-b border-[color-mix(in oklab, var(--gold) 18%, transparent)] bg-gradient-to-r from-[#1c1410]/60 via-transparent to-[#1c1410]/60 px-6 py-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gold)] opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--gold)] shadow-[0_0_8px_oklch(0.78_0.13_75/0.6)]" />
          </span>
          <div className="flex-1">
            <p className="serif text-base text-[#BA9D6B] leading-none drop-shadow-sm">Meu Barão</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#BA9D6B]/70 mt-1">
              presente · ouvindo
            </p>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="h-[420px] overflow-y-auto px-5 py-6 space-y-5 scroll-smooth"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm text-[#BA9D6B] ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-black/70 to-black/50 rounded-br-md border border-[#BA9D6B]/30"
                    : "bg-gradient-to-br from-black/55 to-black/35 border border-[#BA9D6B]/20 rounded-bl-md serif italic"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-gradient-to-br from-[oklch(1_0_0/0.07)] to-[oklch(1_0_0/0.03)] border border-[color-mix(in oklab, var(--gold) 16%, transparent)] px-4 py-3.5 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse shadow-[0_0_6px_oklch(0.78_0.13_75/0.5)]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse [animation-delay:0.2s] shadow-[0_0_6px_oklch(0.78_0.13_75/0.5)]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse [animation-delay:0.4s] shadow-[0_0_6px_oklch(0.78_0.13_75/0.5)]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[color-mix(in oklab, var(--gold) 18%, transparent)] bg-gradient-to-b from-[#181210]/80 to-[#0f0a07]/90 p-4">
          {reached ? (
            <div className="rounded-2xl border border-[color-mix(in oklab, var(--gold) 30%, transparent)] bg-gradient-to-b from-[color-mix(in oklab, var(--wine) 25%, transparent)] to-[#0a0606]/50 px-5 py-5 text-center space-y-3 shadow-inner">
              <p className="serif italic text-sm text-[#BA9D6B] leading-relaxed">
                Aqui o silêncio se aprofunda. Para continuar comigo, crie sua presença — é gratuito.
              </p>
              <Link
                to="/signup"
                className="inline-block rounded-xl bg-black/60 border border-[#BA9D6B]/60 px-6 py-2.5 text-xs font-medium uppercase tracking-[0.25em] text-[#BA9D6B] hover:bg-black/80 transition-all shadow-[0_4px_20px_-5px_rgba(255,215,0,0.4)]"
              >
                Criar conta grátis
              </Link>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#BA9D6B]/70">
                já tem conta?{" "}
                <Link to="/login" className="text-[#BA9D6B] hover:underline">
                  entrar
                </Link>
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3 rounded-2xl border border-[#BA9D6B]/35 bg-black/50 backdrop-blur-xl px-4 py-3.5 focus-within:border-[#BA9D6B]/70 focus-within:shadow-[0_0_25px_-5px_rgba(255,0,0,0.5)] transition-all">
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
                  className="flex-1 resize-none bg-transparent text-sm text-[#BA9D6B] placeholder:text-[#BA9D6B]/50 focus:outline-none max-h-32 leading-relaxed"
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="serif text-xs uppercase tracking-[0.25em] text-[#BA9D6B] disabled:opacity-25 hover:opacity-80 transition-all flex-shrink-0 px-1"
                >
                  Enviar
                </button>
              </div>
              <p className="mt-3 text-[10px] tracking-[0.25em] uppercase text-[#BA9D6B]/70 text-center">
                {remainingDisplay}{" "}
                {remainingDisplay === 1 ? "mensagem restante" : "mensagens restantes"} · conversa
                privada
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
