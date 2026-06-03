export const LEGAL_PAGES = {
  termos: {
    route: "/termos",
    title: "Termos de Uso",
    eyebrow: "Contrato de uso",
    updatedAt: "03/06/2026",
    summary:
      "Estes termos definem as regras para usar o NutriNow, incluindo conta, uso responsável da NutriAI, agenda, integrações e limitações do serviço.",
    sections: [
      {
        title: "1. Aceitação",
        body:
          "Ao criar conta ou usar o NutriNow, você concorda com estes termos e com a Política de Privacidade. Se não concordar, não utilize a plataforma.",
      },
      {
        title: "2. Natureza do serviço",
        body:
          "O NutriNow é uma plataforma de organização de rotina saudável, dietas, treinos e conversas com IA. As respostas da NutriAI são informativas e não substituem avaliação de nutricionista, médico, educador físico ou outro profissional habilitado.",
      },
      {
        title: "3. Conta e segurança",
        body:
          "Você é responsável por manter suas credenciais seguras, fornecer dados verdadeiros e avisar caso perceba uso não autorizado da conta.",
      },
      {
        title: "4. Uso aceitável",
        body:
          "É proibido usar a plataforma para atividades ilegais, tentar acessar dados de terceiros, explorar falhas, enviar arquivos maliciosos ou gerar conteúdo que incentive práticas prejudiciais à saúde.",
      },
      {
        title: "5. Integrações",
        body:
          "Google OAuth, Google Calendar, e-mail e provedores de IA dependem de serviços externos. Indisponibilidades, mudanças de API ou revogação de permissões podem afetar funcionalidades específicas.",
      },
      {
        title: "6. Disponibilidade e alterações",
        body:
          "O serviço pode receber melhorias, correções e ajustes de segurança. Funcionalidades experimentais podem ser alteradas ou removidas para preservar qualidade, segurança e conformidade.",
      },
      {
        title: "7. Contato",
        body:
          "Dúvidas sobre estes termos devem ser enviadas pelo canal de suporte informado pelo controlador do projeto antes da publicação comercial.",
      },
    ],
  },
  privacidade: {
    route: "/privacidade",
    title: "Política de Privacidade",
    eyebrow: "Privacidade e dados",
    updatedAt: "03/06/2026",
    summary:
      "Esta política explica quais dados o NutriNow trata, por que eles são usados, com quem podem ser compartilhados e quais escolhas ficam disponíveis ao usuário.",
    sections: [
      {
        title: "1. Dados coletados",
        body:
          "Podemos tratar dados de conta, perfil físico, objetivo, rotina de dieta e treino, mensagens enviadas à NutriAI, arquivos de imagem enviados, feedbacks e dados técnicos mínimos para segurança e analytics com consentimento.",
      },
      {
        title: "2. Finalidades",
        body:
          "Usamos os dados para autenticar usuários, manter perfil e agenda, personalizar respostas da NutriAI, sincronizar eventos autorizados no Google Calendar, enviar e-mails transacionais, melhorar a experiência e prevenir abuso.",
      },
      {
        title: "3. Compartilhamento",
        body:
          "Dados podem ser compartilhados com provedores necessários à operação, como infraestrutura, banco de dados, e-mail, Google Calendar e provedor de IA, sempre limitado à finalidade de entrega do serviço.",
      },
      {
        title: "4. Retenção",
        body:
          "Os dados são mantidos enquanto a conta estiver ativa ou pelo período necessário para cumprir obrigações legais, resolver disputas, prevenir fraude e manter segurança operacional.",
      },
      {
        title: "5. Analytics",
        body:
          "O NutriNow usa analytics próprio e minimizado. Eventos de navegação só são enviados após consentimento explícito e não incluem conteúdo de mensagens, senha, fotos ou dados sensíveis do perfil.",
      },
      {
        title: "6. Segurança",
        body:
          "A aplicação usa hash de senha, JWT, cookies de refresh com CSRF, CORS restrito, validação de uploads e cabeçalhos de segurança. Nenhum sistema é isento de risco, por isso correções e auditorias devem ser mantidas em produção.",
      },
      {
        title: "7. Exercício de direitos",
        body:
          "O usuário pode solicitar acesso, correção, exclusão, portabilidade ou informações sobre tratamento de dados pelo canal de privacidade informado pelo controlador do projeto.",
      },
    ],
  },
  lgpd: {
    route: "/lgpd",
    title: "LGPD e Direitos do Titular",
    eyebrow: "Conformidade",
    updatedAt: "03/06/2026",
    summary:
      "Esta página resume os direitos do titular de dados e os controles implementados no NutriNow para apoiar uma operação compatível com a LGPD.",
    sections: [
      {
        title: "Direitos atendidos",
        body:
          "O titular pode pedir confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamentos e revisão de decisões automatizadas quando aplicável.",
      },
      {
        title: "Bases e transparência",
        body:
          "A operação deve documentar as bases legais usadas para conta, execução do serviço, segurança, comunicações transacionais, analytics consentido e integrações externas autorizadas pelo usuário.",
      },
      {
        title: "Dados sensíveis",
        body:
          "Peso, altura, objetivos de saúde, rotinas, fotos e conversas podem revelar informações sensíveis. Por isso, o produto limita coleta ao necessário e evita enviar dados para analytics.",
      },
      {
        title: "Canal do encarregado",
        body:
          "Antes de venda ou publicação, configure um e-mail de privacidade/encarregado e informe o controlador responsável. Esse canal deve receber solicitações de titulares e comunicações da ANPD.",
      },
      {
        title: "Checklist operacional",
        body:
          "Para produção comercial, revise termos com advogado, registre subprocessadores, defina retenção, mantenha logs de consentimento, documente incidentes e teste exclusão/exportação de dados.",
      },
    ],
  },
};

