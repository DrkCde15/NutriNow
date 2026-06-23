import { brandMarkup } from '../shared/ui.js';
import { getUser, getToken, apiRequest, STORAGE } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getFirstName, getErrorMessage, isProfessionalUser, isPremiumUser, readJson, writeJson, uid, todayInput, addDays, parseDateOnly, timeInput, jsDayToGoogleDay, weekDayOptions } from '../shared/utils.js';
import { icon, ICONS } from '../shared/icons.js';

const ASSETS_LOCAL = { logo: "./assets/logo.png" };
let state = {
  chatSidebarOpen: false,
  chatSearch: "",
  chatTyping: false,
  chatCalendarMessage: "",
  chatCalendarError: "",
  chatSessions: { loaded: false, loading: false, items: null, error: "" },
  chatHistory: {},
  calendarModal: null,
  calendarWeekdays: [],
  plans: { treino: null, dieta: null, loading: false, error: "" },
};

export function renderPage() {
  const app = document.getElementById('app');
  const user = getUser();
  const premium = isPremiumUser(user);
  const currentId = getCurrentSessionId();
  const sessions = getChatSessions();
  const current = sessions.find((session) => session.id === currentId);
  const messages = state.chatHistory[currentId]?.length
    ? state.chatHistory[currentId]
    : current?.messages?.length
      ? current.messages
      : [welcomeMessage()];
  const query = normalizeText(state.chatSearch);
  const visibleSessions = query
    ? sessions.filter((session) => normalizeText(`${session.title} ${session.preview}`).includes(query))
    : sessions;
  const hasOnlyWelcome = messages.length <= 1 && messages.every((message) => !message.isUser);

  app.innerHTML = `
    <div class="chat-page">
      <header class="chat-topbar">
        <div class="chat-topbar-left">
          <button class="icon-btn open-sidebar-button" data-action="open-chat-sidebar" aria-label="Abrir hist\u00f3rico">${icon("menu", "icon-lg")}</button>
          <a href="/" data-link class="brand">${brandMarkup()}</a>
        </div>
        <nav class="chat-nav">
          ${chatNavLink("/chat", "message", "Chat", true)}
          ${!user ? `
            <a href="/login" data-link class="chat-nav-link" style="margin-top:auto;">Entrar</a>
            <a href="/cadastro" data-link class="chat-nav-link" style="color:var(--primary);font-weight:600;">Criar conta gr\u00e1tis</a>
          ` : isProfessionalUser(user) ? `
            ${chatNavLink("/pacientes", "user", "Pacientes")}
            ${chatNavLink("/anotacoes", "message", "Anota\u00e7\u00f5es")}
            <div style="flex:1;"></div>
            ${chatNavLink("/perfil", "user", getFirstName(user))}
            <button class="chat-nav-link" data-action="logout">${icon("logout")} Sair</button>
          ` : `
            ${premium ? "" : chatNavLink("/feedbacks", "message", "Feedbacks")}
            ${chatNavLink("/dashboard", "layout", "Dashboard")}
            ${chatNavLink("/planos", "dumbbell", "Planos")}
            ${chatNavLink("/calendario", "calendar", "Calend\u00e1rio")}
            <div style="flex:1;"></div>
            ${chatNavLink("/perfil", "user", getFirstName(user))}
            <button class="chat-nav-link" data-action="logout">${icon("logout")} Sair</button>
          `}
        </nav>
      </header>
      <main class="chat-shell">
        <button class="chat-backdrop ${state.chatSidebarOpen ? "open" : ""}" data-action="close-chat-sidebar" aria-label="Fechar hist\u00f3rico"></button>
        <aside class="chat-sidebar ${state.chatSidebarOpen ? "open" : ""}">
          <div class="chat-sidebar-head">
            <div>
              <p class="text-primary" style="font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Hist\u00f3rico</p>
              <h2 style="font-size:1.1rem;">Conversas</h2>
            </div>
            <button class="mini-icon close-sidebar" data-action="close-chat-sidebar" aria-label="Fechar hist\u00f3rico">${icon("x", "icon-lg")}</button>
          </div>
          <div class="chat-sidebar-actions">
            <button class="btn btn-primary" data-action="new-chat">${icon("plus")} Novo chat</button>
            <label class="chat-search">${icon("search")}<input value="${escapeHtml(state.chatSearch)}" data-chat-search autocomplete="off" placeholder="Buscar chats"></label>
          </div>
          <div class="chat-history">
            <p class="history-title">Recentes</p>
            ${visibleSessions.length ? visibleSessions.map((session) => historyRow(session, session.id === currentId)).join("") : `<div class="empty-state" style="margin:0;padding:1.5rem;">${icon("message")}<h3>Sem conversas</h3><p>As consultas salvas aparecem aqui.</p></div>`}
            ${state.chatSessions.error ? `<div class="alert" style="margin:.75rem;">${icon("alert")} ${escapeHtml(state.chatSessions.error)}</div>` : ""}
          </div>
        </aside>
        <section class="chat-main">
          <div class="messages" data-messages>
            ${messages.map((message) => chatMessageMarkup(message, user)).join("")}
            ${state.chatTyping ? typingMarkup() : ""}
          </div>
          ${chatCalendarNoticeMarkup()}
          ${hasOnlyWelcome ? `
            <div class="suggestions">
              <div class="suggestions-inner">
                <p class="text-muted" style="font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Sugest\u00f5es</p>
                <div class="suggestion-list">
                  ${["Sugira um caf\u00e9 da manh\u00e3 r\u00e1pido", "Treino de 20 min em casa", "Quantas calorias tem 100g de arroz?", "Receita saud\u00e1vel com frango"].map((text) => `<button class="suggestion-btn" data-suggestion="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join("")}
                </div>
              </div>
            </div>
          ` : ""}
          <form class="composer" data-form="chat">
            <div class="composer-inner">
              <label class="icon-btn" aria-label="Enviar imagem">
                ${icon("imagePlus", "icon-lg")}
                <input type="file" accept="image/*" class="hidden" data-chat-file>
              </label>
              <input type="text" name="message" autocomplete="off" placeholder="Pergunte algo \u00e0 NutriAI...">
              <button class="icon-btn btn-primary" type="submit" aria-label="Enviar" style="border:0;">${icon("send", "icon-lg")}</button>
            </div>
          </form>
        </section>
      </main>
      ${calendarModalMarkup()}
    </div>
  `;

  bindChat(app);
  loadChatData();
  requestAnimationFrame(() => {
    const messagesEl = app.querySelector("[data-messages]");
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function chatNavLink(to, iconName, label, active = false) {
  return `<a href="${to}" data-link class="chat-nav-link ${active ? "active" : ""}">${icon(iconName)} ${escapeHtml(label)}</a>`;
}

function historyRow(session, active) {
  return `
    <div class="history-row ${active ? "active" : ""}">
      <button type="button" style="all:unset;min-width:0;flex:1;cursor:pointer;" data-action="open-session" data-id="${session.id}">
        <div class="history-row-content">
          <strong>${escapeHtml(session.title || "Nova conversa")}</strong>
          <span>${escapeHtml(session.preview || "")}</span>
          <small>${formatShortDate(session.updatedAt)} ${session.messages?.length ? `- ${session.messages.length} msgs` : ""}</small>
        </div>
      </button>
      <button class="mini-icon danger" data-action="delete-session" data-id="${session.id}" aria-label="Excluir conversa">${icon("trash")}</button>
    </div>
  `;
}

function chatMessageMarkup(message, user) {
  const time = new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (message.isUser) {
    return `
      <div class="message user">
        <div class="bubble user-bubble">
          <div class="bubble-body">${renderMessageText(message.text)}</div>
          <div class="bubble-footer"><span>Voce</span><span>${time}</span></div>
        </div>
        <span class="chat-avatar user-avatar">${escapeHtml((user?.nome || "U")[0].toUpperCase())}</span>
      </div>
    `;
  }
  return `
    <div class="message assistant">
      <span class="chat-avatar"><img src="${ASSETS_LOCAL.logo}" alt="NutriAI" width="36" height="36" decoding="async"></span>
      <div class="bubble assistant-bubble">
        <div class="bubble-head">
          <span><span class="bubble-status"></span>NutriAI</span>
          <span class="bubble-head-icon">${icon("sparkles")}</span>
        </div>
        <div class="bubble-body">${renderMessageText(message.text)}</div>
        ${workoutCalendarActionsMarkup(message)}
        <div class="bubble-footer"><span>Resposta</span><span>${time}</span></div>
      </div>
    </div>
  `;
}

function chatCalendarNoticeMarkup() {
  const message = state.chatCalendarError || state.chatCalendarMessage;
  if (!message) return "";
  const isError = Boolean(state.chatCalendarError);
  return `
    <div class="chat-calendar-notice ${isError ? "alert" : "success-box"}">
      <span>${icon(isError ? "alert" : "checkCircle")} ${escapeHtml(message)}</span>
      <div class="chat-calendar-notice-actions">
        ${isError || !isPremiumUser() ? "" : `<a href="/calendario" data-link>Ver calend\u00e1rio</a>`}
        <button type="button" class="mini-icon" data-action="dismiss-chat-calendar-notice" aria-label="Fechar aviso">${icon("x")}</button>
      </div>
    </div>
  `;
}

function typingMarkup() {
  return `
    <div class="message assistant">
      <span class="chat-avatar"><img src="${ASSETS_LOCAL.logo}" alt="NutriAI" width="36" height="36" decoding="async"></span>
      <div class="bubble assistant-bubble typing-bubble">
        <div class="bubble-head">
          <span><span class="bubble-status"></span>NutriAI</span>
        </div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
}

function renderMessageText(text) {
  const lines = escapeHtml(text).replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let listType = "";
  let firstContent = true;
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = ""; } };
  const openList = (type) => { if (listType !== type) { closeList(); listType = type; html += `<${type}>`; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { closeList(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)/);
    if (heading) { closeList(); html += `<${heading[1].length <= 2 ? "h3" : "h4"}>${inlineMarkdown(heading[2])}</${heading[1].length <= 2 ? "h3" : "h4"}>`; firstContent = false; continue; }
    const quote = line.match(/^>\s?(.+)/);
    if (quote) { closeList(); html += `<blockquote><p>${inlineMarkdown(quote[1])}</p></blockquote>`; firstContent = false; continue; }
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) { openList("ul"); html += `<li>${inlineMarkdown(bullet[1])}</li>`; firstContent = false; continue; }
    const ordered = line.match(/^\d+[.)]\s+(.+)/);
    if (ordered) { openList("ol"); html += `<li>${inlineMarkdown(ordered[1])}</li>`; firstContent = false; continue; }
    closeList();
    html += `<p>${inlineMarkdown(line)}</p>`; firstContent = false;
  }
  closeList();
  return html || "<p></p>";
}

