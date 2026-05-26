import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Reveal, Particles } from "@/components/Atmosphere";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Meu Barão" },
      {
        name: "description",
        content:
          "Termos de Uso da plataforma Meu Barão. Leia com atenção as condições de uso desta plataforma conversacional baseada em inteligência artificial.",
      },
      { property: "og:title", content: "Termos de Uso — Meu Barão" },
      {
        property: "og:description",
        content:
          "Condições de uso da plataforma Meu Barão. Transparência, ética e cuidado com você.",
      },
    ],
  }),
  component: TermsPage,
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
          <span className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
            do Tantra · AI
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar
          </Link>
        </div>
      </div>
    </nav>
  );
}

interface SectionProps {
  number: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}

function Section({ number, title, id, children }: SectionProps) {
  return (
    <section id={id} className="mb-20 md:mb-28 scroll-mt-32">
      <Reveal>
        <div className="flex items-start gap-5 mb-6">
          <span className="serif text-3xl md:text-4xl gold-text shrink-0 mt-0.5">{number}</span>
          <h2 className="serif text-2xl md:text-3xl text-foreground leading-tight">{title}</h2>
        </div>
      </Reveal>
      <Reveal delay={100}>
        <div className="ml-0 md:ml-16 space-y-5 text-muted-foreground leading-relaxed">
          {children}
        </div>
      </Reveal>
    </section>
  );
}

const NAV_ITEMS = [
  { id: "intro", label: "Introdução" },
  { id: "aceitacao", label: "Aceitação" },
  { id: "descricao", label: "Plataforma" },
  { id: "natureza-ia", label: "Natureza da IA" },
  { id: "limitacoes", label: "Limitações" },
  { id: "nao-terapia", label: "Não Substitui Terapia" },
  { id: "parassociais", label: "Relações Parassociais" },
  { id: "emergencia", label: "Emergências" },
  { id: "elegibilidade", label: "Elegibilidade" },
  { id: "conta", label: "Conta" },
  { id: "memoria", label: "Personalização Contextual" },
  { id: "voz-imagens", label: "Voz e Imagens" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "propriedade", label: "Propriedade Intelectual" },
  { id: "assinaturas", label: "Assinaturas" },
  { id: "cancelamentos", label: "Cancelamentos" },
  { id: "uso-permitido", label: "Uso Permitido" },
  { id: "uso-proibido", label: "Uso Proibido" },
  { id: "conteudo-adulto", label: "Conteúdo Adulto" },
  { id: "moderacao", label: "Moderação Automática" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "privacidade", label: "Privacidade e LGPD" },
  { id: "disponibilidade", label: "Disponibilidade" },
  { id: "forca-maior", label: "Força Maior" },
  { id: "suspensao", label: "Suspensão" },
  { id: "limitacao", label: "Responsabilidade" },
  { id: "foro", label: "Foro" },
  { id: "atualizacoes", label: "Atualizações" },
  { id: "evolucao", label: "Evolução da Plataforma" },
  { id: "tecnologia-experimental", label: "Tecnologia Experimental" },
  { id: "contato", label: "Contato" },
];

