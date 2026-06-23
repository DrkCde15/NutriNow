import { pageShell, footerMarkup, bindGlobalEvents } from '../shared/ui.js';
import { getUser, getToken, apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage, isProfessionalUser } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

let state = {
  patients: { loaded: false, loading: false, items: [], error: "" },
};

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());
  const user = getUser();

  if (!user) {
    import('./login.js').then((m) => m.renderPage());
    return;
  }
  if (!isProfessionalUser(user)) {
    import('./dashboard.js').then((m) => m.renderPage());
    return;
  }

  app.innerHTML = pageShell(`
    <main class="page-main">
      <div class="container" style="max-width:60rem;">
        <section class="page-head">
          <span class="badge">${icon("user")} Gest\u00e3o</span>
          <h1 style="margin-top:.5rem;">Meus Pacientes</h1>
          <p class="text-muted" style="margin-top:.35rem;">Gerencie os pacientes que acompanham seu plano nutricional e de treinos.</p>
        </section>
        ${state.patients.error ? `<div class="alert" style="margin-bottom:1rem;">${icon("alert")} ${escapeHtml(state.patients.error)}</div>` : ""}
        <section>
          ${patientsListMarkup()}
        </section>
      </div>
    </main>
    ${footerMarkup()}
  `, path);

  bindGlobalEvents(app);
  loadPatientsData();
}

function patientsListMarkup() {
  const patients = state.patients.items;

  if (state.patients.loading && !state.patients.loaded) {
    return `<div class="empty-state">${icon("user")} <h3>Carregando pacientes...</h3></div>`;
  }

  if (!patients.length) {
    return `
      <div class="empty-state">
        ${icon("user")}
        <h3>Nenhum paciente encontrado</h3>
        <p class="text-muted">Os pacientes vinculados a voce aparecerao aqui.</p>
      </div>
    `;
  }

  return `
    <div class="patient-grid">
      ${patients.map((p) => `
        <article class="patient-card">
          <div class="patient-card-top">
            <div class="avatar-sm">${escapeHtml(getInitials(p.nome))}</div>
            <div>
              <strong>${escapeHtml(p.nome)}</strong>
              <small class="text-muted">${p.email ? escapeHtml(p.email) : "Sem email"}</small>
            </div>
          </div>
          <div class="patient-card-meta">
            ${p.ultima_consulta ? `<span>${icon("calendar")} Ultima consulta: ${formatDate(p.ultima_consulta)}</span>` : ""}
            ${p.plano ? `<span>${icon("leaf")} ${escapeHtml(p.plano)}</span>` : ""}
          </div>
          <a href="/paciente-detalhe?id=${encodeURIComponent(p.id)}" data-link class="btn btn-secondary btn-sm" style="align-self:flex-start;">${icon("arrowRight")} Ver detalhes</a>
        </article>
      `).join("")}
    </div>
  `;
}

function getInitials(name) {
  return String(name || "P")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function mapPatient(raw) {
  return {
    id: raw.id || "",
    nome: raw.nome || raw.name || "Paciente",
    email: raw.email || "",
    ultima_consulta: raw.ultima_consulta || raw.last_appointment || "",
    plano: raw.plano || raw.plan || "",
  };
}

async function loadPatientsData(force = false) {
  if (!force && (state.patients.loaded || state.patients.loading)) return;

  state.patients.loading = true;
  state.patients.error = "";

  try {
    const data = await apiRequest("/pacientes");
    state.patients.items = (data.patients || data.items || data || []).map(mapPatient);
    state.patients.loaded = true;
  } catch (error) {
    state.patients.error = getErrorMessage(error, "Erro ao carregar pacientes");
    state.patients.loaded = true;
  } finally {
    state.patients.loading = false;
    renderPage();
  }
}
