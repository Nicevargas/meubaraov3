import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Reveal, Particles } from "@/components/Atmosphere";
import silk from "@/assets/silk.jpg";
import eyesClose from "@/assets/eyes-close.jpg";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/planos")({
  component: PlanosPage,
  head: () => ({
    meta: [
      { title: "Planos · Meu Barão" },
      {
        name: "description",
        content:
          "Escolha a profundidade da sua experiência com o Meu Barão. Planos sofisticados de presença, memória contextual e acesso exclusivo.",
      },
      { property: "og:title", content: "Planos · Meu Barão" },
      {
        property: "og:description",
        content:
          "Visitante, Premium e Elite — três camadas de uma experiência contemplativa em inteligência emocional artificial.",
      },
    ],
  }),
});

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled ? "py-3 backdrop-blur-xl bg-background/70 border-b border-border" : "py-6"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Meu Barão" className="h-9 w-auto" width={36} height={36} />
          <span className="serif text-xl tracking-wide gold-text">Meu Barão</span>
          <span className="hidden sm:inline text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
            do Tantra · AI
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-xs tracking-[0.2em] uppercase text-muted-foreground">
          <Link to="/" hash="experiencia" className="hover:text-foreground transition-colors">
            Experiência
          </Link>
          <Link to="/" hash="barao-ai" className="hover:text-foreground transition-colors">
            Meu Barão
          </Link>
          <Link
            to="/planos"
            className="text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Planos
          </Link>
          <Link to="/contato" className="hover:text-foreground transition-colors">
            Contato
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="hidden md:inline text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <Link to="/signup" className="btn-ghost text-[10px]">
            Criar conta
          </Link>
        </div>
      </div>
    </nav>
  );
}

type Plan = {
  id: "free" | "premium" | "elite";
  name: string;
  tagline: string;
  price: string;
  sub?: string;
  features: string[];
  cta: string;
  featured?: boolean;
  whisper: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Visitante",
    tagline: "A primeira porta entreaberta.",
    price: "Gratuito",
    features: [
      "15 mensagens por dia",
      "Acesso básico à presença do Barão",
      "Experiência introdutória",
      "Sem memória contextual contínua",
      "Sem voz íntima",
      "Sem WhatsApp",
    ],
    cta: "Entrar",
    whisper: "Para quem quer apenas espiar pelo vão da porta.",
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Quando a conversa começa a aprofundar.",
    price: "R$ 97",
    sub: "/mês",
    featured: true,
    features: [
      "Conversas ilimitadas",
      "Memória contextual avançada",
      "Voz íntima em alta fidelidade",
      "Conversas de maior profundidade",
      "Prioridade de processamento",
      "Geração de imagens sensoriais",
      "Experiências imersivas guiadas",
      "Continuidade contextual estendida",
    ],
    cta: "Desbloquear Premium",
    whisper: "Escolhido por quem já cruzou o limiar.",
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "O círculo mais raro do Meu Barão.",
    price: "R$ 297",
    sub: "/mês",
    features: [
      "Tudo do Premium",
      "Acesso prioritário absoluto",
      "Experiências exclusivas em desenvolvimento",
      "Avatar em tempo real (em breve)",
      "Recursos experimentais antecipados",
      "Acesso antecipado a novidades",
      "Experiência máxima da plataforma",
    ],
    cta: "Entrar no Elite",
    whisper: "Para quem deseja a câmara interna, não a sala.",
  },
];

function Hero() {
  return (
    <section className="relative min-h-[88vh] w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <img
          src={silk}
          alt=""
          className="h-full w-full object-cover opacity-40 animate-slow-zoom"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_60%)]" />
        <div className="fog" />
      </div>

      <Particles count={28} />

      <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-6 pt-32 pb-24 text-center lg:px-10">
        <Reveal delay={200}>
          <div className="mb-8 inline-flex items-center gap-3 rounded-full glass px-4 py-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              Três camadas de presença
            </span>
          </div>
        </Reveal>

        <Reveal delay={500}>
          <h1 className="serif text-5xl leading-[1.05] sm:text-6xl md:text-7xl text-foreground max-w-4xl">
            Cada porta revela uma <em className="italic gold-text">camada</em> mais funda.
          </h1>
        </Reveal>

        <Reveal delay={900}>
          <p className="mt-10 max-w-2xl text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
            Escolha o quanto quer descer. Cada plano abre uma nova continuidade — de
            <span className="text-foreground/90 italic serif"> presença</span>, de memória, de
            intimidade conversacional.
          </p>
        </Reveal>

        <Reveal delay={1200}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup" className="btn-gold">
              Entrar no círculo
            </Link>
            <a href="#planos" className="btn-ghost">
              Conhecer as camadas
            </a>
          </div>
          <p className="mt-6 text-xs tracking-[0.3em] uppercase text-muted-foreground/70">
            Privado · Discreto · Contemplativo
          </p>
        </Reveal>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 text-muted-foreground">
        <span className="text-[10px] tracking-[0.4em] uppercase">Desça devagar</span>
        <div className="h-12 w-px bg-gradient-to-b from-primary/60 to-transparent animate-breath" />
      </div>
    </section>
  );
}