function inlineMarkdown(value) {
  return value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
}

function normalizeText(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function welcomeMessage() {
  return { id: "welcome", text: "Ol\u00e1. Sou a NutriAI. Como posso ajudar com sua alimenta\u00e7\u00e3o e treino hoje?", isUser: false, timestamp: new Date().toISOString() };
}

function getChatSessions() {
  if (state.chatSessions.items) return state.chatSessions.items;
  const sessions = readJson(STORAGE.sessions, []);
  return Array.isArray(sessions) ? sessions : [];
}

function setChatSessions(sessions) {
  state.chatSessions.items = sessions;
  state.chatSessions.loaded = true;
  writeJson(STORAGE.sessions, sessions);
}

function getCurrentSessionId() {
  let id = sessionStorage.getItem(STORAGE.currentSession);
  if (!id) { id = uid("session"); sessionStorage.setItem(STORAGE.currentSession, id); }
  return id;
}

function mapSessionSummary(session) {
  return {
    id: session.session_id || session.id, title: session.title || "Nova conversa", preview: session.preview || "",
    createdAt: session.created_at || session.createdAt || new Date().toISOString(),
    updatedAt: session.updated_at || session.updatedAt || new Date().toISOString(),
    messages: session.messages || [], messageCount: session.message_count || session.messageCount || 0,
  };
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function shouldOfferWorkoutCalendarAction(message) {
  if (!message || message.isUser || message.id === "welcome") return false;
  const normalized = normalizeText(message.text);
  if (!normalized) return false;
  if (["erro ao", "indisponivel", "instabilidade", "temporariamente"].some((term) => normalized.includes(term))) return false;
  const workoutHints = ["treino", "treinos", "rotina", "exercicio", "exercicios", "serie", "series", "agachamento", "flexao", "prancha", "alongamento", "cardio", "corrida", "caminhada", "musculacao", "supino", "remada"];
  const hasWorkoutHint = workoutHints.some((term) => normalized.includes(term));
  if (!hasWorkoutHint) return false;
  return /(^|\n)\s*([-*]|\d+[.)])\s+/.test(String(message.text || "")) || ["minuto", "minutos", "semana", "aquecimento", "alongamento"].some((term) => normalized.includes(term));
}

function workoutCalendarActionsMarkup(message) {
  if (!isPremiumUser() || !shouldOfferWorkoutCalendarAction(message)) return "";
  return `
    <div class="chat-calendar-actions" role="group" aria-label="Adicionar treino ao calend\u00e1rio">
      <button type="button" class="chat-calendar-action primary" data-action="add-ai-workout" data-id="${escapeHtml(message.id)}" data-recurring="false">${icon("calendar")} Adicionar treino</button>
      <button type="button" class="chat-calendar-action secondary" data-action="add-ai-workout" data-id="${escapeHtml(message.id)}" data-recurring="true">${icon("refresh")} Criar rotina</button>
    </div>
  `;
}

function botResponse(text) {
  const normalized = normalizeText(text);
  if (normalized.includes("cafe") || normalized.includes("manha")) return "**Caf\u00e9 da manh\u00e3 r\u00e1pido:**\n- Iogurte natural com aveia e banana\n- 2 ovos mexidos\n- Caf\u00e9 ou ch\u00e1 sem a\u00e7\u00facar\n\nBoa combina\u00e7\u00e3o de prote\u00edna, fibra e energia para come\u00e7ar o dia.";
  if (normalized.includes("treino") || normalized.includes("casa")) return "**Treino de 20 minutos em casa:**\n- 4 min de aquecimento\n- 3 s\u00e9ries de agachamento, flex\u00e3o inclinada e prancha\n- 4 min de alongamento\n\nMantenha intensidade confort\u00e1vel e priorize execu\u00e7\u00e3o.";
  if (normalized.includes("caloria") || normalized.includes("arroz")) return "Em m\u00e9dia, **100g de arroz cozido** tem cerca de `130 kcal`. O valor muda conforme preparo, quantidade de \u00f3leo e tipo de arroz.";
  if (normalized.includes("frango") || normalized.includes("receita")) return "**Receita saud\u00e1vel com frango:** frango grelhado em tiras, legumes salteados, arroz integral e molho de iogurte com lim\u00e3o. Fica simples, proteico e f\u00e1cil de repetir na semana.";
  return "Boa pergunta. Para uma rotina mais consistente, tente combinar **prote\u00edna em todas as refei\u00e7\u00f5es**, \u00e1gua ao longo do dia e treinos curtos que voc\u00ea consiga repetir. Posso montar um plano mais espec\u00edfico se voc\u00ea me disser seu objetivo e tempo dispon\u00edvel.";
}

function titleFromMessage(text) {
  const generic = new Set(["oi", "ol\u00e1", "ola", "ok", "sim", "n\u00e3o", "nao", "valeu"]);
  const normalized = normalizeText(text);
  if (generic.has(normalized) || normalized.length < 4) return "Nova conversa";
  return text.length > 42 ? `${text.slice(0, 42)}...` : text;
}

function updateLocalChatSession(sessionId, message, titleSeed) {
  const sessions = getChatSessions();
  let session = sessions.find((item) => item.id === sessionId);
  const now = new Date().toISOString();
  if (!session) {
    session = { id: sessionId, title: titleFromMessage(titleSeed || message.text), preview: message.text, createdAt: now, updatedAt: now, messages: [message] };
    sessions.unshift(session);
  } else {
    session.messages = [...(session.messages || []).filter((item) => item.id !== "welcome"), message];
    session.preview = message.text;
    session.updatedAt = now;
  }
  state.chatHistory[sessionId] = session.messages;
  setChatSessions(sessions);
}

async function sendChatMessage(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed || state.chatTyping) return;
  const sessionId = getCurrentSessionId();
  const now = new Date().toISOString();
  const userMessage = { id: uid("msg"), text: trimmed, isUser: true, timestamp: now };
  updateLocalChatSession(sessionId, userMessage, trimmed);
  state.chatTyping = true;
  renderPage();

  try {
    const response = await apiRequest("/chat", {
      method: "POST", sessionId, body: JSON.stringify({ message: trimmed, session_id: sessionId }),
    });
    const sessions = getChatSessions();
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    const responseText = response.response || botResponse(trimmed);
    session.messages.push({ id: uid("msg"), text: responseText, isUser: false, timestamp: new Date().toISOString() });
    session.preview = responseText;
    session.updatedAt = new Date().toISOString();
    setChatSessions(sessions);
    state.chatHistory[sessionId] = session.messages;
  } catch (error) {
    const sessions = getChatSessions();
    const session = sessions.find((item) => item.id === sessionId);
    if (session) {
      session.messages.push({ id: uid("msg"), text: getErrorMessage(error, "Erro ao enviar mensagem"), isUser: false, timestamp: new Date().toISOString() });
      setChatSessions(sessions);
      state.chatHistory[sessionId] = session.messages;
    }
  } finally {
    state.chatTyping = false;
    renderPage();
    requestAnimationFrame(() => {
      const messagesEl = document.getElementById('app')?.querySelector("[data-messages]");
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
}

async function sendChatImage(file) {
  if (!file || state.chatTyping) return;
  const sessionId = getCurrentSessionId();
  const label = `Imagem enviada: ${file.name}`;
  const userMessage = { id: uid("msg"), text: label, isUser: true, timestamp: new Date().toISOString() };
  updateLocalChatSession(sessionId, userMessage, label);
  state.chatTyping = true;
  renderPage();

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("message_type", "human");
    form.append("session_id", sessionId);
    const response = await apiRequest("/analyze_image", { method: "POST", sessionId, body: form });
    const sessions = getChatSessions();
    const session = sessions.find((item) => item.id === sessionId);
    if (session) {
      session.messages.push({ id: uid("msg"), text: response.response || "Imagem analisada.", isUser: false, timestamp: new Date().toISOString() });
      session.preview = response.response || "Imagem analisada.";
      session.updatedAt = new Date().toISOString();
      setChatSessions(sessions);
      state.chatHistory[sessionId] = session.messages;
    }
  } catch (error) {
    const sessions = getChatSessions();
    const session = sessions.find((item) => item.id === sessionId);
    if (session) {
      session.messages.push({ id: uid("msg"), text: getErrorMessage(error, "Erro ao analisar imagem"), isUser: false, timestamp: new Date().toISOString() });
      setChatSessions(sessions);
    }
  } finally {
    state.chatTyping = false;
    renderPage();
    requestAnimationFrame(() => {
      const messagesEl = document.getElementById('app')?.querySelector("[data-messages]");
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
}

function bindChat(app) {
  app.querySelectorAll('[data-action="open-chat-sidebar"]').forEach((btn) => {
    btn.addEventListener("click", () => { state.chatSidebarOpen = true; renderPage(); });
  });
  app.querySelectorAll('[data-action="close-chat-sidebar"]').forEach((btn) => {
    btn.addEventListener("click", () => { state.chatSidebarOpen = false; renderPage(); });
  });
  const search = app.querySelector("[data-chat-search]");
  if (search) {
    search.addEventListener("input", () => { state.chatSearch = search.value; renderPage(); });
  }
  app.querySelectorAll('[data-action="new-chat"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      sessionStorage.setItem(STORAGE.currentSession, uid("session"));
      state.chatSidebarOpen = false;
      renderPage();
    });
  });
  app.querySelectorAll('[data-action="open-session"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      sessionStorage.setItem(STORAGE.currentSession, btn.dataset.id);
      state.chatSidebarOpen = false;
      renderPage();
    });
  });
  app.querySelectorAll('[data-action="delete-session"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir conversa?")) return;
      try { await apiRequest(`/chat_sessions/${encodeURIComponent(btn.dataset.id)}`, { method: "DELETE" }); } catch (error) {
        state.chatSessions.error = getErrorMessage(error, "Erro ao excluir conversa");
      }
      const next = getChatSessions().filter((session) => session.id !== btn.dataset.id);
      setChatSessions(next);
      delete state.chatHistory[btn.dataset.id];
      if (sessionStorage.getItem(STORAGE.currentSession) === btn.dataset.id) {
        sessionStorage.setItem(STORAGE.currentSession, next[0]?.id || uid("session"));
      }
      renderPage();
    });
  });
  app.querySelectorAll("[data-suggestion]").forEach((btn) => {
    btn.addEventListener("click", () => sendChatMessage(btn.dataset.suggestion));
  });
  app.querySelectorAll('[data-action="dismiss-chat-calendar-notice"]').forEach((btn) => {
    btn.addEventListener("click", () => { state.chatCalendarMessage = ""; state.chatCalendarError = ""; renderPage(); });
  });
  const chatForm = app.querySelector('[data-form="chat"]');
  if (chatForm) {
    chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = chatForm.querySelector('input[name="message"]');
      sendChatMessage(input.value);
      input.value = "";
    });
  }
  const fileInput = app.querySelector("[data-chat-file]");
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (!fileInput.files?.[0]) return;
      sendChatImage(fileInput.files[0]);
      fileInput.value = "";
    });
  }
  app.querySelectorAll('[data-action="add-ai-workout"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const message = findCurrentChatMessage(btn.dataset.id);
      if (!message) {
        state.chatCalendarError = "N\u00e3o foi poss\u00edvel localizar esse treino na conversa.";
        state.chatCalendarMessage = "";
        renderPage();
        return;
      }
      openAiWorkoutCalendarModal(message, btn.dataset.recurring === "true");
    });
  });
  app.querySelectorAll('[data-action="logout"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { logoutFromBackend } = await import('../shared/api.js');
      await logoutFromBackend();
      window.location.href = "/";
    });
  });
}

