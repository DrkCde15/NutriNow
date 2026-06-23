import { pageShell, footerMarkup, bindGlobalEvents } from '../shared/ui.js';
import { getUser, getToken, apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

let state = {
  feedbackRating: 0,
  feedbackSubmitted: false,
  feedbacks: { loaded: false, loading: false, deletingId: null, items: [], error: "" },
};

const FEEDBACK_REFRESH_INTERVAL_MS = 10000;
let feedbackRefreshTimer = null;

function _renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());

  app.innerHTML = pageShell(`
    <main class="page-main">
      <div class="container" style="max-width:50rem;">
        <a href="/" data-link class="btn btn-secondary">${icon("arrowLeft")} Voltar para a p\u00e1gina inicial</a>
        <section class="feedback-card" style="margin-top:1.5rem;">
          <div class="feedback-hero">
            <span class="feature-icon" style="width:2.75rem;height:2.75rem;margin:0;background:rgba(255,255,255,.15);box-shadow:none;">${icon("message", "icon-lg")}</span>
            <h1 style="margin-top:1rem;font-size:clamp(2rem,5vw,3rem);">Feedbacks do NutriNow</h1>
            <p style="margin-top:.6rem;max-width:42rem;color:rgba(255,255,255,.88);line-height:1.6;">Sua opini\u00e3o ajuda a gente a evoluir mais r\u00e1pido. Conta pra gente o que voc\u00ea gostou e o que podemos melhorar.</p>
          </div>
          <div class="feedback-body">
            ${state.feedbackSubmitted ? `
              <div class="success-box" style="display:block;text-align:center;">
                <h2>Obrigado pelo seu feedback!</h2>
                <p class="text-muted" style="margin-top:.5rem;">Sua mensagem foi registrada e vai nos ajudar a melhorar o NutriNow.</p>
                <button class="btn btn-secondary" style="margin-top:1.25rem;" data-action="new-feedback">Enviar outro feedback</button>
              </div>
            ` : `
              <form class="form" data-form="feedback">
                <div>
                  <p style="font-weight:800;">Como voc\u00ea avalia sua experi\u00eancia?</p>
                  <div class="rating-row">
                    ${[1, 2, 3, 4, 5].map((value) => `
                      <button class="rating-btn ${state.feedbackRating >= value ? "active" : ""}" type="button" data-rating="${value}">${icon("star")} ${value}</button>
                    `).join("")}
                  </div>
                </div>
                <div class="field">
                  <label for="field-name">Nome (opcional)</label>
                  <input id="field-name" class="input" type="text" name="name" autocomplete="name" placeholder="Seu nome">
                </div>
                <div class="field">
                  <label for="field-msg">Mensagem</label>
                  <textarea id="field-msg" name="message" class="textarea" required autocomplete="off" placeholder="Escreva seu feedback aqui..."></textarea>
                </div>
                <div data-form-error></div>
                <button class="btn btn-primary" type="submit">${icon("send")} Enviar feedback</button>
              </form>
            `}
          </div>
        </section>
        <div data-feedback-list-region>${feedbackListMarkup()}</div>
      </div>
    </main>
    ${footerMarkup()}
  `, path);

  bindGlobalEvents(app);
  bindFeedback(app);
  startFeedbackAutoRefresh();
  loadFeedbacksData();
}

function feedbackStarsMarkup(rating) {
  return Array.from({ length: 5 }, (_, index) => `<span class="${index < rating ? "active" : ""}">${icon("star")}</span>`).join("");
}

function feedbackItemMarkup(item) {
  const isDeleting = String(state.feedbacks.deletingId || "") === String(item.id || "");
  return `
    <article class="feedback-item">
      <div class="feedback-item-top">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${formatShortDate(item.createdAt)}</small>
        </div>
        <div class="feedback-item-actions">
          <div class="feedback-stars" aria-label="${item.rating} de 5 estrelas">${feedbackStarsMarkup(item.rating)}</div>
          ${item.canDelete ? `<button type="button" class="mini-icon danger" data-action="delete-feedback" data-id="${escapeHtml(item.id)}" aria-label="Excluir feedback" title="Excluir feedback" ${isDeleting ? "disabled" : ""}>${icon("trash")}</button>` : ""}
        </div>
      </div>
      <p class="feedback-message">${escapeHtml(item.message)}</p>
    </article>
  `;
}

