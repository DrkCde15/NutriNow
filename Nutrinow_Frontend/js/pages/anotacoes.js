import { pageShell, footerMarkup, bindGlobalEvents } from '../shared/ui.js';
import { getUser, getToken, apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage, isProfessionalUser, todayInput } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

let state = {
  notes: { loaded: false, loading: false, items: [], error: "" },
  saving: false,
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
          <span class="badge">${icon("pencil")} Registros</span>
          <h1 style="margin-top:.5rem;">Anota\u00e7\u00f5es</h1>
          <p class="text-muted" style="margin-top:.35rem;">Registre observacoes sobre seus pacientes e consulte o historico.</p>
        </section>
        ${state.notes.error ? `<div class="alert" style="margin-bottom:1rem;">${icon("alert")} ${escapeHtml(state.notes.error)}</div>` : ""}
        <section class="note-form-section">
          <form class="form note-form" data-form="note">
            <div class="field">
              <label for="note-paciente">Paciente</label>
              <select id="note-paciente" class="select" name="paciente_id" required>
                <option value="">Selecione um paciente</option>
                ${patientOptionsMarkup()}
              </select>
            </div>
            <div class="field">
              <label for="note-conteudo">Anotacao</label>
              <textarea id="note-conteudo" name="conteudo" class="textarea" required placeholder="Escreva sua observacao aqui..." rows="4"></textarea>
            </div>
            <div data-form-error></div>
            <button class="btn btn-primary" type="submit" ${state.saving ? "disabled" : ""}>${icon("save")} ${state.saving ? "Salvando..." : "Salvar anotacao"}</button>
          </form>
        </section>
        <section class="notes-list-section" style="margin-top:2rem;">
          ${notesListMarkup()}
        </section>
      </div>
    </main>
    ${footerMarkup()}
  `, path);

  bindGlobalEvents(app);
  bindNotes(app);
  loadNotesData();
}

function patientOptionsMarkup() {
  const patients = state.patients || [];
  return patients.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nome)}</option>`).join("");
}

function notesListMarkup() {
  const notes = state.notes.items;

  if (state.notes.loading && !state.notes.loaded) {
    return `<div class="empty-state compact">${icon("pencil")} <h3>Carregando anotacoes...</h3></div>`;
  }

  if (!notes.length) {
    return `<div class="empty-state compact">${icon("pencil")} <h3>Nenhuma anotacao registrada.</h3></div>`;
  }

  return `
    <div class="notes-list">
      ${notes.map((n) => `
        <article class="note-card">
          <div class="note-card-top">
            <strong>${escapeHtml(n.paciente_nome || "Paciente")}</strong>
            <small class="text-muted">${formatDateTime(n.createdAt)}</small>
          </div>
          <p class="note-card-body">${escapeHtml(n.conteudo)}</p>
          ${n.canDelete ? `<button class="btn btn-ghost btn-sm text-danger" data-action="delete-note" data-id="${escapeHtml(n.id)}">${icon("trash")} Excluir</button>` : ""}
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

function mapNote(raw) {
  return {
    id: raw.id || "",
    paciente_id: raw.paciente_id || raw.patient_id || "",
    paciente_nome: raw.paciente_nome || raw.patient_name || "Paciente",
    conteudo: raw.conteudo || raw.content || raw.text || "",
    createdAt: raw.createdAt || raw.created_at || "",
    canDelete: Boolean(raw.canDelete),
  };
}

function mapPatient(raw) {
  return { id: raw.id || "", nome: raw.nome || raw.name || "Paciente" };
}

function setFormError(form, message) {
  const target = form.querySelector("[data-form-error]");
  if (target) target.innerHTML = message ? `<div class="alert">${icon("alert")} ${escapeHtml(message)}</div>` : "";
}

function bindNotes(app) {
  const form = app.querySelector('[data-form="note"]');
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const paciente_id = String(data.get("paciente_id") || "").trim();
      const conteudo = String(data.get("conteudo") || "").trim();
      if (!paciente_id) return setFormError(form, "Selecione um paciente.");
      if (!conteudo) return setFormError(form, "Escreva o conteudo da anotacao.");
      setFormError(form, "");
      state.saving = true;
      renderPage();
      try {
        const result = await apiRequest("/anotacoes", {
          method: "POST",
          body: JSON.stringify({ paciente_id, conteudo }),
        });
        const created = result.note || result.anotacao || { id: result.id || `local-${Date.now()}`, paciente_id, paciente_nome: state.patients.find((p) => String(p.id) === String(paciente_id))?.nome || "Paciente", conteudo, createdAt: new Date().toISOString(), canDelete: true };
        state.notes.items = [mapNote(created), ...state.notes.items];
        state.notes.loaded = true;
        state.saving = false;
        form.reset();
        renderPage();
      } catch (error) {
        setFormError(form, getErrorMessage(error, "Erro ao salvar anotacao"));
        state.saving = false;
        renderPage();
      }
    });
  }

  app.querySelectorAll('[data-action="delete-note"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const noteId = button.dataset.id;
      if (!noteId || !confirm("Excluir esta anotacao?")) return;
      const previous = state.notes.items;
      state.notes.items = previous.filter((n) => String(n.id) !== String(noteId));
      renderPage();
      try {
        await apiRequest(`/anotacoes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
      } catch (error) {
        state.notes.items = previous;
        state.notes.error = getErrorMessage(error, "Erro ao excluir anotacao");
        renderPage();
      }
    });
  });
}

async function loadPatientsForSelect() {
  try {
    const data = await apiRequest("/pacientes");
    state.patients = (data.patients || data.items || data || []).map(mapPatient);
  } catch {
    state.patients = [];
  }
}

async function loadNotesData(force = false) {
  if (!force && (state.notes.loaded || state.notes.loading)) return;

  state.notes.loading = true;
  state.notes.error = "";

  try {
    const [data] = await Promise.all([
      apiRequest("/anotacoes"),
      loadPatientsForSelect(),
    ]);
    state.notes.items = (data.notes || data.items || data || []).map(mapNote);
    state.notes.loaded = true;
  } catch (error) {
    state.notes.error = getErrorMessage(error, "Erro ao carregar anotacoes");
    state.notes.loaded = true;
  } finally {
    state.notes.loading = false;
    renderPage();
  }
}
