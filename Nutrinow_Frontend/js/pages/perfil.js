import { pageShell, fieldMarkup, bindGlobalEvents } from '../shared/ui.js';
import { getUser, getToken, apiRequest, setUser } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getFirstName, getInitials, getErrorMessage, roleLabel } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

let state = {
  profile: { loaded: false, loading: false, data: null, error: "" },
  profileSaved: false,
};

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());
  const cachedUser = getUser();
  if (!cachedUser) {
    import('./login.js').then((m) => m.renderPage());
    return;
  }

  const profileData = state.profile.data || {};
  const user = { ...cachedUser, ...profileData, dataNascimento: profileData.dataNascimento ?? cachedUser.dataNascimento, jaTreinou: profileData.ja_treinou ?? cachedUser.jaTreinou, avatar: cachedUser.avatar || "" };
  const fullName = `${user.nome || ""} ${user.sobrenome || ""}`.trim() || "Usu\u00e1rio NutriNow";

  app.innerHTML = pageShell(`
    <main class="page-main">
      <div class="container" style="max-width:66rem;">
        <section class="profile-hero">
          <div class="profile-hero-inner">
            <div class="avatar-wrap">
              <div class="avatar" data-avatar-preview>
                ${user.avatar ? `<img src="${user.avatar}" alt="${escapeHtml(fullName)}">` : `<span>${escapeHtml(getInitials(fullName))}</span>`}
              </div>
              <button class="icon-btn avatar-button" data-action="pick-avatar" aria-label="Trocar avatar">${icon("camera")}</button>
              <input type="file" accept="image/*" class="hidden" data-avatar-input>
            </div>
            <div style="flex:1;">
              <span class="badge" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.25);color:var(--primary-foreground);">${icon("sparkles")} Membro NutriNow</span>
              <h1 style="margin-top:.8rem;font-size:clamp(2rem,5vw,3rem);">${escapeHtml(fullName)}</h1>
              <p style="margin-top:.25rem;color:rgba(255,255,255,.8);">${escapeHtml(user.email || "")}</p>
            </div>
            <button class="btn btn-white" data-action="logout">${icon("logout")} Sair</button>
          </div>
        </section>
        <section class="profile-card">
          <div class="form-head">
            <div>
              <h2>Informa\u00e7\u00f5es da conta</h2>
              <p class="text-muted" style="margin-top:.35rem;">Atualize os mesmos dados usados na experi\u00eancia do app.</p>
              ${state.profile.loading ? `<p class="text-muted" style="margin-top:.35rem;">Carregando perfil...</p>` : ""}
            </div>
            ${state.profileSaved ? `<span class="status-pill status-positive">${icon("check")} Salvo</span>` : ""}
          </div>
          ${state.profile.error ? `<div class="alert" style="margin-bottom:1rem;">${icon("alert")} ${escapeHtml(state.profile.error)}</div>` : ""}
          <form class="form" data-form="profile">
            <div class="grid-2">
              ${fieldMarkup("Nome", "nome", "text", { icon: "user", value: user.nome || "", autocomplete: "given-name" })}
              ${fieldMarkup("Sobrenome", "sobrenome", "text", { value: user.sobrenome || "", autocomplete: "family-name" })}
            </div>
            <div class="grid-2">
              <div class="field">
                <label for="field-genero">G\u00eanero</label>
                <select id="field-genero" class="select" name="genero" required autocomplete="sex">
                  <option value="Masculino" ${user.genero === "Masculino" ? "selected" : ""}>Masculino</option>
                  <option value="Feminino" ${user.genero === "Feminino" ? "selected" : ""}>Feminino</option>
                </select>
              </div>
              ${fieldMarkup("Data de nascimento", "dataNascimento", "date", { value: user.dataNascimento || "", autocomplete: "bday" })}
            </div>
            ${fieldMarkup("Email", "email", "email", { icon: "mail", value: user.email || "", autocomplete: "email" })}
            <div class="grid-2">
              ${fieldMarkup("Meta", "meta", "text", { required: false, value: user.meta || "N\u00e3o definida" })}
              <div class="field">
                <label for="field-jaTreinou">J\u00e1 treinou?</label>
                <select id="field-jaTreinou" class="select" name="jaTreinou" autocomplete="off">
                  <option value="Nunca treinou" ${user.jaTreinou === "Nunca treinou" ? "selected" : ""}>Nunca treinou</option>
                  <option value="Iniciante" ${user.jaTreinou === "Iniciante" ? "selected" : ""}>Iniciante</option>
                  <option value="Intermedi\u00e1rio" ${user.jaTreinou === "Intermedi\u00e1rio" ? "selected" : ""}>Intermedi\u00e1rio</option>
                  <option value="Avan\u00e7ado" ${user.jaTreinou === "Avan\u00e7ado" ? "selected" : ""}>Avan\u00e7ado</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              ${fieldMarkup("Altura (m)", "altura", "number", { required: false, value: user.altura || "", min: "0", step: "0.01", autocomplete: "off" })}
              ${fieldMarkup("Peso (kg)", "peso", "number", { required: false, value: user.peso || "", min: "0", step: "0.1", autocomplete: "off" })}
            </div>
            ${user.avatar ? `<button class="btn btn-ghost text-danger" style="justify-content:flex-start;padding-left:0;" type="button" data-action="remove-avatar">${icon("trash")} Remover avatar</button>` : ""}
            <div class="modal-actions" style="border-top:1px solid var(--border);padding-top:1.25rem;">
              <button class="btn btn-secondary" type="button" data-action="logout">${icon("logout")} Sair da conta</button>
              <button class="btn btn-primary" type="submit">${icon("save")} Salvar altera\u00e7\u00f5es</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  `, path);

  bindGlobalEvents(app);
  bindProfile(app);
  loadProfileData();
}