function findCurrentChatMessage(messageId) {
  const sessionId = getCurrentSessionId();
  const messages = state.chatHistory[sessionId] || getChatSessions().find((s) => s.id === sessionId)?.messages || [];
  return messages.find((m) => String(m.id) === String(messageId));
}

function openAiWorkoutCalendarModal(message, recurring) {
  const text = message.text;
  const normalized = normalizeText(text);
  const days = inferWorkoutWeekdays(text);
  const recurrenceDays = days.length ? days : (recurring ? ["MO", "WE", "FR"] : [jsDayToGoogleDay[new Date().getDay()]]);
  const description = plainMessageText(text) || "Treino sugerido pela NutriAI.";
  const startDate = normalized.includes("amanha") ? todayInput(addDays(new Date(), 1)) : normalized.includes("hoje") ? todayInput() : todayInput(nextDateForWeekdays(recurrenceDays));

  const item = {
    tipo: "treino", title: extractWorkoutTitle(text), description,
    scheduleDate: startDate, time: inferWorkoutTime(text),
    durationMinutes: inferWorkoutDurationMinutes(text),
    recurrenceType: recurring ? "weekly" : "none", recurrenceDays,
    recurrenceUntil: recurring ? todayInput(addDays(new Date(), 84)) : "",
  };
  state.calendarModal = { mode: "new", item };
  state.calendarWeekdays = item.recurrenceType === "weekly" ? item.recurrenceDays : [];
  state.chatCalendarMessage = "";
  state.chatCalendarError = "";
  renderPage();
}

