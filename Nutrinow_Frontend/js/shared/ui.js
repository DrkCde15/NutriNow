import { icon } from "./icons.js";
import { escapeHtml, getFirstName, routeHref, isProfessionalUser, isPremiumUser, premiumLabel, roleLabel, normalizePath, navigate } from "./utils.js";
import { getUser, logoutFromBackend } from "./api.js";

const ASSETS = {
  logo: "./assets/logo.png",
  hero: "./assets/hero-nutrition.jpg",
  bmiShapes: [
    "./assets/bmi-shape-1.png",
    "./assets/bmi-shape-2.png",
    "./assets/bmi-shape-3.png",
    "./assets/bmi-shape-4.png",
    "./assets/bmi-shape-5.png",
  ],
};

export { ASSETS };

export function brandMarkup() {
  return `
    <span class="brand-logo"><img src="${ASSETS.logo}" alt="NutriNow" width="36" height="36" decoding="async"></span>
    <span>Nutri<span class="text-primary">Now</span></span>
  `;
}

function accountActionsMarkup(active, user) {
  const premium = isPremiumUser(user);
  const pill = isProfessionalUser(user)
    ? `<span class="plan-pill pro">${escapeHtml(roleLabel(user.role))}</span>`
    : `<span class="plan-pill ${premium ? "premium" : "free"}">${premiumLabel(user)}</span>`;
  return `
    ${pill}
    <a href="/perfil" data-link class="btn btn-ghost ${active === "/perfil" ? "active" : ""}">
      ${icon("user")} ${escapeHtml(getFirstName(user))}
    </a>
    <button class="btn btn-secondary" data-action="logout">${icon("logout")} Sair</button>
  `;
}

function mobileAccountActionsMarkup(user) {
  const premium = isPremiumUser(user);
  const pill = isProfessionalUser(user)
    ? `<span class="plan-pill pro">${escapeHtml(roleLabel(user.role))}</span>`
    : `<span class="plan-pill ${premium ? "premium" : "free"}">${premiumLabel(user)}</span>`;
  return `
    ${pill}
    <a href="/perfil" data-link class="btn btn-secondary">${icon("user")} Perfil (${escapeHtml(getFirstName(user))})</a>
    <button class="btn btn-secondary" data-action="logout">${icon("logout")} Sair</button>
  `;
}

export function headerMarkup(active = "") {
  const user = getUser();
  let privateLinks = [];
  if (user) {
    if (isProfessionalUser(user)) {
      privateLinks = [
        ["/pacientes", "Pacientes"],
        ["/anotacoes", "Anotações"],
        ["/chat", "Chat NutriAI"],
      ];
    } else {
      privateLinks = [
        ["/dashboard", "Dashboard"],
        ["/planos", "Dietas e Treinos"],
        ["/calendario", "Calendário"],
        ["/chat", "Chat NutriAI"],
      ];
    }
  }
  const navLinks = privateLinks
    .map(([to, label]) => `<a href="${routeHref(to)}" data-link class="nav-link ${active === to ? "active" : ""}">${label}</a>`)
    .join("");

  const desktopActions = user
    ? accountActionsMarkup(active, user)
    : `
      <a href="/chat" data-link class="btn btn-ghost" style="padding: 0.5rem;" aria-label="Chat NutriAI" title="Chat NutriAI">${icon("message", "icon-lg")}</a>
      <a href="/login" data-link class="btn btn-ghost">Entrar</a>
      <a href="/cadastro" data-link class="btn btn-dark">Começar grátis</a>
    `;

  const mobileLinks = privateLinks
    .map(([to, label]) => `<a href="${routeHref(to)}" data-link class="nav-link ${active === to ? "active" : ""}">${label}</a>`)
    .join("");

  const mobileActions = user
    ? mobileAccountActionsMarkup(user)
    : `
      <a href="/chat" data-link class="btn btn-secondary" style="display:flex;align-items:center;justify-content:center;gap:0.5rem;">${icon("message")} Chat NutriAI</a>
      <a href="/login" data-link class="btn btn-secondary">Entrar</a>
      <a href="/cadastro" data-link class="btn btn-dark">Começar grátis</a>
    `;

  return `
    <header class="site-header">
      <nav class="site-nav container">
        <a href="/" class="brand" aria-label="NutriNow">${brandMarkup()}</a>
        <div class="nav-links">${navLinks}</div>
        <div class="nav-actions">${desktopActions}</div>
        <button class="icon-btn mobile-menu-button" data-action="toggle-mobile-menu" aria-label="Abrir menu">
          ${icon("menu", "icon-lg")}
        </button>
      </nav>
      <div class="mobile-panel" data-mobile-panel>
        <div class="mobile-panel-inner container">
          ${mobileLinks}
          ${mobileActions}
        </div>
      </div>
    </header>
  `;
}

export function footerMarkup() {
  return `
    <footer class="site-footer">
      <div class="footer-inner container">
        <a href="/" class="brand">
          <span class="brand-logo" style="width:1.75rem;height:1.75rem;border-radius:.55rem;background:var(--gradient-hero);color:var(--primary-foreground);box-shadow:none;">
            ${icon("leaf")}
          </span>
          <span>NutriNow</span>
        </a>
        <div class="footer-side">
          <a href="/termos" data-link>Termos</a>
          <a href="/privacidade" data-link>Privacidade</a>
          <a href="/lgpd" data-link>LGPD</a>
          <a href="/feedbacks" data-link class="icon-btn" aria-label="Abrir página de feedbacks" title="Feedbacks">
            ${icon("message", "icon-lg")}
          </a>
          <p class="text-muted">© ${new Date().getFullYear()} NutriNow. Feito com cuidado para sua saúde.</p>
        </div>
      </div>
    </footer>
  `;
}