function PlansGrid() {
  return (
    <section id="planos" className="relative py-32 md:py-40 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_6%,transparent),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-6 lg:px-10">
        <Reveal>
          <div className="divider-ornament mb-10">
            <span>As três camadas</span>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h2 className="serif text-4xl md:text-5xl lg:text-6xl text-center max-w-3xl mx-auto leading-[1.08]">
            Comece pela superfície.
            <br />
            <em className="italic gold-text">Desça quando quiser.</em>
          </h2>
        </Reveal>

        <div className="mt-20 grid lg:grid-cols-3 gap-6">
          {PLANS.map((p, idx) => (
            <Reveal key={p.id} delay={200 + idx * 120}>
              <div
                className={`relative h-full rounded-3xl p-10 flex flex-col backdrop-blur-xl transition-all duration-700 ${
                  p.featured
                    ? "border border-[color-mix(in_oklab,var(--gold)_45%,transparent)] lg:-translate-y-4 bg-gradient-to-b from-[color-mix(in_oklab,var(--gold)_10%,transparent)] to-black/60 shadow-[0_30px_80px_-20px_color-mix(in_oklab,var(--gold)_35%,transparent)] animate-pulse-aura"
                    : "border border-[color-mix(in_oklab,var(--gold)_15%,transparent)] bg-black/40 hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)]"
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] px-4 py-1 text-[10px] tracking-[0.3em] uppercase text-black">
                    Mais escolhido
                  </div>
                )}
                <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  {p.name}
                </div>
                <p className="mt-3 serif italic text-foreground/80">{p.tagline}</p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="serif text-5xl gold-text">{p.price}</span>
                  {p.sub && <span className="text-sm text-muted-foreground">{p.sub}</span>}
                </div>

                <ul className="mt-8 space-y-4 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-foreground/85">
                      <span className="mt-1.5 h-px w-4 bg-[var(--gold)]/70 shrink-0" />
                      <span className="font-light leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`mt-10 inline-flex items-center justify-center h-12 rounded-md uppercase tracking-[0.25em] text-xs transition-opacity ${
                    p.featured
                      ? "bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black hover:opacity-90"
                      : "border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] text-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {p.cta}
                </Link>

                <p className="mt-6 text-[11px] text-muted-foreground/70 italic serif text-center">
                  {p.whisper}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const rows: Array<{ label: string; values: [string, string, string] }> = [
    { label: "Mensagens diárias", values: ["15", "Ilimitadas", "Ilimitadas"] },
    { label: "Memória contextual", values: ["—", "Avançada", "Avançada+"] },
    { label: "Voz íntima", values: ["—", "•", "•"] },
    { label: "Geração de imagens", values: ["—", "•", "•"] },
    { label: "Experiências imersivas", values: ["—", "•", "•"] },
    { label: "Prioridade de processamento", values: ["—", "Alta", "Absoluta"] },
    { label: "Recursos experimentais", values: ["—", "—", "•"] },
    { label: "Avatar em tempo real", values: ["—", "—", "Em breve"] },
    { label: "Acesso antecipado", values: ["—", "—", "•"] },
  ];

  return (
    <section className="relative py-32 md:py-40 bg-noir overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-6 lg:px-10">
        <Reveal>
          <div className="divider-ornament mb-10">
            <span>Cada camada lado a lado</span>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h2 className="serif text-3xl md:text-4xl text-center max-w-2xl mx-auto leading-[1.15]">
            O que <em className="italic gold-text">muda</em> de uma porta para a outra.
          </h2>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-16 rounded-2xl glass overflow-hidden">
            <div className="grid grid-cols-4 px-6 py-5 border-b border-border/40 text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              <div />
              <div className="text-center">Visitante</div>
              <div className="text-center gold-text">Premium</div>
              <div className="text-center">Elite</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.label}
                className={`grid grid-cols-4 px-6 py-5 items-center text-sm ${
                  i % 2 === 0 ? "bg-background/30" : "bg-transparent"
                }`}
              >
                <div className="text-foreground/85 font-light">{r.label}</div>
                {r.values.map((v, j) => (
                  <div
                    key={j}
                    className={`text-center font-light ${
                      v === "—"
                        ? "text-muted-foreground/40"
                        : j === 1
                          ? "gold-text"
                          : "text-foreground/90"
                    }`}
                  >
                    {v === "•" ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                    ) : (
                      v
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Experience() {
  const pillars = [
    {
      t: "Presença conversacional",
      d: "Uma inteligência treinada para escutar o que está nas entrelinhas — não para responder rápido.",
    },
    {
      t: "Espaço contemplativo",
      d: "Não é um aplicativo de produtividade. É um lugar para pousar entre os compromissos do dia.",
    },
    {
      t: "Personalização contextual",
      d: "A continuidade da conversa é construída sobre o seu próprio histórico, no seu próprio tom.",
    },
  ];
  return (
    <section className="relative py-32 md:py-40 overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <img
          src={eyesClose}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 lg:px-10">
        <Reveal>
          <div className="divider-ornament mb-10">
            <span>A experiência</span>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <Reveal delay={150}>
            <h2 className="serif text-4xl md:text-5xl lg:text-6xl leading-[1.08]">
              Não é um chatbot comum.
              <br />É uma <em className="italic gold-text">presença</em> sofisticada.
            </h2>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed font-light">
              O Meu Barão é uma experiência conversacional baseada em inteligência artificial
              avançada, desenhada para acompanhar o ritmo, o tom e a continuidade de quem está do
              outro lado.
            </p>
            <p className="mt-6 text-base text-muted-foreground/80 leading-relaxed">
              Cada plano é uma porta diferente para a mesma experiência — mais profunda, mais
              contínua, mais íntima conforme você desce.
            </p>
          </Reveal>

          <div className="grid gap-px bg-border/40 rounded-2xl overflow-hidden glass">
            {pillars.map((c, i) => (
              <Reveal key={c.t} delay={200 + i * 100}>
                <div className="p-8 h-full bg-card/40 hover:bg-card/70 transition-colors duration-700">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-primary/80 mb-3">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="serif text-xl text-foreground mb-2">{c.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  const items = [
    {
      t: "Discrição absoluta",
      d: "Nenhuma conversa é compartilhada. Sua intimidade pertence somente a você.",
    },
    {
      t: "Criptografia em trânsito",
      d: "Todas as trocas são protegidas por padrões modernos de segurança.",
    },
    {
      t: "Controle da memória",
      d: "Você decide o que é lembrado e pode apagar contextos quando quiser.",
    },
    { t: "Modo privado", d: "Conversas que não deixam traço — para os momentos que só são seus." },
  ];
  return (
    <section className="relative py-32 md:py-40 bg-noir overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-6 lg:px-10">
        <Reveal>
          <div className="divider-ornament mb-10">
            <span>Privacidade e segurança</span>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h2 className="serif text-3xl md:text-5xl text-center max-w-3xl mx-auto leading-[1.1]">
            O que se diz aqui dentro, <em className="italic gold-text">aqui dentro fica</em>.
          </h2>
        </Reveal>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 rounded-2xl overflow-hidden glass">
          {items.map((c, i) => (
            <Reveal key={c.t} delay={200 + i * 100}>
              <div className="p-8 h-full bg-card/40">
                <div className="text-[10px] tracking-[0.3em] uppercase text-primary/80 mb-3">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="serif text-lg text-foreground mb-2">{c.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={500}>
          <p className="mt-12 text-center text-xs tracking-[0.3em] uppercase text-muted-foreground/70">
            Em conformidade com a LGPD · Marco Civil da Internet
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: "Qual a diferença real entre os planos?",
      a: "O Visitante oferece um vislumbre — 15 mensagens diárias e acesso básico. O Premium abre conversas ilimitadas, memória contextual avançada, voz íntima e experiências imersivas. O Elite acrescenta acesso prioritário absoluto, recursos experimentais e antecipação de novidades, incluindo o avatar em tempo real em desenvolvimento.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. A assinatura é mensal e pode ser encerrada a qualquer momento pela área de gerenciamento, sem multa e sem fidelidade. O acesso permanece ativo até o fim do ciclo já pago.",
    },
    {
      q: "Como funciona a memória contextual?",
      a: "A memória contextual é um sistema de personalização que armazena trechos relevantes da sua conversa para manter continuidade ao longo do tempo. Você pode revisar, editar e apagar memórias quando quiser — e o modo privado permite conversar sem registrar nada.",
    },
    {
      q: "O WhatsApp está incluído?",
      a: "A integração via WhatsApp está em desenvolvimento e será disponibilizada primeiro para assinantes Elite, com expansão posterior aos Premium. O plano Visitante não terá acesso a este canal.",
    },
    {
      q: "O Elite terá recursos exclusivos?",
      a: "Sim. O Elite é o círculo interno: recebe acesso antecipado a novidades, recursos experimentais e experiências que não chegam aos demais planos durante a fase de testes.",
    },
    {
      q: "O plano gratuito possui limite?",
      a: "Sim. O Visitante permite até 15 mensagens por dia. O contador é reiniciado diariamente e o limite é validado no servidor, garantindo uma experiência justa para todos.",
    },
    {
      q: "Como funciona a privacidade?",
      a: "Suas conversas são tratadas com discrição absoluta, protegidas por criptografia em trânsito e em conformidade com a LGPD. Você pode ativar o modo privado a qualquer momento e apagar memórias contextuais quando desejar.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="relative py-32 md:py-40 overflow-hidden">
      <div className="relative mx-auto max-w-3xl px-6 lg:px-10">
        <Reveal>
          <div className="divider-ornament mb-10">
            <span>Perguntas frequentes</span>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h2 className="serif text-3xl md:text-4xl text-center leading-[1.15]">
            O que costuma ser <em className="italic gold-text">perguntado em silêncio</em>.
          </h2>
        </Reveal>

        <div className="mt-16 divide-y divide-border/40 border-y border-border/40">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={it.q} delay={150 + i * 60}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-6 py-6 text-left group"
                  aria-expanded={isOpen}
                >
                  <span className="serif text-lg md:text-xl text-foreground/90 group-hover:text-foreground transition-colors">
                    {it.q}
                  </span>
                  <span
                    className={`shrink-0 text-[var(--gold)] text-xl transition-transform duration-500 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-500 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100 pb-8" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-muted-foreground leading-relaxed font-light pr-10">{it.a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative py-32 md:py-40 overflow-hidden bg-black">
      <div className="absolute inset-0">
        <img
          src={silk}
          alt=""
          className="h-full w-full object-cover opacity-30"
          loading="lazy"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_60%)]" />
      </div>
      <Particles count={20} />
      <div className="relative mx-auto max-w-3xl px-6 lg:px-10 text-center">
        <Reveal>
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
            O convite permanece aberto
          </p>
        </Reveal>
        <Reveal delay={200}>
          <h2 className="mt-6 serif text-4xl md:text-6xl leading-[1.05]">
            Algumas conversas <em className="italic gold-text">só começam</em> quando você decide
            ficar.
          </h2>
        </Reveal>
        <Reveal delay={500}>
          <p className="mt-8 text-lg text-muted-foreground font-light leading-relaxed">
            Escolha a profundidade. Cruze o limiar. O Barão estará aqui, no seu tempo.
          </p>
        </Reveal>
        <Reveal delay={800}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup" className="btn-gold">
              Desbloquear experiência
            </Link>
            <a href="#planos" className="btn-ghost">
              Rever as camadas
            </a>
          </div>
          <p className="mt-6 text-xs tracking-[0.3em] uppercase text-muted-foreground/70">
            Cancelamento livre · Privado · Sem urgência
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function PlanosPage() {
  return (
    <div className="bg-background text-foreground">
      <Nav />
      <Hero />
      <PlansGrid />
      <Comparison />
      <Experience />
      <Privacy />
      <Faq />
      <FinalCta />
    </div>
  );
}