function plainMessageText(text) {
  return String(text || "").replace(/\r\n/g, "\n").split("\n").map((line) => line.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/^\s*>\s?/, "").replace(/^\s*[-*]\s+/, "- ").replace(/^\s*\d+[.)]\s+/, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\*\*/g, "").replace(/__/g, "").replace(/\|/g, " ").trim()).filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractWorkoutTitle(text) {
  const lines = plainMessageText(text).split("\n").map((l) => l.trim()).filter(Boolean);
  const candidate = lines.find((l) => { const n = normalizeText(l); return n.includes("treino") || n.includes("rotina"); }) || lines[0] || "Treino sugerido pela NutriAI";
  let title = candidate.replace(/^claro[!,.]?\s*/i, "").replace(/^aqui\s+(esta|vai)\s+/i, "").replace(/:$/, "").trim();
  if (!title) title = "Treino sugerido pela NutriAI";
  if (!normalizeText(title).includes("treino") && !normalizeText(title).includes("rotina")) title = `Treino: ${title}`;
  return title.length > 72 ? `${title.slice(0, 69).trim()}...` : title;
}

function inferWorkoutDurationMinutes(text) {
  const normalized = normalizeText(text);
  const candidates = [];
  for (const match of normalized.matchAll(/\b(\d{1,2})\s*h(?:\s*(\d{1,2})\s*(?:min|minuto|minutos))?/g)) candidates.push(Number(match[1]) * 60 + (Number(match[2]) || 0));
  for (const match of normalized.matchAll(/\b(\d{1,3})\s*(?:min|minuto|minutos)\b/g)) candidates.push(Number(match[1]));
  return candidates.find((m) => m >= 15 && m <= 720) || 60;
}

