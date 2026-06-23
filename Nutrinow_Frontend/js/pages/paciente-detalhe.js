import { pageShell, footerMarkup, bindGlobalEvents } from '../shared/ui.js';
import { getUser, getToken, apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage, isProfessionalUser } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

let state = {
  patient: { loaded: false, loading: false, data: null, error: "" },
  savingNote: false,
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

  const params = new URLSearchParams(location.search);
  const patientId = params.get("id") || "";

  if (!patientId) {
    import('./pacientes.js').then((m) => m.renderPage());
    return;
  }

  const p = state.patient.data || {};

  app.innerHTML = pageShell(`
    <main class="page-main">
      <div class="container" style="max-width:60rem;">
        <a href="/pacientes" data-link class="btn btn-secondary">${icon("arrowLeft")} Voltar para pacientes</a>
        ${state.patient.error ? `<div class="alert" style="margin-top:1rem;">${icon("alert")} ${escapeHtml(state.patient.error)}</div>` : ""}
        ${state.patient.loading ? `<div class="empty-state" style="margin-top:2rem;">${icon("user")} <h3>Carregando paciente...</h3></div>` : !state.patient.data ? `<div class="empty-state" style="margin-top:2rem;">${icon("user")} <h3>Paciente nao encontrado.</h3></div>` : `
          <section class="patient-detail-hero" style="margin-top:1.5rem;">
            <div class="patient-detail-avatar">
              <span>${escapeHtml(getInitials(p.nome))}</span>
            </div>
            <div>
              <h1 style="font-size:clamp(1.5rem,4vw,2.25rem);">${escapeHtml(p.nome)}</h1>
              <p class="text-muted">${p.email ? escapeHtml(p.email) : "Sem email"}</p>
              <div class="patient-detail-meta" style="margin-top:.75rem;">
                ${p.peso ? `<span>${icon("scale")} ${escapeHtml(p.peso)} kg</span>` : ""}
                ${p.altura ? `<span>${icon("ruler")} ${escapeHtml(p.altura)} m</span>` : ""}
                ${p.plano ? `<span class="badge">${escapeHtml(p.plano)}</span>` : ""}
              </div>
            </div>
          </section>
          <div class="patient-detail-grid" style="margin-top:2rem;">
            <section class="patient-section">
              <h2>Anotacoes</h2>
              <form class="form" data-form="patient-note" style="margin-top:1rem;">
                <div class="field">
                  <textarea name="conteudo" class="textarea" required placeholder="Adicionar observacao sobre o paciente..." rows="3"></textarea>
                </div>
                <div data-form-error></div>
                <button class="btn btn-primary btn-sm" type="submit" ${state.savingNote ? "disabled" : ""}>${icon("save")} ${state.savingNote ? "Salvando..." : "Adicionar"}</button>
              </form>
              <div style="margin-top:1rem;">
                ${patientNotesMarkup(p.notes || [])}
              </div>
            </section>
            <section class="patient-section">
              <h2>Informacoes do plano</h2>
              ${p.plano_info ? `
                <div class="patient-info-card" style="margin-top:1rem;">
                  <p><strong>Plano:</strong> ${escapeHtml(p.plano_info.nome || p.plano || "Nao definido")}</p>
                  ${p.plano_info.inicio ? `<p><strong>Inicio:</strong> ${formatDate(p.plano_info.inicio)}</p>` : ""}
                  ${p.plano_info.termino ? `<p><strong>Termino:</strong> ${formatDate(p.plano_info.termino)}</p>` : ""}
                  ${p.plano_info.descricao ? `<p style="margin-top:.5rem;">${escapeHtml(p.plano_info.descricao)}</p>` : ""}
                </div>
              ` : `
                <div class="empty-state compact" style="margin-top:1rem;">${icon("leaf")} <h3>Nenhum plano associado.</h3></div>
              `}
            </section>
          </div>
        `}
      </div>
    </main>
    ${footerMarkup()}
  `, path);

  bindGlobalEvents(app);
  bindPatientDetail(app, patientId);
  loadPatientData(patientId);
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

function patientNotesMarkup(notes) {
  if (!notes.length) return `<p class="text-muted">Nenhuma anotacao registrada para este paciente.</p>`;
  return `
    <div class="notes-list">
      ${notes.map((n) => `
        <article class="note-card">
          <div class="note-card-top">
            <small class="text-muted">${formatDateTime(n.createdAt)}</small>
            ${n.canDelete ? `<button class="btn btn-ghost btn-sm text-danger" data-action="delete-patient-note" data-id="${escapeHtml(n.id)}">${icon("trash")}</button>` : ""}
          </div>
          <p class="note-card-body">${escapeHtml(n.conteudo)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function mapPatient(raw) {
  return {
    id: raw.id || "",
    nome: raw.nome || raw.name || "Paciente",
    email: raw.email || "",
    peso: raw.peso || raw.weight || "",
    altura: raw.altura || raw.height || "",
    plano: raw.plano || raw.plan || "",
    plan: raw.plano || raw.plan || "",
    plano_info: raw.plano_info || raw.plan_info || null,
    notes: (raw.notes || raw.anotacoes || []).map(mapNote),
  };
}

function mapNote(raw) {
  return {
    id: raw.id || "",
    conteudo: raw.conteudo || raw.content || raw.text || "",
    createdAt: raw.createdAt || raw.created_at || "",
    canDelete: Boolean(raw.canDelete),
  };
}

function setFormError(form, message) {
  const target = form.querySelector("[data-form-error]");
  if (target) target.innerHTML = message ? `<div class="alert">${icon("alert")} ${escapeHtml(message)}</div>` : "";
}

function bindPatientDetail(app, patientId) {
  app.querySelectorAll('[data-action="delete-patient-note"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const noteId = button.dataset.id;
      if (!noteId || !confirm("Excluir esta anotacao?")) return;
      const patient = state.patient.data;
      if (!patient) return;
      const previous = [...(patient.notes || [])];
      patient.notes = patient.notes.filter((n) => String(n.id) !== String(noteId));
      renderPage();
      try {
        await apiRequest(`/anotacoes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
      } catch (error) {
        patient.notes = previous;
        state.patient.error = getErrorMessage(error, "Erro ao excluir anotacao");
        renderPage();
      }
    });
  });

  const form = app.querySelector('[data-form="patient-note"]');
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const conteudo = String(data.get("conteudo") || "").trim();
      if (!conteudo) return setFormError(form, "Escreva o conteudo da anotacao.");
      setFormError(form, "");
      state.savingNote = true;
      renderPage();
      try {
        const result = await apiRequest("/anotacoes", {
          method: "POST",
          body: JSON.stringify({ paciente_id: patientId, conteudo }),
        });
        const created = result.note || result.anotacao || { id: result.id || `local-${Date.now()}`, conteudo, createdAt: new Date().toISOString(), canDelete: true };
        if (state.patient.data) {
          state.patient.data.notes = [mapNote(created), ...(state.patient.data.notes || [])];
        }
        state.savingNote = false;
        renderPage();
      } catch (error) {
        setFormError(form, getErrorMessage(error, "Erro ao salvar anotacao"));
        state.savingNote = false;
        renderPage();
      }
    });
  }
}

async function loadPatientData(patientId, force = false) {
  if (!force && (state.patient.loaded || state.patient.loading)) return;

  state.patient.loading = true;
  state.patient.error = "";

  try {
    const data = await apiRequest(`/pacientes/${encodeURIComponent(patientId)}`);
    state.patient.data = mapPatient(data.patient || data || {});
    state.patient.loaded = true;
  } catch (error) {
    state.patient.error = getErrorMessage(error, "Erro ao carregar dados do paciente");
    state.patient.loaded = true;
  } finally {
    state.patient.loading = false;
    renderPage();
  }
}
