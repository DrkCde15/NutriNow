import { pageShell, fieldMarkup, bindGlobalEvents, premiumModalMarkup } from '../shared/ui.js';
import { getUser, getToken, apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getFirstName, getErrorMessage, todayInput, addDays, parseDateOnly, isPremiumUser } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

let state = {
  planTab: "treino",
  planModal: null,
  plans: { treino: null, dieta: null, loading: false, error: "" },
};

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());
  const user = getUser();
  if (!user) {
    import('./login.js').then((m) => m.renderPage());
    return;
  }
  const isPremium = isPremiumUser(user);

  const plans = isPremium ? getPlans() : [];
  const visible = plans.filter((item) => item.tipo === state.planTab);
  const tabName = state.planTab === "treino" ? "treino" : "refei\u00e7\u00e3o";
  const needsLoad = getToken() && isPremium && !state.plans[state.planTab];
  const plansLoading = isPremium && (needsLoad || state.plans.loading);

  app.innerHTML = pageShell(`
    <main class="page-main">
      <div class="container">
        <div class="page-heading">
          <div>
            <span class="badge">${icon("sparkles")} Ol\u00e1, ${escapeHtml(getFirstName(user))}</span>
            <h1>Meus planos</h1>
            <p>Organize sua semana de treinos e refei\u00e7\u00f5es em um s\u00f3 lugar.</p>
          </div>
          <button class="btn btn-primary" data-action="open-plan-modal">${icon("plus")} Adicionar</button>
        </div>
        <div class="tabs">
          <button class="tab-btn ${state.planTab === "treino" ? "active" : ""}" data-plan-tab="treino">${icon("dumbbell")} Treinos</button>
          <button class="tab-btn ${state.planTab === "dieta" ? "active" : ""}" data-plan-tab="dieta">${icon("apple")} Dietas</button>
        </div>
        ${state.plans.error ? `<div class="alert" style="margin-top:1rem;">${icon("alert")} ${escapeHtml(state.plans.error)}</div>` : ""}
        ${plansLoading
          ? `<div class="empty-state"><h3>Carregando planos...</h3><p>Buscando seus itens.</p></div>`
          : visible.length
            ? `<div class="plans-grid">${visible.map(planCard).join("")}</div>`
            : `
              <div class="empty-state">
                ${icon("calendar", "icon")}
                <h3>Nenhum ${tabName} cadastrado</h3>
                <p>Comece adicionando seu primeiro item.</p>
                <button class="btn btn-primary" style="margin-top:1.5rem;" data-action="open-plan-modal">${icon("plus")} Adicionar agora</button>
              </div>
            `
        }
      </div>
    </main>
    ${planModalMarkup()}
    ${!isPremium ? premiumModalMarkup(path) : ""}
  `, path);

  bindGlobalEvents(app);
  bindPlans(app);
  loadPlansData();
}

function planCard(item) {
  const isWorkout = item.tipo === "treino";
  return `
    <article class="plan-card">
      <div class="plan-card-top">
        <span class="plan-type-icon ${isWorkout ? "workout" : "diet"}">${icon(isWorkout ? "dumbbell" : "apple", "icon-lg")}</span>
        <div class="plan-actions">
          <button class="mini-icon" data-action="edit-plan" data-id="${item.id}" aria-label="Editar">${icon("pencil")}</button>
          <button class="mini-icon danger" data-action="delete-plan" data-id="${item.id}" aria-label="Excluir">${icon("trash")}</button>
        </div>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
      ${item.time ? `<span class="time-pill">${icon("clock")} ${escapeHtml(item.time)}</span>` : ""}
    </article>
  `;
}