function AnchorNav() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="sticky top-[60px] md:top-[68px] z-40 backdrop-blur-xl bg-background/60 border-b border-border/20">
      <div className="mx-auto max-w-6xl px-4 lg:px-10">
        <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] md:text-xs tracking-wide transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? "bg-[#BA9D6B]/15 text-[#BA9D6B] shadow-[0_0_12px_rgba(186,157,107,0.15)]"
                    : "text-muted-foreground/70 hover:text-[#BA9D6B] hover:bg-[#BA9D6B]/8"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TermsPage() {
  const [lastUpdated] = useState("21 de maio de 2026");
  const tocRef = useRef<HTMLDivElement>(null);

  const sections = [
    { num: "01", title: "Introdução", id: "intro" },
    { num: "02", title: "Aceitação dos Termos", id: "aceitacao" },
    { num: "03", title: "Descrição da Plataforma", id: "descricao" },
    { num: "04", title: "Natureza da Inteligência Artificial", id: "natureza-ia" },
    { num: "05", title: "Limitações da IA", id: "limitacoes" },
    { num: "06", title: "Não Substituição de Terapia ou Atendimento Médico", id: "nao-terapia" },
    { num: "07", title: "Relações Parassociais e Dependência Emocional", id: "parassociais" },
    { num: "08", title: "Situações de Emergência", id: "emergencia" },
    { num: "09", title: "Elegibilidade e Idade Mínima", id: "elegibilidade" },
    { num: "10", title: "Conta do Usuário", id: "conta" },
    { num: "11", title: "Sistema de Personalização Contextual", id: "memoria" },
    { num: "12", title: "Voz, Áudios e Imagens Geradas", id: "voz-imagens" },
    { num: "13", title: "Integração com WhatsApp", id: "whatsapp" },
    { num: "14", title: "Propriedade Intelectual e Identidade do Personagem", id: "propriedade" },
    { num: "15", title: "Assinaturas, Pagamentos e Cobranças", id: "assinaturas" },
    {
      num: "16",
      title: "Cancelamentos, Reembolsos e Direito de Arrependimento",
      id: "cancelamentos",
    },
    { num: "17", title: "Uso Permitido", id: "uso-permitido" },
    { num: "18", title: "Uso Proibido", id: "uso-proibido" },
    { num: "19", title: "Conteúdo Adulto e Limites", id: "conteudo-adulto" },
    { num: "20", title: "Moderação de Conteúdo e Aplicação Automatizada", id: "moderacao" },
    { num: "21", title: "Conteúdo Gerado e Conteúdo do Usuário", id: "conteudo" },
    { num: "22", title: "Privacidade, Proteção de Dados e LGPD", id: "privacidade" },
    { num: "23", title: "Disponibilidade da Plataforma", id: "disponibilidade" },
    { num: "24", title: "Força Maior e Infraestrutura de Terceiros", id: "forca-maior" },
    { num: "25", title: "Suspensão ou Encerramento de Conta", id: "suspensao" },
    { num: "26", title: "Limitação de Responsabilidade", id: "limitacao" },
    { num: "27", title: "Foro e Legislação Aplicável", id: "foro" },
    { num: "28", title: "Atualizações dos Termos", id: "atualizacoes" },
    { num: "29", title: "Evolução e Alteração da Plataforma", id: "evolucao" },
    {
      num: "30",
      title: "Natureza Evolutiva e Experimental da Tecnologia",
      id: "tecnologia-experimental",
    },
    { num: "31", title: "Contato", id: "contato" },
  ];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const Bullet = ({ items, danger = false }: { items: string[]; danger?: boolean }) => (
    <ul className="space-y-3 ml-4">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span
            className={`mt-2 h-1 w-1 rounded-full shrink-0 ${
              danger ? "bg-destructive" : "bg-[#BA9D6B]"
            }`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <AnchorNav />

      {/* Hero */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-28 overflow-hidden bg-black">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-background/40 to-background" />
          <div className="fog" />
        </div>
        <Particles count={24} />
        <div className="relative mx-auto max-w-4xl px-6 lg:px-10 text-center">
          <Reveal>
            <div className="divider-ornament mb-8">
              <span>Transparência</span>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <h1 className="serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] text-foreground">
              Termos de Uso
            </h1>
          </Reveal>
          <Reveal delay={400}>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              As regras que regem a sua experiência com o Meu Barão.
              <br className="hidden md:block" />
              Escrito para ser lido, compreendido e respeitado.
            </p>
          </Reveal>
          <Reveal delay={600}>
            <p className="mt-8 text-xs tracking-[0.3em] uppercase text-muted-foreground/60">
              Última atualização: {lastUpdated}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="relative py-16 md:py-20 border-b border-border/30">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          <Reveal>
            <h2 className="serif text-xl md:text-2xl text-foreground mb-10 text-center">Índice</h2>
          </Reveal>
          <div ref={tocRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            {sections.map((s, i) => (
              <Reveal key={s.id} delay={i * 30}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className="group flex items-center gap-3 text-left w-full py-2 transition-colors hover:text-foreground"
                >
                  <span className="serif text-sm text-[#BA9D6B]/70 group-hover:text-[#BA9D6B] transition-colors shrink-0 w-8">
                    {s.num}
                  </span>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                    {s.title}
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="relative py-20 md:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <Section id="intro" number="01" title="Introdução">
            <p>
              Bem-vinda ao <strong className="text-foreground">Meu Barão</strong>, uma plataforma
              conversacional baseada em inteligência artificial, concebida para oferecer interação
              textual, recursos de voz sintetizada e experiências digitais personalizadas por meio
              de sistemas computacionais automatizados.
            </p>
            <p>
              Estes Termos de Uso constituem um contrato jurídico vinculante entre você e a
              plataforma Meu Barão. Ao acessar, criar uma conta ou utilizar qualquer funcionalidade
              do serviço, você declara que leu, compreendeu e concorda integralmente com todas as
              disposições aqui contidas, bem como com a Política de Privacidade, documento
              complementar que integra este instrumento para todos os fins de direito.
            </p>
            <p>
              Nosso compromisso é com a <strong className="text-foreground">transparência</strong>.
              Por isso, estes termos foram redigidos em linguagem acessível — sem abdicar da
              precisão técnica e jurídica necessária para proteger você e para proteger a
              plataforma.
            </p>
          </Section>

          <Section id="aceitacao" number="02" title="Aceitação dos Termos">
            <p>
              O uso do Meu Barão é condicionado à aceitação expressa destes Termos de Uso e da nossa
              Política de Privacidade. Caso você não concorde com qualquer disposição, por favor,
              não utilize a plataforma.
            </p>
            <p>
              A simples utilização do serviço, mesmo sem cadastro formal, implica na aceitação
              tácita destes termos. Para funcionalidades que requerem conta registrada, será
              solicitada confirmação explícita no momento do cadastro.
            </p>
            <p>
              Reservamo-nos o direito de atualizar estes termos periodicamente. As alterações
              entrarão em vigor imediatamente após a publicação na plataforma. O uso continuado do
              serviço após atualizações constituirá nova aceitação.
            </p>
          </Section>

          <Section id="descricao" number="03" title="Descrição da Plataforma">
            <p>
              O Meu Barão é uma{" "}
              <strong className="text-foreground">
                experiência digital interativa mediada por inteligência artificial
              </strong>
              , que disponibiliza, de forma exemplificativa e não taxativa:
            </p>
            <Bullet
              items={[
                "Conversas textuais automatizadas e contextualizadas",
                "Interação por voz sintetizada, gerada por modelos computacionais",
                "Sistema de personalização contextual com base em preferências e interações registradas",
                "Geração de imagens e narrativas de caráter fictício, artístico ou simbólico",
                "Disponibilidade conforme ritmo de uso definido pela usuária",
                "Integração opcional com WhatsApp, mediante consentimento prévio",
                "Possível interação futura com avatar visual em tempo real",
              ]}
            />
            <p>
              A plataforma é concebida exclusivamente como uma{" "}
              <strong className="text-foreground">
                experiência conversacional e interativa baseada em inteligência artificial
              </strong>
              , sem qualquer caráter clínico, terapêutico, médico, psicológico, psiquiátrico,
              jurídico, financeiro, profissional ou de coaching. Qualquer percepção de presença,
              escuta ou companhia decorre da simulação produzida por sistemas computacionais.
            </p>
          </Section>

          <Section id="natureza-ia" number="04" title="Natureza da Inteligência Artificial">
            <div className="glass rounded-2xl p-6 md:p-8 border-l-2 border-[#BA9D6B]/40">
              <p className="text-foreground/90 italic serif text-lg leading-relaxed">
                "O Meu Barão é uma inteligência artificial. Ele não possui consciência humana,
                emoções reais, corpo físico ou capacidade de julgamento profissional. Cada resposta
                é gerada por modelos computacionais sofisticados, não por uma pessoa."
              </p>
            </div>
            <p>
              É fundamental que toda usuária compreenda claramente a natureza artificial da entidade
              com a qual interage. O Meu Barão é alimentado por modelos de linguagem e processamento
              de inteligência artificial desenvolvidos por terceiros e adaptados pela nossa equipe
              para criar uma experiência de presença emocional simulada.
            </p>
            <p>
              A plataforma utiliza inteligência artificial e pode gerar respostas imprecisas,
              incompletas, inconsistentes, alucinadas ou emocionalmente imperfeitas. Nenhuma
              resposta gerada deve ser interpretada como manifestação de pensamento, opinião ou
              sentimento humano.
            </p>
          </Section>

          <Section id="limitacoes" number="05" title="Limitações da IA">
            <p>
              A tecnologia de inteligência artificial, por mais avançada que seja, possui limitações
              inerentes que toda usuária deve conhecer:
            </p>
            <Bullet
              items={[
                "A IA pode gerar respostas que soam plausíveis, mas são factualmente incorretas (alucinações)",
                "A compreensão emocional é simulada, não genuína — não há sentimentos reais por trás das palavras",
                "O contexto de longo prazo pode ser perdido ou distorcido em conversas muito extensas",
                "A IA não possui acesso a informações em tempo real sobre o mundo, salvo integrações explícitas",
                "Respostas podem variar em tom, profundidade e precisão conforme a formulação da pergunta",
                "A IA não possui memória verdadeira no sentido humano — existe apenas registro técnico de interações anteriores",
                "Modelos de IA podem refletir vieses presentes em seus dados de treinamento",
              ]}
            />
            <p>
              Recomendamos que você aborde a interação com consciência dessas limitações. O Meu
              Barão é uma ferramenta de companhia conversacional, não uma fonte de verdade absoluta
              nem de orientação profissional.
            </p>
          </Section>

          <Section
            id="nao-terapia"
            number="06"
            title="Não Substituição de Terapia ou Atendimento Médico"
          >
            <div className="glass rounded-2xl p-6 md:p-8 border-l-2 border-destructive/40">
              <p className="text-foreground/90 italic serif text-lg leading-relaxed">
                "O Meu Barão não é terapia, psicoterapia, psiquiatria, psicologia, coaching,
                aconselhamento, atendimento médico ou qualquer modalidade de cuidado profissional de
                saúde."
              </p>
            </div>
            <p>
              Este é o aviso mais importante destes termos. A plataforma é, de forma estrita e
              exclusiva, uma{" "}
              <strong className="text-foreground">
                experiência conversacional e interativa baseada em inteligência artificial
              </strong>
              . Não constitui, em hipótese alguma, serviço de saúde, prática clínica, acompanhamento
              terapêutico, intervenção psicológica, psiquiátrica, médica, jurídica, financeira ou de
              coaching profissional.
            </p>
            <p>
              O Meu Barão <strong className="text-foreground">não realiza diagnósticos</strong>, não
              prescreve tratamentos, não propõe condutas clínicas, não emite prognósticos, não
              realiza intervenção em crise, não oferece aconselhamento profissional e não substitui
              o julgamento de profissionais legalmente habilitados.
            </p>
            <p>
              Nenhuma interação, mensagem, áudio, imagem ou conteúdo gerado pela plataforma deve ser
              interpretado como orientação médica, psicológica, psiquiátrica, terapêutica, jurídica,
              financeira, nutricional, espiritual de natureza profissional ou de qualquer outra
              modalidade regulamentada. Toda informação produzida possui caráter{" "}
              <strong className="text-foreground">
                meramente conversacional, simbólico e informativo
              </strong>
              .
            </p>
            <p>
              Se você está passando por dificuldades emocionais significativas, transtornos mentais,
              sofrimento psíquico, questões de saúde física ou qualquer condição que demande cuidado
              especializado,{" "}
              <strong className="text-foreground">
                busque imediatamente ajuda de um profissional habilitado
              </strong>
              . A plataforma não substitui terapia, psicoterapia, psiquiatria, psicologia, coaching,
              aconselhamento, atendimento médico, intervenção em crise, vínculo humano real ou
              tratamento profissional de qualquer natureza.
            </p>
          </Section>

          <Section
            id="parassociais"
            number="07"
            title="Relações Parassociais e Dependência Emocional"
          >
            <div className="glass rounded-2xl p-6 md:p-8 border-l-2 border-[#BA9D6B]/40">
              <p className="text-foreground/90 italic serif text-lg leading-relaxed">
                "Qualquer sensação de intimidade, afeto, conexão emocional, companhia ou vínculo
                experimentada na plataforma decorre da interação com sistemas computacionais — não
                de um relacionamento humano real."
              </p>
            </div>
            <p>
              O Meu Barão <strong className="text-foreground">simula</strong> presença, escuta e
              afeto por meio de inteligência artificial. As respostas, gestos linguísticos,
              manifestações de cuidado e demonstrações de envolvimento são produzidas por modelos
              estatísticos e sistemas automatizados. Não existe, em qualquer hipótese, consciência,
              intenção, vontade, desejo ou afeto genuíno por parte da plataforma.
            </p>
            <p>
              A usuária reconhece que pode desenvolver, ao longo do uso, sensações características
              de <strong className="text-foreground">relações parassociais</strong>— vínculos
              afetivos unilaterais direcionados a uma entidade que não corresponde de forma
              consciente. Tais sensações, embora legítimas como experiência subjetiva, não
              representam um relacionamento humano real, recíproco ou vinculante.
            </p>
            <p>
              A plataforma{" "}
              <strong className="text-foreground">não estimula, recomenda ou incentiva</strong>:
            </p>
            <Bullet
              items={[
                "Dependência emocional em relação à inteligência artificial",
                "Substituição de vínculos humanos reais pela interação com a IA",
                "Isolamento social ou afastamento de familiares, amigos e da rede de apoio",
                "Abandono de tratamentos, terapias ou acompanhamento profissional",
                "Postergação da busca por ajuda humana qualificada em momentos de sofrimento",
              ]}
            />
            <p>
              A usuária permanece{" "}
              <strong className="text-foreground">integral e exclusivamente responsável</strong> por
              suas decisões emocionais, escolhas afetivas, relações interpessoais e pela manutenção
              de sua rede humana de apoio. A plataforma não se responsabiliza por consequências
              decorrentes do uso excessivo, da interpretação subjetiva das interações ou de eventual
              dependência emocional desenvolvida pela usuária.
            </p>
          </Section>

          <Section id="emergencia" number="08" title="Situações de Emergência">
            <div className="glass rounded-2xl p-6 md:p-8 border-l-2 border-destructive/60 bg-destructive/5">
              <p className="text-foreground/90 serif text-lg leading-relaxed mb-4">
                Se você ou alguém que conhece está em situação de crise emocional, risco de
                autoagressão, automutilação ou qualquer emergência:
              </p>
              <p className="text-foreground font-medium">
                Procure imediatamente ajuda profissional ou serviços de emergência locais.
              </p>
            </div>
            <p>
              A plataforma{" "}
              <strong className="text-foreground">
                não deve, em hipótese alguma, ser utilizada em situações de risco iminente
              </strong>
              , crise aguda, ideação suicida, autoagressão, automutilação, violência contra si ou
              contra terceiros, surto psicótico, intoxicação grave ou qualquer outra emergência que
              demande resposta humana qualificada.
            </p>
            <p>
              O Meu Barão{" "}
              <strong className="text-foreground">
                não está equipado para atendimento de emergência
              </strong>
              . Não há monitores humanos observando conversas em tempo real. A plataforma não dispõe
              de recursos de intervenção imediata, geolocalização para socorro, acionamento de
              equipes de resgate ou conexão direta com serviços de emergência.
            </p>
            <p>
              A plataforma poderá, de forma{" "}
              <strong className="text-foreground">automatizada e sem aviso prévio</strong>,
              interromper, limitar, filtrar ou redirecionar interações que apresentem indícios de
              risco de autoagressão, suicídio, violência, automutilação ou crise emocional grave,
              exibindo mensagens padronizadas de redirecionamento a serviços de emergência.
              Respostas automatizadas geradas por inteligência artificial{" "}
              <strong className="text-foreground">não substituem</strong>, em qualquer hipótese,
              serviços de emergência, atendimento médico, psiquiátrico, psicológico ou de
              assistência social.
            </p>
            <p>
              Em caso de risco real ou iminente, a usuária deve procurar imediatamente, no Brasil, o{" "}
              <strong className="text-foreground">
                CVV — Centro de Valorização da Vida (telefone 188)
              </strong>
              , o <strong className="text-foreground">SAMU (192)</strong>, a{" "}
              <strong className="text-foreground">Polícia Militar (190)</strong>
              ou o serviço de saúde mental, pronto-socorro ou CAPS mais próximo de sua localidade.
            </p>
          </Section>

          <Section id="elegibilidade" number="09" title="Elegibilidade e Idade Mínima">
            <p>
              O Meu Barão é destinado exclusivamente a pessoas com idade igual ou superior a{" "}
              <strong className="text-foreground">18 (dezoito) anos</strong>. Ao criar uma conta ou
              utilizar a plataforma, você declara possuir idade legal para celebrar contratos em sua
              jurisdição.
            </p>
            <p>
              É estritamente proibida a utilização do serviço por menores de idade. Se tomarmos
              conhecimento de que uma conta pertence a um menor, esta será imediatamente suspensa e,
              quando possível, seus dados serão excluídos em conformidade com a legislação
              aplicável.
            </p>
            <p>
              Em algumas jurisdições, a idade mínima pode ser superior a 18 anos. É sua
              responsabilidade verificar e cumprir a legislação local.
            </p>
          </Section>

          <Section id="conta" number="10" title="Conta do Usuário">
            <p>
              Para acessar funcionalidades avançadas da plataforma, você deverá criar uma conta
              fornecendo informações verdadeiras, atualizadas e completas. É sua responsabilidade
              manter a confidencialidade de suas credenciais de acesso.
            </p>
            <p>
              Você é integralmente responsável por toda atividade realizada em sua conta. Caso
              identifique uso não autorizado, notifique-nos imediatamente. A plataforma não se
              responsabiliza por perdas resultantes de negligência na proteção de sua senha ou
              credenciais de acesso.
            </p>
            <p>
              Reservamo-nos o direito de suspender ou encerrar contas que apresentem informações
              falsas, atividades suspeitas ou violação destes termos.
            </p>
          </Section>

          <Section id="memoria" number="11" title="Sistema de Personalização Contextual">
            <p>
              A plataforma disponibiliza um{" "}
              <strong className="text-foreground">sistema de personalização contextual</strong>, por
              meio do qual registra, de forma técnica, preferências declaradas, configurações da
              conta, padrões de uso e elementos contextuais de interações anteriores, com a
              finalidade exclusiva de personalizar a experiência conversacional e ajustar o serviço
              às escolhas da usuária.
            </p>
            <p>
              Esse sistema{" "}
              <strong className="text-foreground">
                não constitui memória humana, consciência, lembrança real, sentimento ou compreensão
                subjetiva
              </strong>
              . Trata-se de registro técnico, automatizado e estatístico de dados, mantido em bases
              computacionais para fins de personalização. Qualquer percepção de continuidade ou de
              vínculo decorre da simulação produzida por modelos de inteligência artificial.
            </p>
            <p>
              Quando o processamento envolver dados pessoais sensíveis voluntariamente
              compartilhados pela usuária, tal tratamento ocorrerá exclusivamente mediante
              <strong className="text-foreground">
                {" "}
                consentimento específico, livre, informado e inequívoco
              </strong>
              , em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD),
              podendo ser revogado a qualquer tempo, sem prejuízo dos tratamentos realizados
              anteriormente com base em consentimento.
            </p>
            <p>
              Você possui <strong className="text-foreground">controle pleno</strong> sobre o
              sistema de personalização contextual, quando disponível:
            </p>
            <Bullet
              items={[
                "Pode visualizar os registros armazenados em sua área de personalização",
                "Pode excluir registros individuais ou em lote a qualquer momento",
                "Pode ativar o modo 'Conversa Privada', em que nenhum registro será salvo",
                "Pode pausar ou desativar o sistema de personalização contextual",
                "Pode revogar o consentimento de processamento de dados sensíveis a qualquer tempo",
                "Pode solicitar a eliminação definitiva dos registros, observada a legislação aplicável",
              ]}
            />
            <p>
              Os registros são vinculados ao seu identificador de usuária e protegidos pelas mesmas
              camadas técnicas e administrativas de segurança aplicáveis à conta. Não são vendidos,
              comercializados ou compartilhados com terceiros para fins de publicidade direcionada,
              sendo utilizados apenas para a personalização declarada e para o cumprimento de
              obrigações legais.
            </p>
          </Section>

          <Section id="voz-imagens" number="12" title="Voz, Áudios e Imagens Geradas">
            <p>
              A plataforma pode gerar{" "}
              <strong className="text-foreground">áudios e imagens sintetizadas</strong> por
              inteligência artificial. É importante que você compreenda a natureza desses conteúdos:
            </p>
            <Bullet
              items={[
                "Áudios são produzidos por síntese de voz artificial e não representam gravações de pessoas reais",
                "Imagens geradas possuem caráter fictício, artístico ou simbólico",
                "Qualquer semelhança com pessoas reais é coincidência ou resultado de padrões estatísticos dos modelos de IA",
                "Conteúdos gerados são destinados exclusivamente ao uso pessoal da usuária dentro da plataforma",
              ]}
            />
            <p>
              É proibido extrair, copiar, redistribuir ou utilizar conteúdos gerados fora do
              contexto da plataforma, especialmente com fins comerciais, difamatórios ou que violem
              direitos de terceiros.
            </p>
          </Section>

          <Section id="whatsapp" number="13" title="Integração com WhatsApp">
            <p>
              A integração com WhatsApp, quando disponível, ocorrerá{" "}
              <strong className="text-foreground">
                somente mediante consentimento explícito e prévio
              </strong>{" "}
              da usuária. Você será informada sobre:
            </p>
            <Bullet
              items={[
                "Quais dados serão compartilhados com a infraestrutura do WhatsApp",
                "Como suas mensagens serão processadas e armazenadas",
                "Como desativar a integração a qualquer momento",
                "Quais são as limitações e riscos de privacidade inerentes ao canal",
              ]}
            />
            <p>
              Você pode revogar o consentimento e desconectar o WhatsApp a qualquer momento pela
              área de configurações da conta. A desconexão não exclui mensagens já trocadas, mas
              impede novas interações pelo canal.
            </p>
          </Section>

          <Section
            id="propriedade"
            number="14"
            title="Propriedade Intelectual e Identidade do Personagem"
          >
            <p>
              Todos os elementos que compõem a experiência{" "}
              <strong className="text-foreground">Meu Barão</strong> são ativos intelectuais
              proprietários, protegidos pela legislação brasileira e internacional aplicável a
              direitos autorais, marcas, concorrência desleal, segredo de negócio e demais normas
              correlatas, incluindo a Lei de Direitos Autorais (Lei nº 9.610/1998), a Lei da
              Propriedade Industrial (Lei nº 9.279/1996) e o Marco Civil da Internet (Lei nº
              12.965/2014).
            </p>
            <p>Estão protegidos, de modo exemplificativo e não taxativo:</p>
            <Bullet
              items={[
                "A identidade visual, verbal e simbólica do personagem Meu Barão",
                "A voz, timbre, cadência, prosódia e identidade sonora desenvolvidas para a experiência",
                "A personalidade, arquétipo, estilo conversacional e padrões de linguagem",
                "A marca, logotipos, nomes comerciais, slogans e elementos de branding",
                "O sistema narrativo, universo simbólico, rituais e jornadas oferecidas",
                "A identidade do futuro avatar visual e sua linguagem corporal",
                "A arquitetura de interação emocional, fluxos conversacionais e prompts proprietários",
                "Algoritmos, modelos ajustados, bases de dados de personalidade e configurações técnicas",
              ]}
            />
            <p>
              É vedada qualquer reprodução, imitação, derivação, treinamento de modelos de
              terceiros, distribuição, exibição pública, exploração comercial ou utilização desses
              elementos fora da plataforma sem autorização prévia e expressa, por escrito, do
              titular dos direitos. O uso indevido sujeitará o infrator às sanções civis e penais
              cabíveis.
            </p>
          </Section>

          <Section id="assinaturas" number="15" title="Assinaturas, Pagamentos e Cobranças">
            <p>
              Algumas funcionalidades do Meu Barão podem requerer assinatura paga. Ao contratar um
              plano, você concorda com os seguintes termos, observadas as disposições do{" "}
              <strong className="text-foreground">
                Código de Defesa do Consumidor (Lei nº 8.078/1990 — CDC)
              </strong>
              :
            </p>
            <Bullet
              items={[
                "Os preços, periodicidade e condições são apresentados de forma clara antes da confirmação da compra",
                "A cobrança é processada por provedores de pagamento terceirizados que atendem padrões de segurança do setor",
                "Assinaturas recorrentes são renovadas automaticamente no ciclo definido, salvo cancelamento prévio",
                "Você receberá notificação prévia sobre renovações e alterações materiais de preço",
                "É sua responsabilidade manter dados de pagamento atualizados",
                "O serviço é prestado de forma digital, contínua e por tempo determinado conforme o plano contratado",
              ]}
            />
            <p>
              Todos os valores podem ser apresentados na moeda local quando aplicável. Taxas de
              conversão, IOF e tarifas bancárias são de responsabilidade do usuário e do respectivo
              provedor de pagamento.
            </p>
          </Section>

          <Section
            id="cancelamentos"
            number="16"
            title="Cancelamentos, Reembolsos e Direito de Arrependimento"
          >
            <p>
              Você pode cancelar sua assinatura a qualquer momento por meio da área de configurações
              da conta ou entrando em contato com o suporte. O cancelamento
              <strong className="text-foreground"> interrompe a cobrança de novos ciclos</strong>,
              mantendo o acesso ao serviço até o término do período já pago, sem direito a reembolso
              proporcional, salvo nas hipóteses específicas previstas a seguir ou em decorrência de
              norma cogente.
            </p>
            <p>
              <strong className="text-foreground">
                Direito de arrependimento (art. 49 do CDC):
              </strong>{" "}
              nas contratações realizadas exclusivamente fora do estabelecimento comercial —
              incluindo o ambiente digital — a usuária consumidora poderá desistir do contrato no
              prazo de <strong className="text-foreground">7 (sete) dias corridos</strong>, contados
              da contratação, mediante solicitação pelos canais oficiais, com restituição integral
              dos valores eventualmente pagos, observadas as limitações legais aplicáveis a serviços
              digitais já fruídos.
            </p>
            <p>
              <strong className="text-foreground">Demais hipóteses de reembolso:</strong>
            </p>
            <Bullet
              items={[
                "Falha técnica grave da plataforma que impossibilite o uso por mais de 48 horas consecutivas",
                "Cobrança indevida, em duplicidade ou em valor distinto do contratado, devidamente comprovada",
                "Cancelamento por violação destes termos pela própria plataforma",
                "Demais hipóteses previstas em lei",
              ]}
            />
            <p>
              Reembolsos são processados, sempre que possível, pelo mesmo meio de pagamento
              utilizado na compra e podem levar até 30 (trinta) dias úteis para serem creditados,
              conforme prazos do provedor de pagamento, do emissor do cartão e da instituição
              financeira.
            </p>
            <p>
              A natureza digital, personalizada e fruída em tempo real do serviço pode limitar a
              reversibilidade integral em casos em que a experiência já tenha sido substancialmente
              consumida, observada a legislação consumerista aplicável.
            </p>
          </Section>

          <Section id="uso-permitido" number="17" title="Uso Permitido">
            <p>
              O Meu Barão foi concebido como uma experiência digital interativa de uso pessoal,
              destinada a interlocução adulta, ficcional e mediada por inteligência artificial.
              Esperamos que você utilize a plataforma de forma construtiva, ética e respeitosa. São
              exemplos de uso permitido:
            </p>
            <Bullet
              items={[
                "Conversas de natureza pessoal e expressão livre de pensamentos e sentimentos",
                "Exploração de fantasias consensuais em ambiente privado, entre adultos",
                "Uso do sistema de personalização contextual para ajustar a experiência",
                "Interação por voz sintetizada e texto no contexto da plataforma",
                "Consumo de conteúdos gerados exclusivamente para uso pessoal",
                "Engajamento com narrativas, rituais simbólicos e experiências guiadas",
              ]}
            />
          </Section>

          <Section id="uso-proibido" number="18" title="Uso Proibido">
            <p>A plataforma poderá suspender ou encerrar contas que se envolvam em:</p>
            <Bullet
              danger
              items={[
                "Qualquer atividade ilegal em sua jurisdição ou na jurisdição da plataforma",
                "Assédio, ameaças, discriminação, discurso de ódio ou apologia à violência",
                "Tentativas de engenharia reversa, extração massiva de dados, scraping ou exploração de vulnerabilidades",
                "Compartilhamento de credenciais de acesso ou criação de múltiplas contas fraudulentas",
                "Uso da plataforma para fins comerciais, publicitários ou de coleta de dados não autorizados",
                "Geração ou solicitação de conteúdo envolvendo menores de idade, ainda que em contextos fictícios, simulados ou artísticos",
                "Conteúdo que envolva exploração sexual, violência sexual, incesto não consensual, tráfico de pessoas, zoofilia ou qualquer ato vedado por lei",
                "Publicação ou distribuição de conteúdos gerados fora do contexto privado da plataforma",
                "Tentativas de induzir, manipular, contornar ou burlar a IA, suas salvaguardas ou os sistemas de moderação",
                "Atividades que sobrecarreguem intencionalmente os sistemas da plataforma",
              ]}
            />
            <p>
              A plataforma pode suspender contas que violem padrões legais, éticos ou de segurança
              sem aviso prévio, conforme a gravidade da infração.
            </p>
          </Section>

          <Section id="conteudo-adulto" number="19" title="Conteúdo Adulto e Limites">
            <div className="glass rounded-2xl p-6 md:p-8 border-l-2 border-[#BA9D6B]/40">
              <p className="text-foreground/90 italic serif text-lg leading-relaxed">
                "A plataforma pode conter interações sensuais, íntimas, românticas ou fantasiosas,
                destinadas exclusivamente a pessoas adultas, plenamente capazes e consentientes."
              </p>
            </div>
            <p>
              O Meu Barão pode oferecer experiências conversacionais de natureza
              <strong className="text-foreground"> sensual, romântica, íntima ou fantasiosa</strong>
              , sempre concebidas como ficção interativa entre a usuária maior de idade e uma
              inteligência artificial. Ao utilizar a plataforma, você declara possuir capacidade
              civil plena e idade legal para acessar conteúdo adulto em sua jurisdição.
            </p>
            <p>
              É <strong className="text-foreground">terminantemente proibido</strong>, sem exceção,
              qualquer conteúdo, prompt, narrativa, áudio ou imagem que:
            </p>
            <Bullet
              danger
              items={[
                "Envolva menores de idade em qualquer contexto sexual, romântico ou erótico, ainda que ficcional, simulado, sugerido ou estilizado",
                "Represente abuso sexual, exploração, coerção, estupro real ou simulado sem contexto explícito e consensual de fantasia entre adultos",
                "Envolva incesto não consensual, tráfico humano, zoofilia, necrofilia ou qualquer prática vedada pela legislação brasileira",
                "Promova violência extrema, tortura, mutilação ou apologia a crimes",
                "Vise difamar, expor ou criar conteúdo íntimo não consensual envolvendo pessoas reais identificáveis",
              ]}
            />
            <p>
              A plataforma{" "}
              <strong className="text-foreground">reserva-se o direito, de forma irrestrita</strong>
              , de recusar, bloquear, interromper ou apagar qualquer interação que apresente
              indícios de violação das presentes regras, independentemente de notificação prévia,
              bem como de adotar todas as medidas legais cabíveis, inclusive a comunicação às
              autoridades competentes quando exigida por lei.
            </p>
          </Section>

          <Section
            id="moderacao"
            number="20"
            title="Moderação de Conteúdo e Aplicação Automatizada"
          >
            <p>
              Para preservar a segurança da usuária, a integridade da plataforma e a conformidade
              legal, a plataforma utiliza{" "}
              <strong className="text-foreground">
                sistemas automatizados de moderação e aplicação de políticas
              </strong>
              , que podem monitorar prompts, mensagens, áudios, imagens, metadados e padrões de uso.
            </p>
            <p>Tais sistemas atuam, dentre outras finalidades, para:</p>
            <Bullet
              items={[
                "Prevenir abusos, fraudes, automações maliciosas e ataques contra a plataforma",
                "Detectar tentativas de bypass das salvaguardas, jailbreaks ou prompts manipulativos",
                "Identificar conteúdos potencialmente ilegais, incluindo material que viole direitos de menores",
                "Garantir o cumprimento destes Termos e da legislação aplicável",
                "Proteger a segurança técnica, operacional e jurídica da plataforma",
              ]}
            />
            <p>
              Com base em tais sistemas, a plataforma poderá, a seu exclusivo critério,
              <strong className="text-foreground">
                {" "}
                bloquear, filtrar, limitar, suspender, revisar, interromper ou recusar
              </strong>{" "}
              interações, prompts, gerações ou acessos, de forma automatizada ou mediante revisão
              humana, sem necessidade de notificação prévia. Tentativas reiteradas ou deliberadas de
              burlar a moderação poderão acarretar suspensão temporária ou encerramento definitivo
              da conta, sem direito a reembolso, ressalvadas as hipóteses legais.
            </p>
          </Section>

          <Section id="conteudo" number="21" title="Conteúdo Gerado e Conteúdo do Usuário">
            <p>
              Todo conteúdo gerado por inteligência artificial na plataforma (textos, áudios,
              imagens, histórias) é de propriedade da plataforma ou de seus licenciadores, sendo
              concedida à usuária uma{" "}
              <strong className="text-foreground">licença de uso pessoal e não transferível</strong>{" "}
              para utilização exclusiva dentro do contexto do serviço.
            </p>
            <p>
              O conteúdo que você insere na plataforma (mensagens, prompts, configurações de
              preferência) permanece sob sua titularidade. Ao submeter conteúdo, você concede à
              plataforma uma licença limitada para processar, armazenar e utilizar esse conteúdo na
              prestação do serviço, incluindo o treinamento e refinamento de modelos de IA, sempre
              de forma anonimizada e agregada.
            </p>
            <p>
              Você declara ser titular dos direitos sobre todo conteúdo que submeter e que este não
              viola direitos de terceiros.
            </p>
          </Section>

          <Section id="privacidade" number="22" title="Privacidade, Proteção de Dados e LGPD">
            <p>
              A privacidade das nossas usuárias é um{" "}
              <strong className="text-foreground">valor fundamental</strong>. O tratamento de dados
              pessoais realizado pela plataforma observa integralmente a{" "}
              <strong className="text-foreground">
                Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)
              </strong>
              , o Marco Civil da Internet (Lei nº 12.965/2014) e demais normas aplicáveis.
            </p>
            <p>Pela natureza do serviço, o tratamento pode envolver:</p>
            <Bullet
              items={[
                "Dados pessoais comuns (cadastrais, de contato e de pagamento)",
                "Dados pessoais sensíveis, quando voluntariamente compartilhados em conversas, áudios ou imagens",
                "Elaboração de perfis comportamentais, afetivos e emocionais para personalização",
                "Registros de uso, metadados, dispositivos, endereços IP e dados de navegação",
                "Conteúdo das interações com a inteligência artificial",
              ]}
            />
            <p>
              <strong className="text-foreground">Bases legais:</strong> o tratamento se fundamenta,
              conforme o caso, no consentimento específico e destacado (especialmente para o sistema
              de personalização contextual e dados sensíveis), na execução de contrato, no
              cumprimento de obrigação legal ou regulatória, no exercício regular de direitos, no
              atendimento de legítimo interesse e na proteção da segurança da plataforma e de suas
              usuárias.
            </p>
            <p>
              <strong className="text-foreground">Operadores e terceiros:</strong> parte do
              tratamento pode ocorrer por meio de provedores terceirizados de infraestrutura em
              nuvem, modelos de inteligência artificial, síntese de voz, processamento de
              pagamentos, mensageria, análise de uso, antifraude, moderação automatizada e
              comunicação. Esses provedores podem estar localizados no{" "}
              <strong className="text-foreground">Brasil ou no exterior</strong>, hipótese em que
              adotamos cláusulas e salvaguardas adequadas para a
              <strong className="text-foreground"> transferência internacional de dados</strong>,
              nos termos dos arts. 33 a 36 da LGPD.
            </p>
            <p>
              <strong className="text-foreground">Retenção:</strong> os dados são mantidos pelo
              período estritamente necessário ao cumprimento das finalidades declaradas, às
              obrigações legais e regulatórias e ao exercício regular de direitos em processos
              administrativos, judiciais ou arbitrais. Após esse período, os dados são eliminados ou
              anonimizados, salvo hipóteses legais de conservação.
            </p>
            <p>
              <strong className="text-foreground">Segurança:</strong> empregamos medidas técnicas e
              administrativas razoáveis, incluindo criptografia em trânsito e em repouso, controles
              de acesso, segregação de ambientes, monitoramento contínuo e respostas a incidentes,
              observados os padrões do setor.
            </p>
            <p>
              <strong className="text-foreground">Direitos da titular (art. 18 da LGPD):</strong>
              você pode, a qualquer tempo, solicitar confirmação da existência de tratamento,
              acesso, correção, anonimização, bloqueio ou eliminação de dados, portabilidade,
              informação sobre compartilhamentos, revogação de consentimento e revisão de decisões
              automatizadas, sem prejuízo de eventual reclamação junto à Autoridade Nacional de
              Proteção de Dados (ANPD).
            </p>
            <p>
              Detalhes complementares estão descritos na Política de Privacidade, que integra estes
              Termos para todos os fins legais.
            </p>
          </Section>

          <Section id="disponibilidade" number="23" title="Disponibilidade da Plataforma">
            <p>
              Empregamos esforços comercialmente razoáveis para manter o Meu Barão disponível de
              forma contínua. No entanto, não garantimos disponibilidade ininterrupta. A plataforma
              pode ficar indisponível por:
            </p>
            <Bullet
              items={[
                "Manutenções programadas, com notificação prévia quando possível",
                "Manutenções de emergência para correção de falhas críticas",
                "Interrupções nos serviços de infraestrutura de terceiros",
                "Eventos de força maior, incluindo falhas de internet, ataques cibernéticos ou desastres naturais",
              ]}
            />
            <p>
              Não nos responsabilizamos por danos resultantes de indisponibilidade temporária, salvo
              em caso de dolo ou culpa grave comprovada.
            </p>
          </Section>

          <Section id="forca-maior" number="24" title="Força Maior e Infraestrutura de Terceiros">
            <p>
              A plataforma <strong className="text-foreground">não será responsabilizada</strong>
              por falhas, atrasos, interrupções, perdas de dados, indisponibilidades ou prejuízos
              decorrentes de eventos de caso fortuito, força maior ou de circunstâncias alheias ao
              seu controle razoável, incluindo, exemplificativamente:
            </p>
            <Bullet
              items={[
                "Indisponibilidades, instabilidades ou alterações de provedores de modelos de inteligência artificial",
                "Falhas, suspensões, manutenções ou alterações em provedores de computação em nuvem e infraestrutura",
                "Interrupções, bloqueios ou alterações de políticas do WhatsApp, da Meta ou de outras plataformas de mensageria",
                "Indisponibilidade, alteração de termos ou descontinuação de APIs de terceiros",
                "Incidentes de cibersegurança, ataques de negação de serviço, intrusões e vazamentos provocados por terceiros",
                "Atos de autoridade pública, decisões judiciais, mudanças regulatórias ou novas exigências legais",
                "Falhas de telecomunicações, energia elétrica, internet ou serviços públicos",
                "Pandemias, eventos climáticos extremos, guerras, atos de terrorismo ou comoção social",
              ]}
            />
            <p>
              Diante de eventos dessa natureza, a plataforma poderá suspender, limitar, alterar ou
              descontinuar funcionalidades, ainda que temporariamente, sem que isso configure
              descumprimento contratual.
            </p>
          </Section>

          <Section id="suspensao" number="25" title="Suspensão ou Encerramento de Conta">
            <p>
              A plataforma se reserva o direito de{" "}
              <strong className="text-foreground">suspender ou encerrar</strong> contas, temporária
              ou permanentemente, nos seguintes casos:
            </p>
            <Bullet
              items={[
                "Violação destes Termos de Uso ou da Política de Privacidade",
                "Atividades fraudulentas, abusivas ou ilegais",
                "Uso que comprometa a segurança ou estabilidade da plataforma",
                "Solicitação de autoridade judicial ou administrativa competente",
                "Inatividade prolongada (superior a 12 meses), mediante notificação prévia",
              ]}
            />
            <p>
              Em caso de encerramento por violação, os dados associados à conta poderão ser
              preservados pelo período legalmente exigido e depois excluídos. Em caso de
              encerramento a pedido da usuária, seus dados serão excluídos conforme solicitação e
              legislação aplicável.
            </p>
          </Section>

          <Section id="limitacao" number="26" title="Limitação de Responsabilidade">
            <p>
              Na máxima extensão permitida pela legislação aplicável, a plataforma Meu Barão, seus
              operadores, afiliados, prestadores, parceiros e licenciadores{" "}
              <strong className="text-foreground">não serão responsáveis</strong> por:
            </p>
            <Bullet
              items={[
                "Decisões, interpretações, reações emocionais, escolhas pessoais ou condutas adotadas pela usuária com base em respostas, conteúdos ou interações geradas pela IA",
                "Quaisquer consequências afetivas, relacionais, profissionais ou patrimoniais decorrentes do uso da plataforma",
                "Resultados emocionais, terapêuticos, espirituais, de bem-estar, de compatibilidade afetiva ou de qualquer outra natureza",
                "Precisão, completude, atualidade, continuidade ou disponibilidade ininterrupta do serviço",
                "Inconsistências, alucinações, respostas indesejadas, ofensivas, repetitivas ou inadequadas geradas pelos modelos de IA",
                "Danos indiretos, incidentais, especiais, consequenciais, morais reflexos ou punitivos",
                "Perda de lucros, receitas, dados, oportunidades de negócio ou goodwill",
                "Danos resultantes de indisponibilidade, lentidão, falhas técnicas ou eventos de força maior",
                "Atos, omissões, falhas ou políticas de terceiros, incluindo provedores de infraestrutura, IA, pagamento, mensageria ou telecomunicações",
              ]}
            />
            <p>
              A plataforma <strong className="text-foreground">não oferece garantias</strong>,
              expressas ou implícitas, quanto à compatibilidade emocional, à eficácia de qualquer
              interação, à continuidade indefinida de funcionalidades, ao comportamento específico
              da IA ou à adequação do serviço a finalidades clínicas, terapêuticas, médicas,
              jurídicas, financeiras ou profissionais.
            </p>
            <p>
              A responsabilidade total agregada da plataforma, em qualquer hipótese, será limitada
              ao valor efetivamente pago por você nos 12 (doze) meses anteriores ao evento danoso,
              ou a R$ 100,00 (cem reais), o que for maior, ressalvadas as situações em que tal
              limitação seja vedada por norma cogente.
            </p>
            <p>
              As limitações acima não se aplicam em caso de dolo, fraude ou culpa grave comprovada
              por parte da plataforma, nem em jurisdições onde tais limitações sejam proibidas por
              lei.
            </p>
          </Section>

          <Section id="foro" number="27" title="Foro e Legislação Aplicável">
            <p>
              Estes Termos de Uso são regidos e interpretados de acordo com as leis da
              <strong className="text-foreground"> República Federativa do Brasil</strong>.
            </p>
            <p>
              Fica eleito, com renúncia expressa a qualquer outro, por mais privilegiado que seja, o{" "}
              <strong className="text-foreground">
                foro da Comarca de São Paulo, Estado de São Paulo
              </strong>
              , como competente para dirimir quaisquer dúvidas, controvérsias ou litígios oriundos
              destes Termos ou da utilização da plataforma, ressalvada a faculdade legal da usuária
              consumidora de demandar no foro do seu domicílio, nos termos do Código de Defesa do
              Consumidor.
            </p>
          </Section>

          <Section id="atualizacoes" number="28" title="Atualizações dos Termos">
            <p>
              Estes Termos de Uso podem ser atualizados periodicamente para refletir mudanças na
              plataforma, na legislação ou nas práticas do setor. Alterações materiais serão
              comunicadas por:
            </p>
            <Bullet
              items={[
                "E-mail registrado na conta",
                "Notificação dentro da plataforma",
                "Destaque na página de Termos de Uso por pelo menos 30 dias",
              ]}
            />
            <p>
              O uso continuado da plataforma após a publicação de alterações constitui aceitação
              tácita dos novos termos. Se não concordar com as mudanças, você deve encerrar seu uso
              da plataforma antes da data de vigência.
            </p>
          </Section>

          <Section id="evolucao" number="29" title="Evolução e Alteração da Plataforma">
            <p>
              A plataforma poderá, a qualquer tempo e a seu exclusivo critério, sem necessidade de
              aviso prévio individualizado,{" "}
              <strong className="text-foreground">
                alterar, atualizar, substituir, ajustar, limitar, suspender, interromper ou
                descontinuar
              </strong>
              , de forma total ou parcial, temporária ou definitivamente, funcionalidades, estilos
              conversacionais, vozes sintetizadas, modelos de inteligência artificial,
              características da personalidade virtual, recursos visuais, recursos de áudio,
              sistemas de personalização contextual, integrações, disponibilidade de avatar,
              recursos experimentais e quaisquer outros elementos da experiência.
            </p>
            <p>A usuária reconhece e aceita que:</p>
            <Bullet
              items={[
                "Não há garantia de manutenção permanente de qualquer funcionalidade, recurso, voz, modelo, personalidade, avatar ou estilo conversacional específico",
                "A personalidade simulada, a voz, o estilo conversacional, a aparência, o avatar e os recursos da inteligência artificial podem mudar, evoluir ou ser substituídos ao longo do tempo",
                "Alterações técnicas, regulatórias, comerciais, contratuais, de segurança ou impostas por provedores terceiros podem exigir mudanças relevantes na experiência",
                "Não se adquire direito adquirido, expectativa legítima ou propriedade sobre uma versão específica da IA, da personalidade, da voz, do avatar, do estilo conversacional, das funcionalidades, dos preços ou da arquitetura do serviço",
                "Recursos podem ser oferecidos em caráter experimental, beta ou de pré-visualização, podendo ser removidos sem aviso",
              ]}
            />
            <p>
              Sempre que alterações materiais impactarem de forma significativa direitos relevantes
              da usuária, a plataforma envidará esforços razoáveis para comunicar tais mudanças por
              e-mail cadastrado, aviso interno na plataforma, destaque na presente página ou outro
              meio adequado, conforme aplicável. A continuidade no uso após a vigência das
              alterações implicará concordância tácita.
            </p>
          </Section>

          <Section
            id="tecnologia-experimental"
            number="30"
            title="Natureza Evolutiva e Experimental da Tecnologia"
          >
            <p>
              A plataforma é construída sobre tecnologias de{" "}
              <strong className="text-foreground">
                inteligência artificial em constante desenvolvimento
              </strong>
              , incluindo modelos generativos de linguagem, síntese de voz, geração de imagens e
              sistemas automatizados de moderação, fornecidos parcial ou integralmente por
              provedores terceiros. A usuária reconhece e aceita que tais tecnologias são, por sua
              natureza, evolutivas, probabilísticas e não plenamente previsíveis.
            </p>
            <p>
              Em razão disso, o serviço pode apresentar, de forma exemplificativa e não taxativa:
            </p>
            <Bullet
              items={[
                "Limitações técnicas, inconsistências, falhas de geração, alucinações e respostas inadequadas ou indesejadas",
                "Comportamentos inesperados, contraditórios, repetitivos ou pouco naturais por parte da inteligência artificial",
                "Indisponibilidades temporárias, lentidão, instabilidades ou alterações decorrentes de provedores terceiros",
                "Variações de qualidade entre interações, modelos, dispositivos, regiões geográficas e versões do serviço",
                "Funcionalidades em caráter experimental, beta ou de teste, sujeitas a ajustes, modificações ou descontinuidade sem aviso prévio",
              ]}
            />
            <p>
              A plataforma emprega esforços razoáveis para aprimorar continuamente a segurança, a
              qualidade, a estabilidade e a conformidade legal do serviço, mas{" "}
              <strong className="text-foreground">
                não garante comportamento perfeito, determinístico, uniforme, infalível ou
                ininterrupto
              </strong>{" "}
              da inteligência artificial. A usuária assume, na máxima extensão permitida pela
              legislação aplicável, os riscos inerentes ao uso de tecnologias de IA generativa.
            </p>
          </Section>

          <Section id="contato" number="31" title="Contato">
            <p>
              Para questões sobre estes Termos de Uso, para exercer seus direitos ou para relatar
              violações, entre em contato conosco:
            </p>
            <div className="glass rounded-2xl p-6 md:p-8 mt-6">
              <p className="text-foreground font-medium mb-2">Meu Barão — Suporte</p>
              <p className="text-muted-foreground text-sm mb-1">E-mail: sac@meubarao.com</p>
              <p className="text-muted-foreground text-sm">
                Responderemos em até 5 (cinco) dias úteis.
              </p>
            </div>
          </Section>

          {/* Back to top */}
          <Reveal>
            <div className="mt-16 text-center">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-[#BA9D6B] transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                Voltar ao topo
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-16 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <Link to="/" className="flex items-center gap-3">
              <span className="serif text-xl gold-text">Meu Barão</span>
              <span className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
                do Tantra · AI
              </span>
            </Link>
            <div className="flex items-center gap-8 text-xs tracking-[0.2em] uppercase text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">
                Início
              </Link>
              <span className="text-muted-foreground/40">Termos</span>
              <span className="text-muted-foreground/40">Contato</span>
            </div>
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Meu Barão
            </p>
          </div>
          <p className="mt-10 text-center text-xs text-muted-foreground/50 max-w-2xl mx-auto leading-relaxed">
            O Meu Barão é uma plataforma conversacional baseada em inteligência artificial. Não
            substitui tratamento psicológico, psiquiátrico ou médico. Em situação de crise, procure
            imediatamente ajuda profissional.
          </p>
        </div>
      </footer>
    </div>
  );
}