function inferWorkoutTime(text) {
  const plain = plainMessageText(text);
  const explicit = plain.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (explicit) return `${String(Number(explicit[1])).padStart(2, "0")}:${explicit[2]}`;
  const normalized = normalizeText(text);
  if (normalized.includes("manha")) return "08:00";
  if (normalized.includes("tarde")) return "17:00";
  if (normalized.includes("noite")) return "19:00";
  return "08:00";
}

function inferWorkoutWeekdays(text) {
  const normalized = normalizeText(text);
  if (/\b(todos os dias|diario|diaria)\b/.test(normalized)) return ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  if (normalized.includes("dias alternados")) return ["MO", "WE", "FR"];
  const aliases = [
    ["MO", ["seg", "segunda", "segundas"]], ["TU", ["ter", "terca", "tercas"]],
    ["WE", ["qua", "quarta", "quartas"]], ["TH", ["qui", "quinta", "quintas"]],
    ["FR", ["sex", "sexta", "sextas"]], ["SA", ["sab", "sabado", "sabados"]],
    ["SU", ["dom", "domingo", "domingos"]],
  ];
  return aliases.filter(([, names]) => names.some((name) => new RegExp(`\\b${name}\\b`).test(normalized))).map(([code]) => code);
}

function nextDateForWeekdays(days) {
  if (!days.length) return new Date();
  for (let offset = 0; offset < 7; offset++) {
    const candidate = addDays(new Date(), offset);
    if (days.includes(jsDayToGoogleDay[candidate.getDay()])) return candidate;
  }
  return new Date();
}

