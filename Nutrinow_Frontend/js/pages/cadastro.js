import { pageShell, fieldMarkup, ASSETS, bindGlobalEvents } from '../shared/ui.js';
import { apiRequest, setToken, setUser, defaultAuthenticatedRoute } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage } from '../shared/utils.js';
import { icon, googleLogo } from '../shared/icons.js';

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());

  app.innerHTML = pageShell(authShell(
    "Crie sua conta",
    "Escolha seu perfil e preencha os dados para come\u00e7ar.",
    `
      <form class="form" data-form="cadastro">
        <div class="grid-2">
          ${fieldMarkup("Nome", "nome", "text", { icon: "user", placeholder: "Nome", autocomplete: "given-name", required: true })}
          ${fieldMarkup("Sobrenome", "sobrenome", "text", { icon: "user", placeholder: "Sobrenome", autocomplete: "family-name", required: false })}
        </div>
        <div class="grid-2">
          ${fieldMarkup("Data de nascimento", "dataNascimento", "date", { autocomplete: "bday", required: false })}
          <div class="field">
            <label for="field-genero">G\u00eanero</label>
            <select id="field-genero" class="select" name="genero" required autocomplete="sex">
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
        </div>
        ${fieldMarkup("Email", "email", "email", { icon: "mail", placeholder: "Email", autocomplete: "email", required: true })}
        ${fieldMarkup("Senha", "senha", "password", { icon: "lock", placeholder: "Senha", autocomplete: "new-password", required: true, minlength: 10, helpText: "M\u00ednimo de 10 caracteres" })}

        <div class="role-selector-container animate-fade-up">
          <span class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Voc\u00ea \u00e9 um profissional da sa\u00fade?</span>
          <div class="role-cards-grid">
            <label class="role-card">
              <input type="radio" name="role" value="user" checked>
              <div class="role-card-inner">
                <span class="role-card-icon">${icon("user")}</span>
                <div class="role-card-text">
                  <strong>N\u00e3o</strong>
                  <span>Usu\u00e1rio comum</span>
                </div>
              </div>
            </label>
            <label class="role-card">
              <input type="radio" name="role" value="nutritionist">
              <div class="role-card-inner">
                <span class="role-card-icon" style="color:var(--primary);">${icon("leaf")}</span>
                <div class="role-card-text">
                  <strong>Nutricionista</strong>
                  <span>Prescrever dietas</span>
                </div>
              </div>
            </label>
            <label class="role-card">
              <input type="radio" name="role" value="personal_trainer">
              <div class="role-card-inner">
                <span class="role-card-icon" style="color:var(--accent);">${icon("dumbbell")}</span>
                <div class="role-card-text">
                  <strong>Personal Trainer</strong>
                  <span>Prescrever treinos</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div class="grid-2">
          ${fieldMarkup("Meta", "meta", "text", { required: false, placeholder: "Meta", autocomplete: "off" })}
          <div class="field">
            <label for="field-jaTreinou">J\u00e1 treinou?</label>
            <select id="field-jaTreinou" class="select" name="jaTreinou" autocomplete="off">
              <option value="Nunca treinou">Nunca treinou</option>
              <option value="Iniciante">Iniciante</option>
              <option value="Intermedi\u00e1rio">Intermedi\u00e1rio</option>
              <option value="Avan\u00e7ado">Avan\u00e7ado</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          ${fieldMarkup("Altura (m)", "altura", "number", { required: false, placeholder: "1.70", step: "0.01", min: "0", autocomplete: "off" })}
          ${fieldMarkup("Peso (kg)", "peso", "number", { required: false, placeholder: "68.5", step: "0.1", min: "0", autocomplete: "off" })}
        </div>
        <div data-form-error></div>
        <button class="btn btn-primary" type="submit">${icon("user")} Criar conta gr\u00e1tis</button>
        <div class="divider"><span>Ou cadastre-se com</span></div>
        <button class="btn btn-secondary" type="button" data-action="google-oauth">${googleLogo()} Google</button>
      </form>
    `,
    `J\u00e1 tem conta? <a href="/login" data-link class="text-primary" style="font-weight:800;">Fazer login</a>`
  ), path);

  bindGlobalEvents(app);
  bindCadastroForm(app);
}

function authShell(title, subtitle, body, footer) {
  const ASSETS_LOCAL = { logo: "./assets/logo.png", hero: "./assets/hero-nutrition.jpg" };
  return `
    <main>
      <div class="auth-layout">
        <section class="auth-panel">
          <a href="/" class="brand">
            <span class="brand-logo"><img src="${ASSETS_LOCAL.logo}" alt="NutriNow" width="36" height="36" decoding="async"></span>
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
          <img src="${ASSETS_LOCAL.hero}" alt="" loading="lazy" decoding="async" width="1280" height="960">
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

function bindCadastroForm(app) {
  const form = app.querySelector('[data-form="cadastro"]');
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const senha = String(data.get("senha") || "");
    if (senha.length < 10) return setFormError(form, "Senha deve ter ao menos 10 caracteres.");

    const nome = String(data.get("nome") || "").trim();
    const sobrenome = String(data.get("sobrenome") || "").trim();
    const email = String(data.get("email") || "").trim();

    setFormError(form, "");
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.innerHTML = `${icon("user")} Criando conta...`;

    try {
      const payload = await apiRequest("/cadastro", {
        method: "POST",
        body: JSON.stringify({
          nome,
          sobrenome,
          data_nascimento: String(data.get("dataNascimento") || ""),
          genero: String(data.get("genero") || "Masculino"),
          email,
          senha,
          meta: String(data.get("meta") || "").trim() || "N\u00e3o definida",
          altura: Number(data.get("altura")) || undefined,
          peso: Number(data.get("peso")) || undefined,
          ja_treinou: String(data.get("jaTreinou") || "Nunca treinou"),
          role: String(data.get("role") || "user"),
        }),
        token: "",
      });

      if (payload.access_token || payload.token) {
        setToken(payload.access_token || payload.token || "");
        if (payload.user) setUser(payload.user);
      } else {
        const loginPayload = await apiRequest("/login", {
          method: "POST",
          body: JSON.stringify({ email, senha }),
          token: "",
        });
        setToken(loginPayload.access_token || loginPayload.token || "");
        if (loginPayload.user) setUser(loginPayload.user);
      }

      const user = JSON.parse(localStorage.getItem("nutrinow_user") || "null");
      window.location.href = defaultAuthenticatedRoute(user);
    } catch (error) {
      setFormError(form, getErrorMessage(error, "Erro ao cadastrar"));
      button.disabled = false;
      button.innerHTML = `${icon("user")} Criar conta gr\u00e1tis`;
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
