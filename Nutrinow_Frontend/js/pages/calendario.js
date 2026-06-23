import { pageShell, fieldMarkup, bindGlobalEvents, premiumModalMarkup } from '../shared/ui.js';
import { getUser, getToken, apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getFirstName, getErrorMessage, todayInput, addDays, parseDateOnly, timeInput, weekDayOptions, jsDayToGoogleDay, isPremiumUser } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

let state = {
  calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  calendarModal: null,
  calendarWeekdays: [],
  googleStatus: { loaded: false, loading: false, data: null, error: "" },
  googleMessage: "",
  googleError: "",
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
  const connected = isPremium && Boolean(state.googleStatus.data?.connected);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(state.calendarDate);

  app.innerHTML = pageShell(`
    <main class="page-main">
      <div class="container-wide">
        <div class="calendar-toolbar">
          <div>
            <h1 style="font-size:clamp(2rem,5vw,3rem);">Calend\u00e1rio para treinos e dietas</h1>
            <p class="text-muted" style="margin-top:.6rem;max-width:44rem;line-height:1.6;">Veja sua agenda do m\u00eas em um \u00fanico lugar. Os eventos s\u00e3o carregados da sua base atual de planos.</p>
          </div>
          <button class="btn btn-dark" data-action="open-calendar-modal">${icon("plus")} Adicionar item</button>
        </div>
        <section class="google-card">
          <div class="google-row">
            <div class="google-info">
              <span class="metric-icon" style="background:var(--secondary);color:var(--foreground);">${icon("calendar", "icon-lg")}</span>
              <div>
                <h2 style="font-size:1.05rem;">Google Calendar</h2>
                <p class="text-muted" style="margin-top:.25rem;">
                  ${state.googleStatus.loading ? "Verificando conex\u00e3o..." : connected ? `Conectado em ${escapeHtml(state.googleStatus.data?.calendarId || "primary")}` : "N\u00e3o conectado"}
                </p>
              </div>
            </div>
            <div class="google-actions">
              ${connected ? `
                <button class="btn btn-primary" data-action="sync-google">${icon("refresh")} For\u00e7ar sincroniza\u00e7\u00e3o</button>
                <button class="btn btn-secondary" data-action="disconnect-google">${icon("unlink")} Desconectar</button>
              ` : `<button class="btn btn-dark" data-action="connect-google">${icon("link")} Conectar</button>`}
            </div>
          </div>
          ${state.googleMessage || state.googleError ? `<div class="${state.googleError ? "alert" : "success-box"}" style="margin-top:1rem;">${icon(state.googleError ? "alert" : "checkCircle")} ${escapeHtml(state.googleError || state.googleMessage)}</div>` : ""}
        </section>
        <section class="calendar-card" style="margin-top:2rem;">
          <div class="calendar-head">
            <div>
              <p class="text-muted" style="font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em;">Agenda mensal</p>
              <h2>${escapeHtml(monthLabel)}</h2>
            </div>
            <div class="calendar-nav">
              <button class="icon-btn" data-action="prev-month" aria-label="M\u00eas anterior">${icon("chevronLeft", "icon-lg")}</button>
              <button class="icon-btn" data-action="next-month" aria-label="Pr\u00f3ximo m\u00eas">${icon("chevronRight", "icon-lg")}</button>
            </div>
          </div>
          ${calendarGridMarkup()}
        </section>
      </div>
    </main>
    ${calendarModalMarkup()}
    ${!isPremium ? premiumModalMarkup(path) : ""}
  `, path);

  bindGlobalEvents(app);
  bindCalendar(app);
  loadInitialData();
}