function calendarModalMarkup() {
  if (!state.calendarModal) return "";
  const item = state.calendarModal.item || {};
  const isWeekly = item.recurrenceType === "weekly";
  const weekdays = state.calendarWeekdays.length ? state.calendarWeekdays : item.recurrenceDays || [];
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-card" data-modal-card>
        <div class="modal-head">
          <h2>Adicionar treino ao calend\u00e1rio</h2>
          <button class="mini-icon" data-action="close-modal" aria-label="Fechar">${icon("x", "icon-lg")}</button>
        </div>
        <form class="form" data-form="calendar">
          <div class="segmented">
            <button type="button" class="active workout" data-calendar-type="treino">Treino</button>
            <button type="button" class="" data-calendar-type="dieta">Dieta</button>
          </div>
          <input type="hidden" name="tipo" value="${item.tipo || "treino"}" autocomplete="off">
          ${fieldMarkup("T\u00edtulo", "title", "text", { value: item.title || "", placeholder: "Ex: Treino de pernas" })}
          <div class="field">
            <label for="field-desc">Descri\u00e7\u00e3o</label>
            <textarea id="field-desc" name="description" class="textarea" required autocomplete="off" placeholder="Detalhes...">${escapeHtml(item.description || "")}</textarea>
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
                ${weekDayOptions.map((day) => `<button type="button" class="weekday-toggle ${weekdays.includes(day.code) ? "active" : ""}" data-weekday="${day.code}">${day.label}</button>`).join("")}
              </div>
              ${fieldMarkup("At\u00e9", "recurrenceUntil", "date", { value: item.recurrenceUntil || todayInput(addDays(new Date(), 84)) })}
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
            <button class="btn btn-primary" type="submit">Adicionar</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

async function loadChatData() {
  const token = getToken();
  if (!token) return;

  if (!state.chatSessions.loaded && !state.chatSessions.loading) {
    state.chatSessions.loading = true;
    try {
      const data = await apiRequest("/chat_sessions");
      const sessions = (data.sessions || []).map(mapSessionSummary);
      setChatSessions(sessions);
      const currentId = getCurrentSessionId();
      if (!sessions.some((s) => s.id === currentId) && sessions[0]) {
        sessionStorage.setItem(STORAGE.currentSession, sessions[0].id);
      }
    } catch (error) {
      state.chatSessions.error = getErrorMessage(error, "Erro ao carregar hist\u00f3rico");
    } finally {
      state.chatSessions.loading = false;
    }
  }

  const currentId = getCurrentSessionId();
  if (currentId && !state.chatHistory[currentId]) {
    try {
      const data = await apiRequest(`/chat_history?session_id=${encodeURIComponent(currentId)}`, { sessionId: currentId });
      const history = (data.history || []).map((item, index) => ({
        id: `${index}-${item.timestamp || Date.now()}`,
        text: item.content || "",
        isUser: item.role === "user",
        timestamp: item.timestamp || new Date().toISOString(),
      }));
      state.chatHistory[currentId] = history.length ? history : [welcomeMessage()];
    } catch {
      state.chatHistory[currentId] = [welcomeMessage()];
    }
  }
}
