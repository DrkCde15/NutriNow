import { pageShell, fieldMarkup, ASSETS, bindGlobalEvents } from '../shared/ui.js';
import { apiRequest, setToken, setUser, defaultAuthenticatedRoute, getUser } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage } from '../shared/utils.js';
import { icon, googleLogo } from '../shared/icons.js';

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());
  const user = getUser();
  if (user) {
    window.location.href = defaultAuthenticatedRoute(user);
    return;
  }

  app.innerHTML = pageShell(authShell(
    "Bem-vindo de volta",
    "Entre na sua conta para continuar sua jornada.",
    `
      <form class="form" data-form="login">
        ${fieldMarkup("Email", "email", "email", { icon: "mail", placeholder: "seu@email.com", autocomplete: "email", required: true })}
        ${fieldMarkup("Senha", "senha", "password", { icon: "lock", placeholder: "********", autocomplete: "current-password", required: true, passwordToggle: true })}
        <div style="display:flex;justify-content:flex-end;">
          <a href="/esqueci-senha" data-link class="text-primary" style="font-size:.9rem;font-weight:700;">Esqueci minha senha</a>
        </div>
        <div data-form-error></div>
        <button class="btn btn-primary" type="submit">${icon("login")} Entrar</button>
        <div class="divider"><span>Ou continue com</span></div>
        <button class="btn btn-secondary" type="button" data-action="google-oauth">${googleLogo()} Google</button>
      </form>
    `,
    `Ainda n\u00e3o tem conta? <a href="/cadastro" data-link class="text-primary" style="font-weight:800;">Cadastre-se gr\u00e1tis</a>`
  ), path);

  bindGlobalEvents(app);
  bindLoginForm(app);
}

function authShell(title, subtitle, body, footer) {
  return `
    <main>
      <div class="auth-layout">
        <section class="auth-panel">
          <a href="/" class="brand">
            <span class="brand-logo"><img src="${ASSETS.logo}" alt="NutriNow" width="36" height="36" decoding="async"></span>
            <span>Nutri<span class="text-primary">Now</span></span>
          </a>
          <div class="auth-form-wrap">
            <h1>${title}</h1>
            <p>${subtitle}</p>
            ${body}
            ${footer ? `<div class="auth-footer">${footer}</div>` : ""}
          </div>
        </section>
        <aside class="auth-visual">
          <img src="${ASSETS.hero}" alt="" loading="lazy" decoding="async" width="1280" height="960">
          <div class="auth-quote">
            <blockquote>"Mudei minha rotina em semanas. O NutriNow virou meu coach pessoal de bolso."</blockquote>
            <div class="auth-person">
              <span>A</span>
              <div>
                <strong>Amanda S.</strong>
                <p>Estudante de Nutri\u00e7\u00e3o</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  `;
}

function setFormError(form, message) {
  const target = form.querySelector("[data-form-error]");
  if (target) target.innerHTML = message ? `<div class="alert">${icon("alert")} ${escapeHtml(message)}</div>` : "";
}

function bindLoginForm(app) {
  const form = app.querySelector('[data-form="login"]');
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const senha = String(data.get("senha") || "");
    if (!email || !senha) return setFormError(form, "Preencha email e senha.");

    setFormError(form, "");
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.innerHTML = `${icon("login")} Entrando...`;

    try {
      const payload = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
        token: "",
      });
      setToken(payload.access_token || payload.token || "");
      if (payload.user) setUser(payload.user);
      window.location.href = defaultAuthenticatedRoute(payload.user);
    } catch (error) {
      setFormError(form, getErrorMessage(error, "Erro ao entrar"));
      button.disabled = false;
      button.innerHTML = `${icon("login")} Entrar`;
    }
  });

  const googleBtn = form.querySelector('[data-action="google-oauth"]');
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        const result = await apiRequest("/auth/login", { method: "GET", token: "" });
        if (result.auth_url) window.location.href = result.auth_url;
      } catch (error) {
        alert(getErrorMessage(error, "Erro ao conectar com o Google"));
      }
    });
  }
}