function planModalMarkup() {
  if (!state.planModal) return "";
  const editing = state.planModal.mode === "edit";
  const item = state.planModal.item || {};
  const label = state.planTab === "treino" ? "treino" : "refei\u00e7\u00e3o";
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-card" data-modal-card>
        <div class="modal-head">
          <div>
            <h2>${editing ? "Editar" : "Adicionar"} ${label}</h2>
            <p class="text-muted" style="margin-top:.35rem;">Preencha os detalhes abaixo.</p>
          </div>
          <button class="mini-icon" data-action="close-modal" aria-label="Fechar">${icon("x", "icon-lg")}</button>
        </div>
        <form class="form" data-form="plan">
          ${fieldMarkup("T\u00edtulo", "title", "text", { placeholder: state.planTab === "treino" ? "Ex: Treino de pernas" : "Ex: Caf\u00e9 da manh\u00e3", value: item.title || "" })}
          <div class="field">
            <label for="field-description">Descri\u00e7\u00e3o</label>
            <textarea id="field-description" name="description" class="textarea" required autocomplete="off" placeholder="Detalhes...">${escapeHtml(item.description || "")}</textarea>
          </div>
          ${fieldMarkup("Hor\u00e1rio (opcional)", "time", "text", { required: false, placeholder: "Ex: 08:00 ou P\u00f3s-treino", value: item.time || "" })}
          <div class="modal-actions">
            <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
            <button class="btn btn-primary" type="submit">${editing ? "Salvar" : "Adicionar"}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function normalizePlanItem(item) {
  const createdAt = item.created_at || item.createdAt || item.scheduleDate || item.date || "";
  const recurrenceDays = Array.isArray(item.recurrenceDays)
    ? item.recurrenceDays
    : Array.isArray(item.recurrence_days)
      ? item.recurrence_days
      : String(item.recurrence_days || "")
          .split(",")
          .map((day) => day.trim())
          .filter(Boolean);

  return {
    id: item.id,
    tipo: item.tipo,
    title: item.title || "",
    description: item.description || "",
    time: item.time || "",
    scheduleDate: item.scheduleDate || item.date || (createdAt ? todayInput(parseDateOnly(createdAt)) : todayInput()),
    durationMinutes: Number(item.duration_minutes || item.durationMinutes) || 60,
    recurrenceType: item.recurrence_type || item.recurrenceType || "none",
    recurrenceDays,
    recurrenceUntil: item.recurrence_until || item.recurrenceUntil || "",
    createdAt,
  };
}

function getPlans() {
  if (getToken()) {
    return [...(state.plans.treino || []), ...(state.plans.dieta || [])];
  }
  return defaultPlans();
}

function defaultPlans() {
  const today = todayInput();
  return [
    { id: 1, tipo: "treino", title: "Treino de for\u00e7a", description: "Agachamento, remada, supino e prancha. Intensidade moderada.", time: "08:00", scheduleDate: today, durationMinutes: 60, recurrenceType: "weekly", recurrenceDays: ["MO", "WE", "FR"], recurrenceUntil: todayInput(addDays(new Date(), 70)) },
    { id: 2, tipo: "dieta", title: "Caf\u00e9 da manh\u00e3 proteico", description: "Ovos mexidos, fruta e iogurte natural com aveia.", time: "07:20", scheduleDate: today, durationMinutes: 30, recurrenceType: "weekly", recurrenceDays: ["MO", "TU", "WE", "TH", "FR"], recurrenceUntil: todayInput(addDays(new Date(), 70)) },
  ];
}

async function loadPlansData() {
  if (!getToken()) return;
  if (state.plans[state.planTab] || state.plans.loading) return;

  state.plans.loading = true;
  state.plans.error = "";
  try {
    const data = await apiRequest(`/dieta-treino?tipo=${encodeURIComponent(state.planTab)}`);
    state.plans[state.planTab] = (data.items || []).map(normalizePlanItem);
  } catch (error) {
    state.plans.error = getErrorMessage(error, "Erro ao carregar planos");
  } finally {
    state.plans.loading = false;
    renderPage();
  }
}

function bindPlans(app) {
  app.querySelectorAll("[data-plan-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.planTab = button.dataset.planTab;
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="open-plan-modal"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.planModal = { mode: "new", item: null };
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="edit-plan"]').forEach((button) => {
    button.addEventListener("click", () => {
      const item = getPlans().find((plan) => String(plan.id) === button.dataset.id);
      if (!item) return;
      state.planModal = { mode: "edit", item };
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="delete-plan"]').forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Excluir este item?")) return;
      try {
        await apiRequest(`/dieta-treino/${button.dataset.id}`, { method: "DELETE" });
        state.plans[state.planTab] = (state.plans[state.planTab] || []).filter(
          (plan) => String(plan.id) !== button.dataset.id
        );
      } catch (error) {
        state.plans.error = getErrorMessage(error, "Erro ao excluir item");
      }
      renderPage();
    });
  });

  const form = app.querySelector('[data-form="plan"]');
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {
        title: String(data.get("title") || "").trim(),
        description: String(data.get("description") || "").trim(),
        time: String(data.get("time") || "").trim(),
        tipo: state.planTab,
      };
      if (!payload.title || !payload.description) return;

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        if (state.planModal.mode === "edit") {
          await apiRequest(`/dieta-treino/${state.planModal.item.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } else {
          await apiRequest("/dieta-treino", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
        state.plans[state.planTab] = null;
        state.planModal = null;
        await loadPlansData();
      } catch (error) {
        state.plans.error = getErrorMessage(error, "Erro ao salvar item");
        button.disabled = false;
        renderPage();
      }
    });
  }

  addModalCloseHandler(app);
}

function addModalCloseHandler(app) {
  app.querySelectorAll('[data-action="close-modal"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      if (event.target.closest("[data-modal-card]") && !event.target.closest('[data-action="close-modal"]')) return;
      state.planModal = null;
      renderPage();
    });
  });

  app.querySelectorAll("[data-modal-card]").forEach((card) => {
    card.addEventListener("click", (event) => event.stopPropagation());
  });
}
