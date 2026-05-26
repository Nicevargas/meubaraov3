import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Reveal, Particles } from "@/components/Atmosphere";
import silk from "@/assets/silk.jpg";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/contato")({
  component: ContatoPage,
  head: () => ({
    meta: [
      { title: "Contato · Meu Barão" },
      {
        name: "description",
        content:
          "Canal reservado da plataforma Meu Barão. Suporte técnico, assinaturas, privacidade e parcerias atendidos com discrição.",
      },
      { property: "og:title", content: "Contato · Meu Barão" },
      {
        property: "og:description",
        content: "Um canal discreto e profissional para falar com a equipe do Meu Barão.",
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
          <Link to="/planos" className="hover:text-foreground transition-colors">
            Planos
          </Link>
          <Link to="/contato" className="text-foreground transition-colors">
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

const CONTACT_TYPES = [
  { value: "suporte", label: "Suporte técnico" },
  { value: "assinaturas", label: "Assinaturas e pagamentos" },
  { value: "privacidade", label: "Privacidade e dados" },
  { value: "duvidas", label: "Dúvidas gerais" },
  { value: "parcerias", label: "Parcerias" },
  { value: "imprensa", label: "Imprensa" },
];

function Hero() {
  return (
    <section className="relative min-h-[80vh] w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <img
          src={silk}
          alt=""
          className="h-full w-full object-cover opacity-40 animate-slow-zoom"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-background" />
        <div className="fog" />
      </div>
      <Particles count={22} />
      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6 pt-32 pb-20 text-center lg:px-10">
        <Reveal delay={150}>
          <div className="mb-8 inline-flex items-center gap-3 rounded-full glass px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              Canal Reservado
            </span>
          </div>
        </Reveal>
        <Reveal delay={400}>
          <h1 className="serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl text-foreground max-w-3xl">
            Algumas conversas pedem
            <br />
            <span className="gold-text italic">a porta certa.</span>
          </h1>
        </Reveal>
        <Reveal delay={700}>
          <p className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground font-light leading-relaxed">
            Este é o canal institucional do Meu Barão. Aqui respondem nossos colaboradores —
            assuntos operacionais, comerciais e de privacidade são tratados com a mesma discrição
            que envolve toda a plataforma.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      contact_type: String(fd.get("contact_type") || ""),
      message: String(fd.get("message") || "").trim(),
      website: String(fd.get("website") || ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        if (res.status === 429) {
          setErrorMsg(
            data.message ??
              "Recebemos muitas solicitações deste endereço. Aguarde um instante e tente novamente.",
          );
        } else if (res.status === 400) {
          setErrorMsg("Verifique os campos preenchidos e tente novamente.");
        } else {
          setErrorMsg(
            "Não foi possível registrar sua mensagem agora. Tente novamente em instantes.",
          );
        }
        setStatus("error");
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setErrorMsg("Falha de conexão. Tente novamente em instantes.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Reveal>
        <div className="glass rounded-2xl p-10 md:p-14 text-center animate-pulse-aura">
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
            Mensagem recebida
          </p>
          <h3 className="mt-6 serif text-3xl md:text-4xl gold-text">
            Sua mensagem encontrou o lugar certo.
          </h3>
          <p className="mt-6 text-muted-foreground font-light leading-relaxed max-w-xl mx-auto">
            A equipe do Meu Barão analisará seu contato com atenção e discrição. Você receberá um
            retorno no e-mail informado, normalmente em até 48 horas úteis.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="btn-ghost mt-10 text-[10px]"
          >
            Enviar outra mensagem
          </button>
        </div>
      </Reveal>
    );
  }

  const fieldBase =
    "w-full bg-transparent border-0 border-b border-border focus:border-primary focus:outline-none px-0 py-3 text-base text-foreground placeholder:text-muted-foreground/60 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 md:p-12 space-y-10">
      {/* Honeypot — hidden from users */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3"
          >
            Nome
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className={fieldBase}
            placeholder="Como podemos chamá-la"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3"
          >
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            className={fieldBase}
            placeholder="seu@email.com"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contact_type"
          className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3"
        >
          Tipo de contato
        </label>
        <select
          id="contact_type"
          name="contact_type"
          required
          defaultValue=""
          className={`${fieldBase} appearance-none cursor-pointer bg-background/40`}
        >
          <option value="" disabled>
            Selecione o assunto
          </option>
          {CONTACT_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3"
        >
          Mensagem
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          className={`${fieldBase} resize-none leading-relaxed`}
          placeholder="Conte-nos, com calma, o que precisa."
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-destructive-foreground/90 bg-destructive/15 border border-destructive/30 rounded-md px-4 py-3">
          {errorMsg}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-2">
        <p className="text-[11px] text-muted-foreground/80 font-light max-w-md leading-relaxed">
          Ao enviar, você concorda com nossa{" "}
          <Link to="/privacy" className="text-foreground/90 underline-offset-4 hover:underline">
            Política de Privacidade
          </Link>{" "}
          e{" "}
          <Link to="/terms" className="text-foreground/90 underline-offset-4 hover:underline">
            Termos de Uso
          </Link>
          .
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-gold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Enviando…" : "Enviar mensagem"}
        </button>
      </div>
    </form>
  );
}

function FormSection() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-10">
        <Reveal>
          <div className="divider-ornament mb-12">Formulário</div>
        </Reveal>
        <Reveal delay={200}>
          <ContactForm />
        </Reveal>
        <Reveal delay={400}>
          <p className="mt-10 text-center text-[11px] tracking-[0.3em] uppercase text-muted-foreground/70">
            Retorno em até 48 horas úteis
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function PrivacyNote() {
  return (
    <section className="relative py-20 md:py-28 border-t border-border/60">
      <div className="mx-auto max-w-3xl px-6 lg:px-10 text-center">
        <Reveal>
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">Discrição</p>
        </Reveal>
        <Reveal delay={200}>
          <h2 className="mt-6 serif text-3xl md:text-4xl leading-tight">
            Mensagens tratadas com <span className="gold-text italic">o devido cuidado</span>.
          </h2>
        </Reveal>
        <Reveal delay={400}>
          <p className="mt-8 text-muted-foreground font-light leading-relaxed">
            Adotamos medidas razoáveis de proteção, retenção limitada e acesso restrito à equipe
            responsável pelo seu chamado. O conteúdo enviado é utilizado apenas para responder ao
            seu contato e cumprir obrigações legais aplicáveis. Para detalhes completos, consulte
            nossa{" "}
            <Link to="/privacy" className="text-foreground/90 underline-offset-4 hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function WhatsAppNote() {
  return (
    <section className="relative py-20 md:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-10">
        <Reveal>
          <div className="glass rounded-2xl px-8 py-10 md:px-12 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
                Concierge operacional
              </p>
              <h3 className="mt-3 serif text-2xl md:text-3xl">
                Atendimento via WhatsApp <span className="gold-text">em breve</span>
              </h3>
              <p className="mt-3 text-sm text-muted-foreground font-light leading-relaxed max-w-xl">
                Em fase final de estruturação, nosso canal direto será dedicado a assuntos técnicos,
                comerciais e administrativos — conduzido pela equipe responsável, não pelo Barão.
              </p>
            </div>
            <span className="self-start md:self-auto text-[10px] tracking-[0.3em] uppercase text-muted-foreground/70 border border-border rounded-full px-4 py-2">
              Disponível em breve
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10 text-center text-[11px] tracking-[0.3em] uppercase text-muted-foreground/70">
      <div className="mx-auto max-w-4xl px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <span>© {new Date().getFullYear()} Meu Barão</span>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacidade
          </Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Termos
          </Link>
          <Link to="/planos" className="hover:text-foreground transition-colors">
            Planos
          </Link>
        </div>
      </div>
    </footer>
  );
}

function ContatoPage() {
  return (
    <div className="bg-background text-foreground">
      <Nav />
      <Hero />
      <FormSection />
      <PrivacyNote />
      <WhatsAppNote />
      <Footer />
    </div>
  );
}