function bindProfile(app) {
  const fileInput = app.querySelector("[data-avatar-input]");
  app.querySelectorAll('[data-action="pick-avatar"]').forEach((btn) => {
    btn.addEventListener("click", () => fileInput?.click());
  });
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const selected = fileInput.files?.[0];
      if (!selected) return;
      const reader = new FileReader();
      reader.onload = () => {
        const user = getUser();
        setUser({ ...user, avatar: reader.result });
        renderPage();
      };
      reader.readAsDataURL(selected);
    });
  }

  app.querySelectorAll('[data-action="remove-avatar"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const user = getUser();
      setUser({ ...user, avatar: "" });
      renderPage();
    });
  });

  const form = app.querySelector('[data-form="profile"]');
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const user = getUser();
      const nextUser = {
        ...user,
        nome: String(data.get("nome") || "").trim(),
        sobrenome: String(data.get("sobrenome") || "").trim(),
        genero: String(data.get("genero") || "Masculino"),
        dataNascimento: String(data.get("dataNascimento") || ""),
        email: String(data.get("email") || "").trim(),
        meta: String(data.get("meta") || "N\u00e3o definida").trim() || "N\u00e3o definida",
        altura: Number(data.get("altura")) || "",
        peso: Number(data.get("peso")) || "",
        jaTreinou: String(data.get("jaTreinou") || "Nunca treinou"),
      };
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await apiRequest("/perfil", {
          method: "POST",
          body: JSON.stringify({
            nome: nextUser.nome, sobrenome: nextUser.sobrenome, genero: nextUser.genero,
            email: nextUser.email, dataNascimento: nextUser.dataNascimento,
            meta: nextUser.meta, altura: nextUser.altura ? Number(nextUser.altura) : null,
            peso: nextUser.peso ? Number(nextUser.peso) : null,
            ja_treinou: nextUser.jaTreinou,
          }),
        });
        setUser(nextUser);
        state.profile.data = { ...(state.profile.data || {}), ...nextUser, ja_treinou: nextUser.jaTreinou };
        state.profileSaved = true;
      } catch (error) {
        state.profile.error = getErrorMessage(error, "Erro ao salvar perfil");
      } finally {
        button.disabled = false;
      }
      renderPage();
      setTimeout(() => {
        state.profileSaved = false;
        if (normalizePath(getCurrentPath()) === "/perfil") renderPage();
      }, 1800);
    });
  }

  app.querySelectorAll('[data-action="logout"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { logoutFromBackend } = await import('../shared/api.js');
      await logoutFromBackend();
      window.location.href = "/";
    });
  });
}

async function loadProfileData() {
  const token = getToken();
  if (!token) return;
  if (state.profile.loaded || state.profile.loading) return;

  state.profile.loading = true;
  state.profile.error = "";
  try {
    const data = await apiRequest("/me");
    state.profile.data = data;
    state.profile.loaded = true;
    const user = getUser();
    if (user) {
      setUser({ ...user, nome: data.nome ?? user.nome, sobrenome: data.sobrenome ?? user.sobrenome, email: data.email ?? user.email, altura: data.altura ?? user.altura, peso: data.peso ?? user.peso, meta: data.meta ?? user.meta, genero: data.genero ?? user.genero, dataNascimento: data.dataNascimento ?? user.dataNascimento, jaTreinou: data.ja_treinou ?? user.jaTreinou });
    }
  } catch (error) {
    state.profile.error = getErrorMessage(error, "Erro ao carregar perfil");
  } finally {
    state.profile.loading = false;
    renderPage();
  }
}
