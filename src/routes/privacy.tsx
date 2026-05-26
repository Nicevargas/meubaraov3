import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Reveal, Particles } from "@/components/Atmosphere";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Meu Barão" },
      {
        name: "description",
        content:
          "Política de Privacidade da plataforma Meu Barão. Sua privacidade emocional é levada extremamente a sério.",
      },
      { property: "og:title", content: "Política de Privacidade — Meu Barão" },
      {
        property: "og:description",
        content:
          "Como protegemos seus dados, suas memórias e sua intimidade na plataforma Meu Barão.",
      },
    ],
  }),
  component: PrivacyPage,
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

function AnchorNav() {
  const [activeId, setActiveId] = useState<string>("");
  const navRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => [
      { id: "intro", label: "Introdução" },
      { id: "coleta", label: "Informações Coletadas" },
      { id: "memoria", label: "Dados de Conversa" },
      { id: "privacidade-emocional", label: "Dados Sensíveis" },
      { id: "bases-legais", label: "Bases Legais" },
      { id: "uso", label: "Uso das Informações" },
      { id: "personalizacao", label: "Personalização" },
      { id: "automatizado", label: "Decisões Automatizadas" },
      { id: "voz-imagens", label: "Voz e Imagens" },
      { id: "whatsapp", label: "WhatsApp" },
      { id: "cookies", label: "Cookies" },
      { id: "compartilhamento", label: "Compartilhamento" },
      { id: "seguranca", label: "Segurança" },
      { id: "incidentes", label: "Incidentes" },
      { id: "armazenamento", label: "Armazenamento" },
      { id: "controle-memorias", label: "Controle de Dados" },
      { id: "direitos", label: "Direitos" },
      { id: "exclusao", label: "Exclusão" },
      { id: "menores", label: "Menores" },
      { id: "dpo", label: "Encarregado" },
      { id: "atualizacoes", label: "Atualizações" },
      { id: "contato", label: "Contato" },
    ],
    [],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div
      ref={navRef}
      className="sticky top-[60px] md:top-[68px] z-40 backdrop-blur-xl bg-background/60 border-b border-border/20"
    >
      <div className="mx-auto max-w-5xl px-4 lg:px-10">
        <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide">
          {items.map((item) => {
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

function PrivacyPage() {
  const [lastUpdated] = useState("20 de maio de 2026");
  const tocRef = useRef<HTMLDivElement>(null);

  const sections = [
    { num: "01", title: "Introdução", id: "intro" },
    { num: "02", title: "Informações Coletadas", id: "coleta" },
    { num: "03", title: "Dados de Conversa e Personalização Contextual", id: "memoria" },
    {
      num: "04",
      title: "Proteção de Dados Sensíveis e Conteúdos Íntimos",
      id: "privacidade-emocional",
    },
    { num: "05", title: "Bases Legais para Tratamento de Dados", id: "bases-legais" },
    { num: "06", title: "Uso das Informações", id: "uso" },
    { num: "07", title: "Personalização da Experiência", id: "personalizacao" },
    {
      num: "08",
      title: "Processamento Automatizado, Perfilamento e Personalização",
      id: "automatizado",
    },
    { num: "09", title: "Voz, Áudios e Imagens Geradas", id: "voz-imagens" },
    { num: "10", title: "Integração com WhatsApp", id: "whatsapp" },
    { num: "11", title: "Cookies e Tecnologias de Rastreamento", id: "cookies" },
    {
      num: "12",
      title: "Compartilhamento de Dados e Transferência Internacional",
      id: "compartilhamento",
    },
    { num: "13", title: "Segurança das Informações", id: "seguranca" },
    { num: "14", title: "Incidentes de Segurança", id: "incidentes" },
    { num: "15", title: "Armazenamento e Retenção de Dados", id: "armazenamento" },
    { num: "16", title: "Controle dos Dados de Personalização", id: "controle-memorias" },
    { num: "17", title: "Direitos da Titular", id: "direitos" },
    { num: "18", title: "Exclusão de Conta e Dados", id: "exclusao" },
    { num: "19", title: "Menores de Idade", id: "menores" },
    { num: "20", title: "Encarregado pelo Tratamento de Dados", id: "dpo" },
    { num: "21", title: "Atualizações desta Política", id: "atualizacoes" },
    { num: "22", title: "Contato", id: "contato" },
  ];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

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
              <span>Confiança</span>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <h1 className="serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] text-foreground">
              Política de Privacidade
            </h1>
          </Reveal>
          <Reveal delay={400}>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              Tratamento de dados pessoais em conformidade com a LGPD.
              <br className="hidden md:block" />
              Como coletamos, utilizamos, armazenamos e protegemos suas informações.
            </p>
          </Reveal>
          <Reveal delay={600}>
            <p className="mt-8 text-xs tracking-[0.3em] uppercase text-muted-foreground/60">
              Última atualização: {lastUpdated}
            </p>
          </Reveal>
        </div>
      </section>

      <AnchorNav />

      {/* Table of Contents */}
      <section className="relative py-16 md:py-20 border-b border-border/30">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          <Reveal>
            <h2 className="serif text-xl md:text-2xl text-foreground mb-10 text-center">Índice</h2>
          </Reveal>
          <div ref={tocRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            {sections.map((s, i) => (
              <Reveal key={s.id} delay={i * 40}>
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

      {/* Content */}
      <main className="relative py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <Section number="01" title="Introdução" id="intro">
            <p>
              O Meu Barão é uma plataforma conversacional baseada em inteligência artificial,
              projetada para oferecer interações textuais, recursos de voz sintetizada,
              personalização contextual, geração de conteúdos digitais e futuras funcionalidades
              visuais automatizadas.
            </p>
            <p>
              Esta Política de Privacidade descreve, de forma técnica e objetiva, como a plataforma
              coleta, utiliza, armazena, compartilha e protege dados pessoais, em observância à Lei
              nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD), à Lei nº 12.965/2014
              (Marco Civil da Internet), ao Código de Defesa do Consumidor e demais normas
              aplicáveis.
            </p>
            <p>
              Ao acessar ou utilizar a plataforma, a usuária declara ter lido, compreendido e
              concordado com as práticas descritas neste documento, observadas as hipóteses legais
              de tratamento e os consentimentos específicos eventualmente solicitados.
            </p>
          </Section>

          <Section number="02" title="Informações Coletadas" id="coleta">
            <p>
              Para viabilizar a prestação dos serviços, a plataforma poderá tratar, quando
              aplicável, as seguintes categorias de dados:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong className="text-foreground">Dados cadastrais:</strong> nome, endereço de
                e-mail, data de nascimento e demais informações necessárias para criação,
                autenticação e gestão da conta.
              </li>
              <li>
                <strong className="text-foreground">Dados de conversa:</strong>
                mensagens, comandos de voz, instruções, interações e conteúdos voluntariamente
                compartilhados pela usuária durante o uso da plataforma.
              </li>
              <li>
                <strong className="text-foreground">Dados contextuais e de personalização:</strong>
                preferências declaradas, padrões de interação, parâmetros de configuração e dados
                informados para fins de personalização da experiência.
              </li>
              <li>
                <strong className="text-foreground">Dados técnicos:</strong>
                endereço IP, tipo de dispositivo, sistema operacional, navegador, identificadores de
                sessão, registros de conexão e de acesso a aplicações de internet, nos termos do
                Marco Civil da Internet.
              </li>
              <li>
                <strong className="text-foreground">Dados de uso:</strong>
                estatísticas de interação, frequência de acesso, recursos utilizados e padrões de
                navegação na plataforma.
              </li>
              <li>
                <strong className="text-foreground">Dados de pagamento:</strong>
                quando aplicável, dados de transação processados por provedores terceiros,
                observadas as normas aplicáveis ao setor.
              </li>
              <li>
                <strong className="text-foreground">Dados pessoais sensíveis:</strong>
                eventualmente compartilhados de forma voluntária pela usuária no contexto das
                interações, tratados conforme as bases legais aplicáveis e medidas reforçadas de
                segurança.
              </li>
            </ul>
            <p className="mt-4">
              A plataforma não solicita ativamente dados pessoais sensíveis, mas reconhece que tais
              dados podem ser informados pela usuária durante as interações. O tratamento desses
              dados observa as hipóteses específicas previstas no art. 11 da LGPD.
            </p>
          </Section>

          <Section number="03" title="Dados de Conversa e Personalização Contextual" id="memoria">
            <p>
              A plataforma oferece um sistema de personalização contextual que processa, de forma
              automatizada, dados de conversa e parâmetros informados pela usuária para manter
              continuidade contextual entre interações.
            </p>
            <p>
              Os dados de conversa podem ser processados por sistemas automatizados com as seguintes
              finalidades:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Personalizar a experiência e manter continuidade contextual entre interações
                sucessivas.
              </li>
              <li>
                Operar funcionalidades dependentes de contexto histórico, quando disponíveis e
                habilitadas pela usuária.
              </li>
              <li>Aprimorar segurança, prevenir abusos e moderar conteúdos.</li>
              <li>Cumprir obrigações legais, regulatórias e contratuais aplicáveis.</li>
            </ul>
            <p>
              O sistema de personalização contextual registra dados técnicos e contextuais a fim de
              viabilizar respostas automatizadas mais coerentes. Não há, em nenhuma hipótese,
              memória humana, consciência, sentimento, julgamento clínico ou compreensão subjetiva
              por parte da plataforma. Trata-se de processamento estatístico e probabilístico
              baseado em modelos de linguagem.
            </p>
            <p>
              Dados de conversa podem eventualmente conter dados pessoais sensíveis, quando
              voluntariamente informados pela usuária. O tratamento desses dados observará as bases
              legais cabíveis e, quando exigido, dependerá de consentimento específico, destacado,
              livre, informado e inequívoco, nos termos do art. 11 da LGPD.
            </p>
            <p>
              A usuária poderá, conforme funcionalidades disponíveis e legislação aplicável,
              gerenciar, desativar, editar ou solicitar a eliminação dos registros de personalização
              contextual.
            </p>
          </Section>

          <Section
            number="04"
            title="Proteção de Dados Sensíveis e Conteúdos Íntimos"
            id="privacidade-emocional"
          >
            <p>
              A plataforma poderá tratar dados pessoais sensíveis na medida em que forem
              voluntariamente compartilhados pela usuária no curso das interações. Tais dados podem
              incluir, entre outros, informações relativas a vida íntima, preferências pessoais,
              saúde, sexualidade, estado psicoemocional, relações pessoais e experiências
              subjetivas, nos termos da LGPD.
            </p>
            <p>Em relação a esses dados, a plataforma observa os seguintes princípios:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li>Não são utilizados para publicidade comportamental de terceiros.</li>
              <li>Não são comercializados ou cedidos onerosamente a terceiros.</li>
              <li>
                Não são compartilhados com parceiros comerciais para fins de exploração
                publicitária.
              </li>
              <li>
                São tratados exclusivamente para finalidades legítimas, específicas, explícitas e
                previamente informadas.
              </li>
              <li>
                Quando exigido por lei, seu tratamento depende de consentimento específico e
                destacado, conforme art. 11 da LGPD.
              </li>
              <li>
                Recebem medidas reforçadas de segurança, controle de acesso e aplicação do princípio
                da minimização.
              </li>
            </ul>
            <p>
              A plataforma adota medidas razoáveis e tecnicamente adequadas para limitar o acesso a
              esses dados às finalidades estritamente necessárias à prestação dos serviços e ao
              cumprimento de obrigações legais.
            </p>
          </Section>

          <Section number="05" title="Bases Legais para Tratamento de Dados" id="bases-legais">
            <p>
              O tratamento de dados pessoais pela plataforma poderá fundamentar-se em uma ou mais
              das seguintes hipóteses legais, conforme a finalidade específica:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong className="text-foreground">Consentimento</strong> da titular, especialmente
                para tratamento de dados pessoais sensíveis, personalização contextual avançada,
                recursos de voz, integração com WhatsApp e demais funcionalidades opcionais.
              </li>
              <li>
                <strong className="text-foreground">Execução de contrato</strong> ou de
                procedimentos preliminares relacionados à prestação dos serviços contratados pela
                usuária.
              </li>
              <li>
                <strong className="text-foreground">
                  Cumprimento de obrigação legal ou regulatória
                </strong>{" "}
                pelo controlador.
              </li>
              <li>
                <strong className="text-foreground">Exercício regular de direitos</strong>
                em processos judiciais, administrativos ou arbitrais.
              </li>
              <li>
                <strong className="text-foreground">Legítimo interesse</strong> do controlador ou de
                terceiro, quando aplicável e respeitados os direitos e liberdades fundamentais da
                titular.
              </li>
              <li>
                <strong className="text-foreground">Proteção da segurança</strong>
                da plataforma, prevenção a fraudes, integridade dos serviços e investigação de
                incidentes.
              </li>
            </ul>
            <p>
              O tratamento de dados pessoais sensíveis observa as hipóteses específicas previstas no
              art. 11 da LGPD, podendo basear-se, especialmente, em consentimento específico e
              destacado da titular ou em outras hipóteses legais autorizadas.
            </p>
          </Section>

          <Section number="06" title="Uso das Informações" id="uso">
            <p>
              Os dados tratados pela plataforma poderão ser utilizados para as seguintes
              finalidades, observadas as bases legais aplicáveis:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong className="text-foreground">Personalização contextual:</strong>
                adaptar respostas, parâmetros e conteúdos conversacionais às preferências e ao
                histórico informados pela usuária.
              </li>
              <li>
                <strong className="text-foreground">Continuidade contextual:</strong>
                manter coerência entre interações sucessivas, quando habilitada a funcionalidade
                correspondente.
              </li>
              <li>
                <strong className="text-foreground">Geração de conteúdos digitais:</strong>
                produção automatizada de textos, áudios, imagens e demais conteúdos, com base em
                parâmetros fornecidos pela usuária.
              </li>
              <li>
                <strong className="text-foreground">Melhoria da plataforma:</strong>
                análise agregada ou pseudonimizada, sempre que possível, de padrões de uso para
                aprimoramento técnico e correção de problemas.
              </li>
              <li>
                <strong className="text-foreground">Segurança e prevenção a fraudes:</strong>
                detecção de atividades suspeitas, mitigação de abusos e proteção contra acessos não
                autorizados.
              </li>
              <li>
                <strong className="text-foreground">Comunicações operacionais:</strong>
                envio de informações sobre a conta, atualizações de serviço e comunicações exigidas
                por lei.
              </li>
              <li>
                <strong className="text-foreground">Cumprimento de obrigações legais:</strong>
                atendimento a obrigações regulatórias, ordens judiciais ou requisições de
                autoridades competentes.
              </li>
            </ul>
          </Section>

          <Section number="07" title="Personalização da Experiência" id="personalizacao">
            <p>
              A personalização é executada de forma automatizada com base em padrões de comunicação,
              preferências declaradas, parâmetros configurados e contexto histórico das interações
              registradas pela plataforma.
            </p>
            <p>A personalização poderá incluir, conforme funcionalidade disponível:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Ajuste de estilo, tom e linguagem das respostas automatizadas conforme parâmetros
                informados pela usuária.
              </li>
              <li>
                Sugestão de conteúdos, temas e funcionalidades alinhados às preferências manifestas.
              </li>
              <li>
                Ajuste de ritmo e parâmetros das interações automatizadas conforme padrões de
                engajamento.
              </li>
              <li>
                Registro de informações contextuais voluntariamente compartilhadas para reuso em
                interações futuras.
              </li>
            </ul>
            <p className="mt-4">
              A usuária poderá ajustar, limitar ou desativar a personalização por meio das
              configurações disponibilizadas pela plataforma, sem prejuízo do acesso às
              funcionalidades essenciais do serviço.
            </p>
          </Section>

          <Section
            number="08"
            title="Processamento Automatizado, Perfilamento e Personalização"
            id="automatizado"
          >
            <p>
              A plataforma utiliza sistemas automatizados para personalização contextual, segurança,
              moderação, prevenção a abusos, aprimoramento da experiência e operação dos modelos de
              inteligência artificial.
            </p>
            <p>
              Esse processamento pode envolver análise de padrões de uso, preferências declaradas,
              interações registradas, parâmetros técnicos e demais dados contextuais, configurando
              perfilamento comportamental e contextual com finalidade operacional.
            </p>
            <p>
              Nos termos do art. 20 da LGPD, a titular tem o direito de solicitar informações claras
              e adequadas a respeito dos critérios e dos procedimentos utilizados em decisões
              automatizadas que afetem seus interesses, bem como solicitar a revisão dessas
              decisões.
            </p>
            <p>
              A plataforma não utiliza perfilamento para discriminação ilícita, exploração de
              vulnerabilidades ou publicidade abusiva. A personalização não constitui, em nenhuma
              hipótese, diagnóstico médico, avaliação psicológica, classificação clínica, análise
              profissional de personalidade ou aconselhamento terapêutico.
            </p>
          </Section>

          <Section number="09" title="Voz, Áudios e Imagens Geradas" id="voz-imagens">
            <p>
              A plataforma poderá oferecer recursos de interação por voz, síntese de áudio e geração
              de imagens e conteúdos imersivos. Para esses recursos, aplicam-se os seguintes
              princípios:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Áudios poderão ser processados para transcrição, geração de resposta, segurança,
                qualidade e funcionamento do serviço.
              </li>
              <li>
                Gravações de voz não serão retidas além do necessário ao processamento operacional,
                salvo mediante consentimento específico, configuração da usuária, obrigação legal ou
                necessidade operacional legítima e documentada.
              </li>
              <li>
                Imagens e conteúdos gerados por inteligência artificial poderão ser processados por
                provedores terceiros de modelos generativos, observadas as salvaguardas contratuais
                aplicáveis.
              </li>
              <li>
                O uso de imagem, voz, descrição pessoal ou dados identificáveis fornecidos pela
                usuária para fins de personalização depende de consentimento e finalidade
                específica, e poderá ser revogado a qualquer tempo, observadas as obrigações legais.
              </li>
              <li>
                Conteúdos gerados por inteligência artificial podem conter imprecisões, artefatos
                visuais, inconsistências e eventuais semelhanças não intencionais com terceiros,
                dada a natureza probabilística dos modelos.
              </li>
              <li>
                A usuária mantém os direitos sobre os prompts, descrições e instruções que fornece,
                observados os Termos de Uso.
              </li>
            </ul>
          </Section>

          <Section number="10" title="Integração com WhatsApp" id="whatsapp">
            <p>
              A integração com WhatsApp é funcionalidade opcional, condicionada a consentimento
              prévio, específico e destacado da usuária, podendo ser revogada a qualquer momento.
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Essa integração poderá envolver o tratamento de número de telefone, mensagens,
                metadados de comunicação e informações técnicas relacionadas ao canal.
              </li>
              <li>
                Dados trafegados pelo WhatsApp também estão sujeitos às políticas, termos e à
                infraestrutura operada pela Meta Platforms, Inc. e empresas afiliadas,
                recomendando-se a leitura das políticas aplicáveis disponibilizadas pelo
                WhatsApp/Meta.
              </li>
              <li>
                Mensagens trocadas via WhatsApp recebem padrões de proteção equivalentes aos das
                demais interações na plataforma, observadas as limitações técnicas do canal.
              </li>
              <li>
                O número de telefone não será compartilhado com terceiros para fins de marketing sem
                consentimento expresso.
              </li>
              <li>
                A revogação do consentimento impede novas interações pelo canal, mas poderá não
                apagar automaticamente dados já tratados ou retidos por obrigação legal, requisitos
                de segurança, backups técnicos ou políticas de operadores terceiros.
              </li>
            </ul>
          </Section>

          <Section number="11" title="Cookies e Tecnologias de Rastreamento" id="cookies">
            <p>
              A plataforma utiliza cookies e tecnologias similares para suporte à funcionalidade,
              segurança e melhoria da experiência da usuária:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong className="text-foreground">Cookies essenciais:</strong>
                necessários ao funcionamento básico, autenticação e segurança da plataforma.
              </li>
              <li>
                <strong className="text-foreground">Cookies de segurança:</strong>
                tokens de sessão, identificadores temporários e mecanismos antifraude.
              </li>
              <li>
                <strong className="text-foreground">Cookies de preferências:</strong>
                armazenam configurações de idioma, tema e parâmetros de interface.
              </li>
              <li>
                <strong className="text-foreground">Cookies analíticos:</strong>
                empregados, sempre que possível, de forma agregada ou pseudonimizada, para análise
                de padrões de uso e melhoria do serviço.
              </li>
              <li>
                <strong className="text-foreground">Cookies de marketing:</strong>
                utilizados apenas se efetivamente empregados e mediante consentimento da usuária,
                quando exigido pela legislação aplicável.
              </li>
            </ul>
            <p className="mt-4">
              A usuária poderá gerenciar suas preferências de cookies por meio das configurações do
              navegador ou de mecanismos disponibilizados pela plataforma. A desativação de cookies
              essenciais poderá comprometer funcionalidades fundamentais do serviço.
            </p>
          </Section>

          <Section
            number="12"
            title="Compartilhamento de Dados e Transferência Internacional"
            id="compartilhamento"
          >
            <p>
              A plataforma não comercializa dados pessoais. O compartilhamento de dados ocorre
              apenas nas hipóteses estritamente necessárias à prestação do serviço e ao cumprimento
              de obrigações legais, podendo envolver as seguintes categorias de operadores e
              provedores:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>Provedores de infraestrutura em nuvem e hospedagem.</li>
              <li>Provedores de modelos de inteligência artificial.</li>
              <li>Provedores de síntese de voz e processamento de áudio.</li>
              <li>Provedores de geração de imagem e mídia.</li>
              <li>Provedores de processamento de pagamentos.</li>
              <li>Serviços de mensageria, incluindo WhatsApp/Meta quando integrado.</li>
              <li>Ferramentas de analytics e métricas de uso.</li>
              <li>Serviços antifraude e de segurança.</li>
              <li>Ferramentas de moderação automatizada de conteúdo.</li>
              <li>Provedores de suporte, comunicação e atendimento.</li>
              <li>
                Autoridades públicas, quando exigido por lei, ordem judicial ou requisição
                regulatória válida.
              </li>
            </ul>
            <p>
              Esses operadores e provedores são vinculados a obrigações contratuais de
              confidencialidade, segurança e conformidade com a legislação de proteção de dados
              aplicável.
            </p>
            <p>
              <strong className="text-foreground">Transferência internacional:</strong>
              alguns desses operadores e provedores podem estar localizados fora do Brasil. Nesses
              casos, a plataforma adotará mecanismos e salvaguardas adequadas para a transferência
              internacional de dados, nos termos dos arts. 33 a 36 da LGPD e das normas aplicáveis
              da Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </Section>

          <Section number="13" title="Segurança das Informações" id="seguranca">
            <p>
              A plataforma adota medidas técnicas e administrativas razoáveis, proporcionais aos
              riscos envolvidos, para proteger dados pessoais contra acessos não autorizados,
              situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou
              difusão indevida. Essas medidas incluem, conforme aplicável:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>Criptografia de dados em trânsito (TLS/SSL) e, quando aplicável, em repouso.</li>
              <li>
                Autenticação segura com armazenamento de credenciais por meio de funções
                criptográficas adequadas e, quando disponível, autenticação em múltiplos fatores.
              </li>
              <li>Controles de acesso baseados no princípio do menor privilégio.</li>
              <li>Monitoramento contínuo de eventos de segurança e revisões periódicas.</li>
              <li>Rotinas de backup e planos de continuidade operacional.</li>
              <li>Treinamento periódico de equipe em práticas de segurança e proteção de dados.</li>
            </ul>
            <p className="mt-4">
              Nenhum sistema, contudo, é absolutamente imune a riscos. Recomenda-se à usuária a
              adoção de boas práticas de segurança, como uso de senhas robustas, ativação de
              autenticação adicional e não compartilhamento de credenciais.
            </p>
          </Section>

          <Section number="14" title="Incidentes de Segurança" id="incidentes">
            <p>
              A plataforma adota medidas técnicas e administrativas razoáveis para prevenir
              incidentes de segurança envolvendo dados pessoais. Em caso de incidente que possa
              acarretar risco ou dano relevante às titulares, serão observadas as seguintes
              diretrizes:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Avaliação técnica e jurídica do incidente, com identificação dos dados afetados,
                riscos envolvidos e medidas de mitigação cabíveis.
              </li>
              <li>
                Comunicação à Autoridade Nacional de Proteção de Dados (ANPD) e às titulares
                afetadas, quando exigida pela legislação aplicável, em prazo razoável.
              </li>
              <li>
                Adoção de medidas corretivas e preventivas adicionais para conter o incidente e
                reduzir a probabilidade de reincidência.
              </li>
              <li>
                Conservação de registros sobre o incidente e as providências adotadas, para fins de
                prestação de contas.
              </li>
            </ul>
            <p>
              A comunicação às titulares afetadas poderá conter informações sobre a natureza do
              incidente, as categorias de dados envolvidas, os riscos potenciais, as medidas
              adotadas e recomendações de autoproteção, observada a legislação aplicável.
            </p>
          </Section>

          <Section number="15" title="Armazenamento e Retenção de Dados" id="armazenamento">
            <p>
              Os dados pessoais serão armazenados em infraestrutura adequada e tratados de acordo
              com os seguintes critérios de retenção:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Os dados serão mantidos pelo tempo necessário ao cumprimento das finalidades
                informadas, observadas as bases legais aplicáveis.
              </li>
              <li>
                Dados poderão ser retidos para cumprimento de obrigação legal ou regulatória,
                prevenção a fraudes, exercício regular de direitos, auditorias, segurança e defesa
                em processos judiciais, administrativos ou arbitrais.
              </li>
              <li>
                Dados anonimizados poderão ser preservados para fins estatísticos, melhoria do
                serviço, pesquisa interna e segurança, na medida permitida pela legislação.
              </li>
              <li>
                Dados presentes em backups poderão persistir por prazo técnico limitado, até o
                expurgo automático conforme os ciclos de retenção aplicáveis.
              </li>
              <li>
                Dados de pagamento são processados por provedores terceiros especializados; a
                plataforma não armazena integralmente dados sensíveis de cartões quando isso não for
                necessário.
              </li>
              <li>
                Contas inativas poderão ter seus dados anonimizados ou eliminados após período
                prolongado de inatividade, observadas comunicações cabíveis e as obrigações legais
                aplicáveis.
              </li>
            </ul>
          </Section>

          <Section number="16" title="Controle dos Dados de Personalização" id="controle-memorias">
            <p>Conforme funcionalidades disponíveis, a usuária poderá:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Ativar ou desativar recursos de personalização contextual nas configurações da
                conta.
              </li>
              <li>
                Visualizar resumos das informações contextuais que influenciam as interações
                automatizadas.
              </li>
              <li>
                Editar ou remover informações específicas registradas para fins de personalização.
              </li>
              <li>
                Solicitar a eliminação dos registros de personalização contextual, observadas as
                hipóteses legais de retenção.
              </li>
            </ul>
            <p className="mt-4">
              Tais controles foram concebidos para que a personalização contextual permaneça sob a
              esfera de autodeterminação informativa da titular, nos termos do art. 17 e seguintes
              da LGPD.
            </p>
          </Section>

          <Section number="17" title="Direitos da Titular" id="direitos">
            <p>
              Nos termos do art. 18 da LGPD, a titular dos dados pessoais tem direito de obter, em
              relação aos seus dados tratados pela plataforma:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>Confirmação da existência de tratamento.</li>
              <li>Acesso aos dados.</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>
                Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados
                em desconformidade com a LGPD.
              </li>
              <li>
                Portabilidade dos dados a outro fornecedor de serviço ou produto, observada a
                regulamentação aplicável.
              </li>
              <li>
                Eliminação dos dados pessoais tratados com consentimento, ressalvadas as hipóteses
                legais de conservação.
              </li>
              <li>
                Informação sobre as entidades públicas e privadas com as quais a plataforma realizou
                uso compartilhado de dados.
              </li>
              <li>
                Informação sobre a possibilidade de não fornecer consentimento e sobre as
                consequências da negativa.
              </li>
              <li>Revogação do consentimento.</li>
              <li>Oposição ao tratamento em hipóteses previstas em lei.</li>
              <li>
                Revisão de decisões tomadas unicamente com base em tratamento automatizado, quando
                aplicável.
              </li>
              <li>
                Peticionamento perante a Autoridade Nacional de Proteção de Dados (ANPD) em face do
                controlador.
              </li>
            </ul>
            <p className="mt-4">
              As solicitações poderão ser apresentadas pelos canais indicados na seção de Contato e
              serão respondidas nos prazos previstos pela legislação aplicável.
            </p>
          </Section>

          <Section number="18" title="Exclusão de Conta e Dados" id="exclusao">
            <p>
              A usuária poderá solicitar a exclusão de sua conta e dos dados associados, observado o
              seguinte:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                A exclusão da conta resultará na remoção ou anonimização dos dados pessoais
                identificáveis, ressalvadas as retenções legais e contratuais aplicáveis.
              </li>
              <li>
                Alguns dados poderão ser preservados quando necessários para o cumprimento de
                obrigação legal ou regulatória, prevenção a fraudes, segurança, auditoria, exercício
                regular de direitos ou defesa em processos.
              </li>
              <li>
                Dados presentes em backups poderão ser eliminados conforme os ciclos técnicos
                aplicáveis.
              </li>
              <li>
                Dados anonimizados, que não permitem a identificação da titular, poderão ser
                mantidos para finalidades legítimas, na medida permitida pela legislação.
              </li>
              <li>
                A exclusão poderá afetar funcionalidades, histórico de interações e personalização
                da experiência.
              </li>
              <li>
                Após a exclusão definitiva, a recuperação dos dados poderá não ser possível.
                Recomenda-se que a usuária exporte previamente quaisquer conteúdos que deseje
                preservar.
              </li>
            </ul>
          </Section>

          <Section number="19" title="Menores de Idade" id="menores">
            <p>
              A plataforma é destinada exclusivamente a maiores de 18 anos. Não há coleta
              intencional de dados pessoais de crianças ou adolescentes. Identificada a existência
              de cadastro de menor, serão adotadas as seguintes providências:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>Eliminação ou anonimização dos dados pessoais associados à conta.</li>
              <li>Encerramento do acesso à plataforma.</li>
              <li>Comunicação aos responsáveis legais, quando possível e cabível.</li>
            </ul>
            <p className="mt-4">
              Responsáveis legais que identifiquem o uso indevido da plataforma por menores devem
              entrar em contato imediatamente pelos canais indicados nesta Política.
            </p>
          </Section>

          <Section number="20" title="Encarregado pelo Tratamento de Dados" id="dpo">
            <p>
              Nos termos do art. 41 da LGPD, o canal oficial de contato para assuntos relacionados à
              proteção de dados pessoais, exercício de direitos da titular, dúvidas sobre tratamento
              de dados e comunicações relativas à LGPD é:
            </p>
            <div className="glass rounded-2xl p-6 border border-[#BA9D6B]/20 mt-4">
              <p className="text-foreground">
                <a
                  href="mailto:sac@meubarao.com"
                  className="hover:text-[#BA9D6B] transition-colors underline underline-offset-4 decoration-[#BA9D6B]/30 hover:decoration-[#BA9D6B]"
                >
                  sac@meubarao.com
                </a>
              </p>
            </div>
            <p>
              Por meio desse canal, as titulares poderão exercer os direitos previstos na LGPD,
              apresentar dúvidas, reclamações e demais manifestações relacionadas ao tratamento de
              seus dados pessoais.
            </p>
          </Section>

          <Section number="21" title="Atualizações desta Política" id="atualizacoes">
            <p>
              Esta Política de Privacidade poderá ser atualizada periodicamente para refletir
              alterações em práticas, funcionalidades, requisitos técnicos ou obrigações legais.
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Alterações materiais serão comunicadas, sempre que possível, por e-mail ou
                notificação na plataforma com antecedência razoável.
              </li>
              <li>
                A continuidade do uso da plataforma após a entrada em vigor da versão atualizada
                implica concordância com os termos revisados, observadas as hipóteses em que novo
                consentimento seja exigido.
              </li>
              <li>
                Versões anteriores poderão ser disponibilizadas mediante solicitação, conforme
                procedimentos internos.
              </li>
            </ul>
          </Section>

          <Section number="22" title="Contato" id="contato">
            <p>
              Para exercer direitos previstos na LGPD, esclarecer dúvidas ou relatar preocupações
              sobre privacidade e proteção de dados:
            </p>
            <div className="glass rounded-2xl p-8 border border-[#BA9D6B]/20 mt-6">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    E-mail
                  </span>
                  <p className="text-foreground mt-1">
                    <a
                      href="mailto:sac@meubarao.com"
                      className="hover:text-[#BA9D6B] transition-colors underline underline-offset-4 decoration-[#BA9D6B]/30 hover:decoration-[#BA9D6B]"
                    >
                      sac@meubarao.com
                    </a>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    Prazo de Resposta
                  </span>
                  <p className="text-foreground mt-1">
                    Conforme prazos previstos pela legislação aplicável
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-6">
              As comunicações relativas à proteção de dados são tratadas com a diligência exigida
              pela LGPD e pelas demais normas aplicáveis, observados os princípios da transparência,
              segurança e prestação de contas.
            </p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border/30 py-12">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Meu Barão"
                className="h-8 w-auto opacity-60"
                width={32}
                height={32}
              />
              <span className="serif text-lg tracking-wide text-muted-foreground/60">
                Meu Barão
              </span>
            </div>
            <div className="flex items-center gap-8 text-xs tracking-[0.2em] uppercase text-muted-foreground/60">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Termos
              </Link>
              <span>Contato</span>
            </div>
            <p className="text-xs text-muted-foreground/40">
              © {new Date().getFullYear()} Meu Barão
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
