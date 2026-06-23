import { pageShell, fieldMarkup, ASSETS, bindGlobalEvents } from '../shared/ui.js';
import { apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());

  app.innerHTML = pageShell(authShell(
    "Defina sua nova senha",
    "Escolha uma senha forte que voc\u00ea consiga lembrar.",
    `
      <form class="form" data-form="reset">
        ${fieldMarkup("Nova senha", "senha", "password", { icon: "lock", placeholder: "********", autocomplete: "new-password", required: true, minlength: 10, helpText: "M\u00ednimo de 10 caracteres" })}
        ${fieldMarkup("Confirmar nova senha", "confirmar", "password", { icon: "lock", placeholder: "********", autocomplete: "new-password", required: true })}
        <div data-form-error></div>
        <button class="btn btn-primary" type="submit">${icon("key")} Atualizar senha</button>
      </form>
    `,
    `<a href="/login" data-link class="text-primary" style="font-weight:800;">Voltar para o login</a>`
  ), path);

  bindGlobalEvents(app);
  bindResetForm(app);
}

function authShell(title, subtitle, body, footer) {
  const assets = { logo: "./assets/logo.png", hero: "./assets/hero-nutrition.jpg" };
  return `
    <main>
      <div class="auth-layout">
        <section class="auth-panel">
          <a href="/" class="brand">
            <span class="brand-logo"><img src="${assets.logo}" alt="NutriNow" width="36" height="36" decoding="async"></span>
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
          <img src="${assets.hero}" alt="" loading="lazy" decoding="async" width="1280" height="960">
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

function bindResetForm(app) {
  const form = app.querySelector('[data-form="reset"]');
  if (!form) return;

  const successBox = app.querySelector(".success-box");
  if (successBox) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const senha = String(data.get("senha") || "");
    const confirmar = String(data.get("confirmar") || "");

    if (senha.length < 10) return setFormError(form, "Senha deve ter ao menos 10 caracteres.");
    if (senha !== confirmar) return setFormError(form, "As senhas n\u00e3o coincidem.");

    const tokenFromUrl = new URLSearchParams(location.search).get("token") || "";
    if (!tokenFromUrl) return setFormError(form, "Token inv\u00e1lido ou ausente.");

    setFormError(form, "");
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      await apiRequest("/redefinir-senha", {
        method: "POST",
        body: JSON.stringify({ token: tokenFromUrl, nova_senha: senha }),
        token: "",
      });
      const authWrap = form.closest(".auth-form-wrap");
      if (authWrap) {
        authWrap.innerHTML = `
          <div class="success-box" style="display:block;text-align:center;margin-top:2rem;">
            ${icon("checkCircle", "icon-xl")}
            <h2 style="margin-top:1rem;">Senha atualizada!</h2>
            <p class="text-muted" style="margin-top:.5rem;">Voc\u00ea j\u00e1 pode voltar para o login.</p>
          </div>
          <div class="auth-footer" style="margin-top:1.5rem;">
            <a href="/login" data-link class="text-primary" style="font-weight:800;">Voltar para o login</a>
          </div>
        `;
      }
    } catch (error) {
      setFormError(form, getErrorMessage(error, "Erro ao redefinir senha"));
      button.disabled = false;
    }
  });
}
