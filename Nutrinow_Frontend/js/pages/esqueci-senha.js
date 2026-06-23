import { pageShell, fieldMarkup, ASSETS, bindGlobalEvents } from '../shared/ui.js';
import { apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());

  app.innerHTML = pageShell(authShell(
    "Recuperar senha",
    "Enviaremos um link para voc\u00ea definir uma nova senha.",
    `
      <form class="form" data-form="forgot">
        ${fieldMarkup("Email cadastrado", "email", "email", { icon: "mail", placeholder: "seu@email.com", autocomplete: "email", required: true })}
        <button class="btn btn-primary" type="submit">${icon("send")} Enviar link de recupera\u00e7\u00e3o</button>
        <div data-form-error></div>
      </form>
    `,
    `<a href="/login" data-link class="text-primary" style="display:inline-flex;align-items:center;gap:.35rem;font-weight:800;">${icon("arrowLeft")} Voltar para o login</a>`
  ), path);

  bindGlobalEvents(app);
  bindForgotForm(app);
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

function bindForgotForm(app) {
  const form = app.querySelector('[data-form="forgot"]');
  if (!form) return;

  const successBox = app.querySelector(".success-box");
  if (successBox) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    setFormError(form, "");

    try {
      await apiRequest("/esqueci-senha", {
        method: "POST",
        body: JSON.stringify({ email: String(data.get("email") || "").trim() }),
        token: "",
      });
      const authWrap = form.closest(".auth-form-wrap");
      if (authWrap) {
        authWrap.innerHTML = `
          <div class="success-box" style="display:block;text-align:center;margin-top:2rem;">
            ${icon("checkCircle", "icon-xl")}
            <h2 style="margin-top:1rem;">Link enviado!</h2>
            <p class="text-muted" style="margin-top:.5rem;">Se o email informado estiver cadastrado, voc\u00ea receber\u00e1 um link em instantes.</p>
          </div>
          <div class="auth-footer" style="margin-top:1.5rem;">
            <a href="/login" data-link class="text-primary" style="display:inline-flex;align-items:center;gap:.35rem;font-weight:800;">${icon("arrowLeft")} Voltar para o login</a>
          </div>
        `;
      }
    } catch (error) {
      setFormError(form, getErrorMessage(error, "Falha ao solicitar recupera\u00e7\u00e3o"));
    }
  });
}