export function pageShell(content, active = "") {
  return `<div class="app-shell">${headerMarkup(active)}${content}</div>`;
}

const PREMIUM_PATHS = new Set(["/dashboard", "/planos", "/calendario"]);

export function premiumModalMarkup(path) {
  const titles = {
    "/dashboard": "Dashboard",
    "/planos": "Dietas e Treinos",
    "/calendario": "Calendario",
  };
  const title = titles[path] || "Recurso premium";
  return `
    <div class="modal-backdrop premium-modal-backdrop" role="presentation" data-premium-modal>
      <section class="modal-card premium-modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <span class="badge">${icon("lock")} Conta Free</span>
            <h2>${escapeHtml(title)}</h2>
            <p class="text-muted" style="margin-top:.45rem;line-height:1.55;">Esse recurso esta disponivel apenas no plano premium.</p>
          </div>
        </div>
        <div class="premium-modal-actions">
          <button type="button" class="btn btn-primary" data-action="pay-premium">${icon("sparkles")} Pagar</button>
          <button type="button" class="btn btn-secondary" data-action="close-premium-modal">${icon("x")} Fechar</button>
        </div>
      </section>
    </div>
  `;
}

function openPremiumModal(path) {
  const existing = document.querySelector("[data-premium-modal]");
  if (existing) existing.remove();
  const shell = document.querySelector(".app-shell") || document.getElementById("app");
  if (!shell) return;
  shell.insertAdjacentHTML("beforeend", premiumModalMarkup(path));
}

function closePremiumModal() {
  const backdrop = document.querySelector("[data-premium-modal]");
  if (backdrop) backdrop.remove();
}

export function analyticsConsentMarkup() {
  const consent = localStorage.getItem("nutrinow_analytics_consent") || "";
  if (consent) return "";
  return `
    <div class="consent-banner" data-consent-banner>
      <p>Usamos analytics próprio e anônimo para melhorar sua experiência.</p>
      <div class="consent-actions">
        <button class="btn btn-primary btn-sm" data-action="accept-analytics">Aceitar</button>
        <button class="btn btn-ghost btn-sm" data-action="decline-analytics">Recusar</button>
      </div>
    </div>
  `;
}

export function fieldMarkup(label, name, type, options = {}) {
  const { icon: icn, placeholder, autocomplete, required, minlength, value, helpText, passwordToggle, step, min, max } = options;
  const toggleBtn = passwordToggle
    ? `<button type="button" class="icon-btn password-toggle" data-toggle-password="${name}" aria-label="Mostrar senha" tabindex="-1">${icon("eye")}</button>`
    : "";
  const help = helpText ? `<p class="text-muted" style="font-size:.75rem;margin-top:.2rem;">${escapeHtml(helpText)}</p>` : "";
  return `
    <div class="field">
      <label for="field-${name}">${label}</label>
      <div class="input-wrap">
        ${icn ? `<span class="input-icon">${icon(icn)}</span>` : ""}
        <input id="field-${name}" class="input" type="${type}" name="${name}"
          ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ""}
          ${autocomplete ? `autocomplete="${escapeHtml(autocomplete)}"` : ""}
          ${required ? "required" : ""}
          ${minlength ? `minlength="${minlength}"` : ""}
          ${step ? `step="${escapeHtml(step)}"` : ""}
          ${min ? `min="${escapeHtml(min)}"` : ""}
          ${max !== undefined ? `max="${escapeHtml(String(max))}"` : ""}
          ${value !== undefined ? `value="${escapeHtml(String(value))}"` : ""}>
        ${toggleBtn}
      </div>
      ${help}
    </div>
  `;
}

export function bindGlobalEvents(app) {
  if (!app) return;

  app.querySelectorAll('[data-action="toggle-mobile-menu"]').forEach((button) => {
    button.addEventListener("click", () => {
      app.querySelector("[data-mobile-panel]")?.classList.toggle("open");
    });
  });

  app.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener("click", async () => {
      await logoutFromBackend();
      window.location.href = "/";
    });
  });

  app.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = app.querySelector(`[name="${button.dataset.togglePassword}"]`);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.innerHTML = icon(isPassword ? "eyeOff" : "eye");
    });
  });

  app.querySelectorAll('[data-action="accept-analytics"]').forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.setItem("nutrinow_analytics_consent", "accepted");
      app.querySelector("[data-consent-banner]")?.remove();
    });
  });

  app.querySelectorAll('[data-action="decline-analytics"]').forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.setItem("nutrinow_analytics_consent", "declined");
      app.querySelector("[data-consent-banner]")?.remove();
    });
  });

  app.querySelectorAll("[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      event.preventDefault();
      const user = getUser();
      const normalized = normalizePath(href);
      if (user && !isPremiumUser(user) && PREMIUM_PATHS.has(normalized)) {
        openPremiumModal(normalized);
        return;
      }
      navigate(href);
    });
  });
}

document.addEventListener("click", (event) => {
  const payBtn = event.target.closest('[data-action="pay-premium"]');
  if (payBtn) {
    const url = (window.NUTRINOW_CHECKOUT_URL || window.NUTRINOW_PAYMENT_URL || "").trim();
    if (url) { window.location.href = url; return; }
    navigate("/planos");
    return;
  }
  const closeBtn = event.target.closest('[data-action="close-premium-modal"]');
  if (closeBtn) {
    closePremiumModal();
  }
});