export class AnalyticsClient {
  constructor({ storage, endpoint, getToken, getUserId, fetchImpl }) {
    this.storage = storage;
    this.endpoint = endpoint;
    this.getToken = getToken;
    this.getUserId = getUserId;
    this.fetchImpl = fetchImpl || fetch;
    this.consentKey = "nutrinow_analytics_consent";
    this.anonymousKey = "nutrinow_analytics_anon";
    this.lastPageView = "";
  }

  getConsent() {
    return this.storage.getItem(this.consentKey) || "";
  }

  needsConsent() {
    return !this.getConsent();
  }

  setConsent(value) {
    const normalized = value === "accepted" ? "accepted" : "declined";
    this.storage.setItem(this.consentKey, normalized);
    return normalized;
  }

  getAnonymousId() {
    let id = this.storage.getItem(this.anonymousKey);
    if (!id) {
      const browserCrypto = globalThis.crypto;
      const randomPart = browserCrypto?.randomUUID
        ? browserCrypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
      id = `anon-${randomPart}`;
      this.storage.setItem(this.anonymousKey, id);
    }
    return id;
  }

  async track(eventType, metadata = {}) {
    if (this.getConsent() !== "accepted") return false;
    const event = {
      eventType,
      path: location.pathname + location.hash,
      anonymousId: this.getAnonymousId(),
      userId: this.getUserId?.() || null,
      metadata: this.cleanMetadata(metadata),
    };

    try {
      const token = this.getToken?.() || "";
      await this.fetchImpl(this.endpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ events: [event] }),
      });
      return true;
    } catch {
      return false;
    }
  }

  trackPageView(path, title) {
    const signature = `${path}:${title}`;
    if (signature === this.lastPageView) return;
    this.lastPageView = signature;
    this.track("page_view", { title });
  }

  cleanMetadata(metadata) {
    const allowed = {};
    const blockedKeys = new Set(["password", "senha", "token", "authorization", "message", "content", "photo", "image"]);
    Object.entries(metadata || {}).slice(0, 12).forEach(([key, value]) => {
      const cleanKey = String(key).replace(/[^\w.-]/g, "").slice(0, 40);
      if (!cleanKey || blockedKeys.has(cleanKey.toLowerCase())) return;
      if (typeof value === "number" || typeof value === "boolean") {
        allowed[cleanKey] = value;
      } else if (typeof value === "string") {
        allowed[cleanKey] = value.slice(0, 160);
      }
    });
    return allowed;
  }
}