function feedbackListMarkup() {
  const feedbacks = state.feedbacks.items;
  const statusMarkup = state.feedbacks.error
    ? `<div class="alert" style="margin-top:1rem;">${icon("alert")} ${escapeHtml(state.feedbacks.error)}</div>`
    : !state.feedbacks.loaded
      ? `<div class="empty-state compact">${icon("message")} <h3>Carregando feedbacks...</h3></div>`
      : !feedbacks.length
        ? `<div class="empty-state compact">${icon("message")} <h3>Ainda n\u00e3o h\u00e1 feedbacks publicados.</h3></div>`
        : "";
  return `
    <section class="feedback-list-section" aria-label="Feedbacks publicados">
      <div class="feedback-list-head">
        <div>
          <h2>Feedbacks publicados</h2>
          <p class="text-muted">Veja o que outros usu\u00e1rios contaram sobre a experi\u00eancia.</p>
        </div>
      </div>
      ${statusMarkup || `<div class="feedback-list">${feedbacks.map(feedbackItemMarkup).join("")}</div>`}
    </section>
  `;
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function mapFeedback(item) {
  return { id: item.id, name: item.name || "Anonimo", rating: Math.max(1, Math.min(Number(item.rating) || 0, 5)), message: item.message || "", createdAt: item.createdAt || item.created_at || "", canDelete: Boolean(item.canDelete) };
}

function setFormError(form, message) {
  const target = form.querySelector("[data-form-error]");
  if (target) target.innerHTML = message ? `<div class="alert">${icon("alert")} ${escapeHtml(message)}</div>` : "";
}

function updateFeedbackListRegion() {
  const region = document.getElementById('app')?.querySelector("[data-feedback-list-region]");
  if (!region) return false;
  region.innerHTML = feedbackListMarkup();
  bindFeedbackListActions();
  return true;
}

async function loadFeedbacksData(force = false, options = {}) {
  const { silent = false } = options;
  if (!force && state.feedbacks.loaded) return;
  if (state.feedbacks.loading) return;

  state.feedbacks.loading = !silent || !state.feedbacks.loaded;
  if (!silent) state.feedbacks.error = "";
  try {
    const data = await apiRequest("/api/feedbacks?limit=12");
    state.feedbacks.items = (data.items || []).map(mapFeedback);
    state.feedbacks.loaded = true;
    state.feedbacks.error = "";
  } catch (error) {
    if (!silent || !state.feedbacks.items.length) {
      state.feedbacks.error = getErrorMessage(error, "Erro ao carregar feedbacks");
    }
    state.feedbacks.loaded = true;
  } finally {
    state.feedbacks.loading = false;
    updateFeedbackListRegion();
  }
}

function bindFeedback(app) {
  app.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => {
      state.feedbackRating = Number(button.dataset.rating);
      _renderPage();
    });
  });

  app.querySelectorAll('[data-action="new-feedback"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.feedbackSubmitted = false;
      state.feedbackRating = 0;
      _renderPage();
    });
  });

  bindFeedbackListActions();

  const form = app.querySelector('[data-form="feedback"]');
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.feedbackRating) return setFormError(form, "Escolha uma nota para enviar seu feedback.");
      const data = new FormData(form);
      const message = String(data.get("message") || "").trim();
      if (!message) return setFormError(form, "Escreva uma mensagem.");
      setFormError(form, "");
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const payload = { rating: state.feedbackRating, name: String(data.get("name") || "").trim() || getUser()?.nome || "", message };
        const result = await apiRequest("/api/feedbacks", { method: "POST", body: JSON.stringify(payload) });
        const fb = result.feedback || { id: result.feedbackId || `local-${Date.now()}`, name: payload.name || "Anonimo", rating: payload.rating, message: payload.message, createdAt: new Date().toISOString(), canDelete: Boolean(getToken()) };
        state.feedbacks.items = [mapFeedback(fb), ...state.feedbacks.items.filter((f) => String(f.id) !== String(fb.id))].slice(0, 12);
        state.feedbacks.loaded = true;
        state.feedbacks.error = "";
        state.feedbackSubmitted = true;
        _renderPage();
        refreshFeedbackList();
      } catch (error) {
        setFormError(form, getErrorMessage(error, "N\u00e3o foi poss\u00edvel enviar o feedback"));
        button.disabled = false;
      }
    });
  }
}

function bindFeedbackListActions() {
  const app = document.getElementById('app');
  if (!app) return;
  app.querySelectorAll('[data-action="delete-feedback"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const feedbackId = button.dataset.id;
      if (!feedbackId || !confirm("Excluir este feedback?")) return;
      const previous = state.feedbacks.items;
      state.feedbacks.deletingId = feedbackId;
      state.feedbacks.error = "";
      state.feedbacks.items = previous.filter((f) => String(f.id) !== String(feedbackId));
      updateFeedbackListRegion();
      try {
        await apiRequest(`/api/feedbacks/${encodeURIComponent(feedbackId)}`, { method: "DELETE" });
        await loadFeedbacksData(true, { silent: true });
      } catch (error) {
        state.feedbacks.items = previous;
        state.feedbacks.error = getErrorMessage(error, "N\u00e3o foi poss\u00edvel excluir o feedback");
      } finally {
        state.feedbacks.deletingId = null;
        updateFeedbackListRegion();
      }
    });
  });
}

async function refreshFeedbackList() {
  if (normalizePath(getCurrentPath()) !== "/feedbacks" || document.hidden) return;
  await loadFeedbacksData(true, { silent: true });
  updateFeedbackListRegion();
}

function startFeedbackAutoRefresh() {
  if (feedbackRefreshTimer) return;
  feedbackRefreshTimer = window.setInterval(refreshFeedbackList, FEEDBACK_REFRESH_INTERVAL_MS);
}

function stopFeedbackAutoRefresh() {
  if (!feedbackRefreshTimer) return;
  window.clearInterval(feedbackRefreshTimer);
  feedbackRefreshTimer = null;
}

const _origRender = _renderPage;
export const renderPage = () => {
  stopFeedbackAutoRefresh();
  _origRender();
};