function calendarGridMarkup() {
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\u00e1b"];
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7) cells.push(null);
  const events = expandPlansForMonth(year, month);
  return `
    <div class="weekdays">${weekdays.map((day) => `<div class="weekday">${day}</div>`).join("")}</div>
    <div class="calendar-grid">
      ${cells.map((day, index) => {
        if (!day) return `<div class="day-cell empty" aria-hidden="true"></div>`;
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayEvents = events.filter((item) => item.dateKey === key);
        return `
          <div class="day-cell">
            <div class="day-top">
              <span class="day-number">${day}</span>
              <span class="day-count">${dayEvents.length} item${dayEvents.length === 1 ? "" : "s"}</span>
            </div>
            <div class="day-events">
              ${dayEvents.length ? dayEvents.map(calendarEventMarkup).join("") : `<div class="calendar-event" style="border-style:dashed;border-color:var(--border);background:transparent;color:var(--muted-foreground);">Sem agenda</div>`}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function expandPlansForMonth(year, month) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  return getPlans().flatMap((plan) => {
    const date = parseDateOnly(plan.scheduleDate || todayInput());
    const [hour = "08", minute = "00"] = String(plan.time || "08:00").match(/^\d{2}:\d{2}$/)
      ? String(plan.time).split(":") : ["08", "00"];
    date.setHours(Number(hour), Number(minute), 0, 0);

    if (plan.recurrenceType !== "weekly" || !Array.isArray(plan.recurrenceDays) || !plan.recurrenceDays.length) {
      if (date.getFullYear() !== year || date.getMonth() !== month) return [];
      return [makeCalendarEvent(plan, date, false)];
    }

    const until = plan.recurrenceUntil ? parseDateOnly(plan.recurrenceUntil) : monthEnd;
    until.setHours(23, 59, 59, 999);
    const events = [];
    const start = date > monthStart ? new Date(date) : new Date(monthStart);
    for (let cursor = new Date(start); cursor <= monthEnd && cursor <= until; cursor = addDays(cursor, 1)) {
      if (cursor < date) continue;
      if (!plan.recurrenceDays.includes(jsDayToGoogleDay[cursor.getDay()])) continue;
      const eventDate = new Date(cursor);
      eventDate.setHours(Number(hour), Number(minute), 0, 0);
      events.push(makeCalendarEvent(plan, eventDate, true));
    }
    return events;
  });
}

function makeCalendarEvent(plan, date, recurring) {
  return { ...plan, eventId: `${plan.id}-${todayInput(date)}`, date, dateKey: todayInput(date), recurring };
}

function calendarEventMarkup(item) {
  const isWorkout = item.tipo === "treino";
  const label = isWorkout ? "Treino" : "Dieta";
  const duration = item.durationMinutes ? ` \u2022 ${durationLabel(item.durationMinutes)}` : "";
  return `
    <article class="calendar-event ${isWorkout ? "workout" : "diet"}">
      <div class="event-title-row">
        <div class="event-title-text">
          <strong>${escapeHtml(item.title)}</strong>
          <small>${label} \u2022 ${escapeHtml(item.time || timeInput(item.date))}${duration}${item.recurring ? " \u2022 Semanal" : ""}</small>
        </div>
        <div class="event-actions">
          <button data-action="edit-calendar-item" data-id="${item.id}" title="Editar">${icon("pencil")}</button>
          <button data-action="delete-calendar-item" data-id="${item.id}" title="Excluir">${icon("trash")}</button>
        </div>
      </div>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `;
}

function durationLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h${String(rest).padStart(2, "0")}`;
  if (hours) return `${hours}h`;
  return `${rest}min`;
}

function calendarModalMarkup() {
  if (!state.calendarModal) return "";
  const editing = state.calendarModal.mode === "edit";
  const item = state.calendarModal.item || {
    tipo: "treino", title: "", description: "", scheduleDate: todayInput(), time: "08:00",
    durationMinutes: 120, recurrenceType: "none", recurrenceDays: [jsDayToGoogleDay[new Date().getDay()]],
    recurrenceUntil: todayInput(addDays(new Date(), 84)),
  };
  const isWeekly = item.recurrenceType === "weekly";
  const weekdays = state.calendarWeekdays.length ? state.calendarWeekdays : item.recurrenceDays || [];
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-card" data-modal-card>
        <div class="modal-head">
          <h2>${editing ? "Editar item" : "Adicionar item"}</h2>
          <button class="mini-icon" data-action="close-modal" aria-label="Fechar">${icon("x", "icon-lg")}</button>
        </div>
        <form class="form" data-form="calendar">
          <div class="segmented">
            <button type="button" class="${item.tipo === "treino" ? "active workout" : ""}" data-calendar-type="treino">Treino</button>
            <button type="button" class="${item.tipo === "dieta" ? "active diet" : ""}" data-calendar-type="dieta">Dieta</button>
          </div>
          <input type="hidden" name="tipo" value="${item.tipo}" autocomplete="off">
          ${fieldMarkup("T\u00edtulo", "title", "text", { placeholder: item.tipo === "treino" ? "Ex: Treino de pernas" : "Ex: Almo\u00e7o", value: item.title || "" })}
          <div class="field">
            <label for="field-desc-cal">Descri\u00e7\u00e3o</label>
            <textarea id="field-desc-cal" name="description" class="textarea" required autocomplete="off" placeholder="Detalhes...">${escapeHtml(item.description || "")}</textarea>
          </div>
          <div class="grid-2">
            ${fieldMarkup("Data", "scheduleDate", "date", { value: item.scheduleDate || todayInput() })}
            ${fieldMarkup("Hor\u00e1rio", "time", "time", { value: item.time || "08:00", required: false })}
          </div>
          ${fieldMarkup("Dura\u00e7\u00e3o (h)", "durationHours", "number", { value: ((item.durationMinutes || 60) / 60).toString(), min: "0.25", step: "0.25" })}
          <div class="slider-field" style="display:grid;gap:1rem;">
            <div class="segmented">
              <button type="button" class="${!isWeekly ? "active" : ""}" data-recurrence="none">\u00danico</button>
              <button type="button" class="${isWeekly ? "active" : ""}" data-recurrence="weekly">Semanal</button>
            </div>
            <input type="hidden" name="recurrenceType" value="${isWeekly ? "weekly" : "none"}" autocomplete="off">
            <div data-weekly-options class="${isWeekly ? "" : "hidden"}" style="display:grid;gap:1rem;">
              <div class="weekday-toggle-grid">
                ${weekDayOptions.map((day) => `
                  <button type="button" class="weekday-toggle ${weekdays.includes(day.code) ? "active" : ""}" data-weekday="${day.code}">${day.label}</button>
                `).join("")}
              </div>
              ${fieldMarkup("At\u00e9", "recurrenceUntil", "date", { value: item.recurrenceUntil || todayInput(addDays(new Date(), 84)) })}
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
            <button class="btn btn-primary" type="submit">${editing ? "Salvar" : "Adicionar"}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function getPlans() {
  return [...(state.plans.treino || []), ...(state.plans.dieta || [])];
}

async function loadInitialData() {
  const token = getToken();
  if (!token) return;

  if (!state.googleStatus.loaded && !state.googleStatus.loading) {
    state.googleStatus.loading = true;
    try {
      const data = await apiRequest("/calendar/google/status");
      state.googleStatus.data = data;
      state.googleStatus.loaded = true;
    } catch (error) {
      state.googleStatus.error = getErrorMessage(error, "Erro ao verificar Google Calendar");
    } finally {
      state.googleStatus.loading = false;
      renderPage();
    }
  }

  if ((!state.plans.treino || !state.plans.dieta) && !state.plans.loading) {
    state.plans.loading = true;
    try {
      const [treinoData, dietaData] = await Promise.all([
        apiRequest("/dieta-treino?tipo=treino"),
        apiRequest("/dieta-treino?tipo=dieta"),
      ]);
      state.plans.treino = (treinoData.items || []).map(normalizePlanItem);
      state.plans.dieta = (dietaData.items || []).map(normalizePlanItem);
    } catch (error) {
      state.plans.error = getErrorMessage(error, "Erro ao carregar planos");
    } finally {
      state.plans.loading = false;
      renderPage();
    }
  }
}

function normalizePlanItem(item) {
  const createdAt = item.created_at || item.createdAt || item.scheduleDate || item.date || "";
  const recurrenceDays = Array.isArray(item.recurrenceDays)
    ? item.recurrenceDays
    : Array.isArray(item.recurrence_days)
      ? item.recurrence_days
      : String(item.recurrence_days || "").split(",").map((day) => day.trim()).filter(Boolean);
  return {
    id: item.id, tipo: item.tipo, title: item.title || "", description: item.description || "",
    time: item.time || "", scheduleDate: item.scheduleDate || item.date || (createdAt ? todayInput(parseDateOnly(createdAt)) : todayInput()),
    durationMinutes: Number(item.duration_minutes || item.durationMinutes) || 60,
    recurrenceType: item.recurrence_type || item.recurrenceType || "none", recurrenceDays,
    recurrenceUntil: item.recurrence_until || item.recurrenceUntil || "", createdAt,
  };
}

function bindCalendar(app) {
  app.querySelectorAll('[data-action="prev-month"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="next-month"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="connect-google"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const result = await apiRequest("/calendar/google/connect", { method: "GET" });
        if (result.auth_url) window.location.href = result.auth_url;
      } catch (error) {
        state.googleError = getErrorMessage(error, "Erro ao conectar Google Calendar");
        state.googleMessage = "";
        renderPage();
      }
    });
  });

  app.querySelectorAll('[data-action="sync-google"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const result = await apiRequest("/calendar/google/sync", { method: "POST", body: JSON.stringify({}) });
        state.googleMessage = result.total === 0 ? "Nenhum item local para sincronizar." : `Sincroniza\u00e7\u00e3o conclu\u00edda: ${result.created} criado(s), ${result.updated} atualizado(s).`;
        state.googleError = result.failed?.length ? `${result.failed.length} item(ns) falharam.` : "";
      } catch (error) {
        state.googleError = getErrorMessage(error, "Erro ao sincronizar Google Calendar");
        state.googleMessage = "";
      }
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="disconnect-google"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Desconectar Google Calendar?")) return;
      try {
        await apiRequest("/calendar/google/disconnect", { method: "DELETE" });
        state.googleStatus.loaded = false;
        state.googleStatus.data = { connected: false };
        state.googleMessage = "Google Calendar desconectado.";
        state.googleError = "";
      } catch (error) {
        state.googleError = getErrorMessage(error, "Erro ao desconectar Google Calendar");
        state.googleMessage = "";
      }
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="open-calendar-modal"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.calendarModal = { mode: "new", item: null };
      state.calendarWeekdays = [jsDayToGoogleDay[new Date().getDay()]];
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="edit-calendar-item"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = getPlans().find((plan) => String(plan.id) === btn.dataset.id);
      if (!item) return;
      state.calendarModal = { mode: "edit", item };
      state.calendarWeekdays = Array.isArray(item.recurrenceDays) ? item.recurrenceDays : [];
      renderPage();
    });
  });

  app.querySelectorAll('[data-action="delete-calendar-item"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este item?")) return;
      try {
        await apiRequest(`/dieta-treino/${btn.dataset.id}`, { method: "DELETE" });
        state.plans.treino = null;
        state.plans.dieta = null;
        state.googleMessage = "Item exclu\u00eddo do calend\u00e1rio.";
        state.googleError = "";
        await loadInitialData();
      } catch (error) {
        state.googleError = getErrorMessage(error, "Erro ao excluir item");
        state.googleMessage = "";
        renderPage();
      }
    });
  });

  app.querySelectorAll("[data-calendar-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest("form");
      form.querySelector('input[name="tipo"]').value = btn.dataset.calendarType;
      form.querySelectorAll("[data-calendar-type]").forEach((node) => node.classList.remove("active", "workout", "diet"));
      btn.classList.add("active", btn.dataset.calendarType === "treino" ? "workout" : "diet");
    });
  });

  app.querySelectorAll("[data-recurrence]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest("form");
      form.querySelector('input[name="recurrenceType"]').value = btn.dataset.recurrence;
      form.querySelectorAll("[data-recurrence]").forEach((node) => node.classList.remove("active"));
      btn.classList.add("active");
      form.querySelector("[data-weekly-options]").classList.toggle("hidden", btn.dataset.recurrence !== "weekly");
    });
  });

  app.querySelectorAll("[data-weekday]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const active = app.querySelectorAll("[data-weekday].active");
      if (!active.length) btn.classList.add("active");
    });
  });

  const form = app.querySelector('[data-form="calendar"]');
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const recurrenceType = String(data.get("recurrenceType") || "none");
      const activeDays = Array.from(form.querySelectorAll("[data-weekday].active")).map((node) => node.dataset.weekday);
      const durationHours = Number(data.get("durationHours"));
      const payload = {
        tipo: String(data.get("tipo") || "treino"),
        title: String(data.get("title") || "").trim(),
        description: String(data.get("description") || "").trim(),
        scheduleDate: String(data.get("scheduleDate") || todayInput()),
        time: String(data.get("time") || "08:00"),
        durationMinutes: Math.max(15, Math.round((Number.isFinite(durationHours) ? durationHours : 1) * 60)),
        recurrenceType,
        recurrenceDays: recurrenceType === "weekly" ? activeDays : [],
        recurrenceUntil: recurrenceType === "weekly" ? String(data.get("recurrenceUntil") || "") : "",
      };
      const button = form.querySelector('button[type="submit"]');
      const editing = state.calendarModal.mode === "edit";
      button.disabled = true;
      try {
        await apiRequest(editing ? `/dieta-treino/${state.calendarModal.item.id}` : "/dieta-treino", {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({
            tipo: payload.tipo, title: payload.title, description: payload.description,
            date: payload.scheduleDate, time: payload.time || null,
            durationMinutes: payload.durationMinutes, recurrenceType: payload.recurrenceType,
            recurrenceDays: payload.recurrenceDays, recurrenceUntil: payload.recurrenceUntil || null,
          }),
        });
        state.plans.treino = null;
        state.plans.dieta = null;
        state.googleMessage = `${payload.tipo === "treino" ? "Treino" : "Item"} ${editing ? "atualizado" : "criado"} no calend\u00e1rio.`;
        state.googleError = "";
        state.calendarModal = null;
        await loadInitialData();
      } catch (error) {
        state.googleError = getErrorMessage(error, "Erro ao salvar item");
        state.googleMessage = "";
        button.disabled = false;
        renderPage();
      }
    });
  }

  app.querySelectorAll('[data-action="close-modal"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      if (event.target.closest("[data-modal-card]") && !event.target.closest('[data-action="close-modal"]')) return;
      state.calendarModal = null;
      renderPage();
    });
  });

  app.querySelectorAll("[data-modal-card]").forEach((card) => {
    card.addEventListener("click", (event) => event.stopPropagation());
  });
}
