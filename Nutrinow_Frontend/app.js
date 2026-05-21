(function () {
  "use strict";

  const app = document.getElementById("app");

  const ASSETS = {
    logo: "./assets/logo.png",
    hero: "./assets/hero-nutrition.jpg",
    bmiShapes: [
      "./assets/bmi-shape-1.png",
      "./assets/bmi-shape-2.png",
      "./assets/bmi-shape-3.png",
      "./assets/bmi-shape-4.png",
      "./assets/bmi-shape-5.png",
    ],
  };

  const STORAGE = {
    token: "nutrinow_access_token",
    user: "nutrinow_user",
    apiBase: "nutrinow_api_base",
    sessions: "nutrinow_chat_sessions_cache",
    currentSession: "nutrinow_static_current_session",
  };

  const LEGACY_SESSION_AUTH_KEYS = [STORAGE.token, STORAGE.user];

  const state = {
    planTab: "treino",
    planModal: null,
    calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    calendarModal: null,
    calendarWeekdays: [],
    googleMessage: "",
    googleError: "",
    chatSidebarOpen: false,
    chatSearch: "",
    chatTyping: false,
    feedbackRating: 0,
    feedbackSubmitted: false,
    recoverySent: false,
    resetDone: false,
    profileSaved: false,
    authExchanging: false,
    dashboard: { loaded: false, loading: false, data: null, error: "" },
    profile: { loaded: false, loading: false, data: null, error: "" },
    plans: { treino: null, dieta: null, loading: false, error: "" },
    googleStatus: { loaded: false, loading: false, data: null, error: "" },
    chatSessions: { loaded: false, loading: false, items: null, error: "" },
    chatHistory: {},
  };

  const BMI_CATEGORIES = [
    { min: 0, max: 18.49, label: "Abaixo do peso", range: "< 18.5", color: "#60a5fa" },
    { min: 18.5, max: 24.9, label: "Peso normal", range: "18.5 - 24.9", color: "#22c55e" },
    { min: 25, max: 29.9, label: "Sobrepeso", range: "25 - 29.9", color: "#facc15" },
    { min: 30, max: 34.9, label: "Obesidade I", range: "30 - 34.9", color: "#fb923c" },
    { min: 35, max: Infinity, label: "Obesidade II+", range: "> 35", color: "#ef4444" },
  ];

  const weekDayOptions = [
    { code: "MO", label: "Seg" },
    { code: "TU", label: "Ter" },
    { code: "WE", label: "Qua" },
    { code: "TH", label: "Qui" },
    { code: "FR", label: "Sex" },
    { code: "SA", label: "Sáb" },
    { code: "SU", label: "Dom" },
  ];

  const jsDayToGoogleDay = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  const ICONS = {
    activity: '<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    apple: '<path d="M12 20.9c-3.3 0-6-2.7-6-6 0-3 2.2-5.6 5.1-6 .6-.1 1.2.1 1.7.4.5-.3 1.1-.5 1.7-.4 2.9.4 5.1 3 5.1 6 0 3.3-2.7 6-6 6H12Z"/><path d="M12 8c0-2 1.5-4 3.5-4"/><path d="M9 4c1.5 0 3 1.2 3 3"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
    camera: '<path d="M14.5 4 13 2h-2L9.5 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4.5Z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    checkCircle: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m22 4-10 10.01-3-3"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    dumbbell: '<path d="m6.5 6.5 11 11"/><path d="m21 21-3-3"/><path d="m3 3 3 3"/><path d="m18 22 4-4"/><path d="M2 6l4-4"/><path d="m14 10 4-4"/><path d="m6 18 4-4"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7C3.7 7.68 7.38 5 12 5s8.3 2.68 9.94 6.65a1 1 0 0 1 0 .7C20.3 16.32 16.62 19 12 19s-8.3-2.68-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="m2 2 20 20"/><path d="M6.71 6.71C4.93 7.88 3.52 9.6 2.06 11.65a1 1 0 0 0 0 .7C3.7 16.32 7.38 19 12 19c1.87 0 3.57-.44 5.04-1.22"/><path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/><path d="M14.12 9.88A3 3 0 0 0 9.88 14.12"/><path d="M12 5c4.62 0 8.3 2.68 9.94 6.65a1 1 0 0 1 0 .7 13.04 13.04 0 0 1-2.22 3.29"/>',
    imagePlus: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L6 20"/><path d="M17 5v6"/><path d="M14 8h6"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15 8 3 3"/><path d="m17 6 3 3"/>',
    layout: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-7 9-11 16-9 2 7-2 16-9 16Z"/><path d="M4 13c4 0 8-2 12-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    lock: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/><path d="M3 12A9 9 0 0 1 18.5 5.7L21 8"/><path d="M21 3v5h-5"/>',
    ruler: '<path d="M21.3 15.3 15.3 21.3a2 2 0 0 1-2.8 0L2.7 11.5a2 2 0 0 1 0-2.8l6-6a2 2 0 0 1 2.8 0l9.8 9.8a2 2 0 0 1 0 2.8Z"/><path d="m14.5 5.5-2 2"/><path d="m17.5 8.5-2 2"/><path d="m8.5 11.5-2 2"/>',
    salad: '<path d="M7 21h10"/><path d="M5 11h14l-1.5 7h-11L5 11Z"/><path d="M8 11c0-4 2-7 4-7s4 3 4 7"/><path d="M9 8C7 6 5 6 4 8c2 1 4 1 5 0Z"/><path d="M15 8c2-2 4-2 5 0-2 1-4 1-5 0Z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    scale: '<path d="M16 16v-3a4 4 0 0 0-8 0v3"/><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m9 13 3-3 3 3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    sparkles: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="M19 15v4"/><path d="M21 17h-4"/><path d="M5 4v3"/><path d="M6.5 5.5h-3"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2Z"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    unlink: '<path d="M18.84 12.25 20.5 10.6a5 5 0 0 0-7.07-7.07L11.7 5.25"/><path d="m2 2 20 20"/><path d="M8.5 8.5 3.5 13.5a5 5 0 0 0 7.07 7.07l1.73-1.73"/><path d="M9 15a5 5 0 0 0 6 0"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  };

  function icon(name, cls = "icon") {
    return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  function googleLogo() {
    return `
      <svg class="google-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function uid(prefix = "id") {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function migratePersistentSession() {
    try {
      LEGACY_SESSION_AUTH_KEYS.forEach((key) => {
        const value = sessionStorage.getItem(key);
        if (value) localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      });
    } catch {
      // Ignora navegadores que bloqueiam acesso ao storage.
    }
  }

  function readJson(key, fallback, storage = sessionStorage) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value, storage = sessionStorage) {
    storage.setItem(key, JSON.stringify(value));
  }

  function getApiBase() {
    const configured = localStorage.getItem(STORAGE.apiBase) || window.NUTRINOW_API_BASE || "";
    if (configured) return configured.replace(/\/+$/, "");
    if (!location.protocol.startsWith("http")) return "http://127.0.0.1:8000";

    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    if (isLocalhost && location.port && location.port !== "8000") return "http://127.0.0.1:8000";

    return location.origin;
  }

  function getToken() {
    return localStorage.getItem(STORAGE.token) || "";
  }

  function setToken(token) {
    if (token) localStorage.setItem(STORAGE.token, token);
    else localStorage.removeItem(STORAGE.token);
    sessionStorage.removeItem(STORAGE.token);
  }

  function clearRemoteCaches() {
    state.dashboard = { loaded: false, loading: false, data: null, error: "" };
    state.profile = { loaded: false, loading: false, data: null, error: "" };
    state.plans = { treino: null, dieta: null, loading: false, error: "" };
    state.googleStatus = { loaded: false, loading: false, data: null, error: "" };
    state.chatSessions = { loaded: false, loading: false, items: null, error: "" };
    state.chatHistory = {};
  }

  function getErrorMessage(error, fallback = "Erro ao comunicar com o backend") {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }

  function getCookie(name) {
    const prefix = `${name}=`;
    return document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) || "";
  }

  function getRefreshCsrfToken() {
    const token = getCookie("csrf_refresh_token");
    return token ? decodeURIComponent(token) : "";
  }

  async function parseApiResponse(response) {
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    return response.text();
  }

  function buildApiError(response, data) {
    const message = typeof data === "object" && data ? data.error || data.message : data;
    const error = new Error(message || `Erro HTTP ${response.status}`);
    error.status = response.status;
    error.payload = data;
    return error;
  }

  let refreshSessionPromise = null;

  async function refreshSession() {
    if (refreshSessionPromise) return refreshSessionPromise;

    refreshSessionPromise = (async () => {
      const headers = new Headers({ "Content-Type": "application/json" });
      const csrfToken = getRefreshCsrfToken();
      if (csrfToken) headers.set("X-CSRF-TOKEN", csrfToken);

      const response = await fetch(`${getApiBase()}/refresh`, {
        method: "POST",
        headers,
        credentials: "include",
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw buildApiError(response, data);

      saveSessionPayload(data);
      return data;
    })().finally(() => {
      refreshSessionPromise = null;
    });

    return refreshSessionPromise;
  }

  function shouldRefreshAuth(path, response, options) {
    if (options.skipAuthRefresh || response.status !== 401) return false;
    if (["/refresh", "/login", "/cadastro", "/auth/exchange-code"].includes(path)) return false;
    return Boolean(getRefreshCsrfToken());
  }

  async function performApiRequest(path, options = {}, tokenOverride) {
    const {
      headers: optionHeaders,
      sessionId,
      skipAuthRefresh,
      token: optionToken,
      ...fetchOptions
    } = options;
    const headers = new Headers(optionHeaders || {});
    const token = tokenOverride !== undefined ? tokenOverride : optionToken !== undefined ? optionToken : getToken();
    const isFormData = options.body instanceof FormData;

    if (!isFormData && options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (options.sessionId && !headers.has("X-Session-ID")) {
      headers.set("X-Session-ID", options.sessionId);
    }

    const response = await fetch(`${getApiBase()}${path}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
    });
    const data = await parseApiResponse(response);

    return { response, data };
  }

  async function apiRequest(path, options = {}) {
    const result = await performApiRequest(path, options);

    if (!result.response.ok && shouldRefreshAuth(path, result.response, options)) {
      try {
        await refreshSession();
        const retry = await performApiRequest(path, options, getToken());
        if (retry.response.ok) return retry.data;
        throw buildApiError(retry.response, retry.data);
      } catch (error) {
        setToken("");
        setUser(null);
        throw error;
      }
    }

    if (!result.response.ok) throw buildApiError(result.response, result.data);
    return result.data;
  }

  function saveSessionPayload(payload) {
    setToken(payload.access_token || payload.token || "");
    if (payload.user) setUser(payload.user);
    clearRemoteCaches();
  }

  async function logoutFromBackend() {
    try {
      await apiRequest("/logout", { method: "POST" });
    } catch {
      // A sessao local ainda deve ser encerrada se o backend estiver indisponivel.
    }
    setToken("");
    setUser(null);
    clearRemoteCaches();
  }

  function getUser() {
    const user = readJson(STORAGE.user, null, localStorage);
    return getToken() ? user : null;
  }

  function setUser(user) {
    if (user) writeJson(STORAGE.user, user, localStorage);
    else localStorage.removeItem(STORAGE.user);
    sessionStorage.removeItem(STORAGE.user);
  }

  function getFirstName(user) {
    return (user?.nome || "Perfil").split(" ")[0] || "Perfil";
  }

  function getInitials(name) {
    return String(name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  function todayInput(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function timeInput(date = new Date()) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function parseDateOnly(value) {
    if (!value) return new Date();
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    if (year && month && day) return new Date(year, month - 1, day);
    return new Date(value);
  }

  function routeHref(path) {
    return `#${path}`;
  }

  function getCurrentPath() {
    if (location.hash.startsWith("#/")) return location.hash.slice(1);
    if (location.protocol === "file:") return "/";
    let path = location.pathname || "/";
    if (path.endsWith("/index.html")) path = "/";
    return path || "/";
  }

  function routeTo(path, replace = false) {
    state.planModal = null;
    state.calendarModal = null;
    state.chatSidebarOpen = false;
    const nextHash = `#${path}`;
    if (replace && location.protocol.startsWith("http")) {
      history.replaceState({}, "", `${location.pathname}${location.search}${nextHash}`);
      render();
      return;
    }
    if (location.hash !== nextHash) {
      location.hash = nextHash;
    } else {
      render();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function normalizePath(raw) {
    const path = raw.split("?")[0].replace(/\/+$/, "") || "/";
    const valid = new Set([
      "/",
      "/login",
      "/cadastro",
      "/esqueci-senha",
      "/reset-senha",
      "/dashboard",
      "/planos",
      "/calendario",
      "/chat",
      "/perfil",
      "/feedbacks",
    ]);
    return valid.has(path) ? path : "/";
  }

  function brandMarkup() {
    return `
      <span class="brand-logo"><img src="${ASSETS.logo}" alt="NutriNow" width="36" height="36" decoding="async"></span>
      <span>Nutri<span class="text-primary">Now</span></span>
    `;
  }

  function headerMarkup(active = "") {
    const user = getUser();
    const privateLinks = user
      ? [
          ["/dashboard", "Dashboard"],
          ["/planos", "Dietas e Treinos"],
          ["/calendario", "Calendário"],
          ["/chat", "Chat NutriAI"],
        ]
      : [];

    const navLinks = privateLinks
      .map(
        ([to, label]) =>
          `<a href="${routeHref(to)}" data-link class="nav-link ${active === to ? "active" : ""}">${label}</a>`,
      )
      .join("");

    const desktopActions = user
      ? `
        <a href="/perfil" data-link class="btn btn-ghost ${active === "/perfil" ? "active" : ""}">
          ${icon("user")} ${escapeHtml(getFirstName(user))}
        </a>
        <button class="btn btn-secondary" data-action="logout">${icon("logout")} Sair</button>
      `
      : `
        <a href="/login" data-link class="btn btn-ghost">Entrar</a>
        <a href="/cadastro" data-link class="btn btn-dark">Começar grátis</a>
      `;

    const mobileLinks = privateLinks
      .map(
        ([to, label]) =>
          `<a href="${routeHref(to)}" data-link class="nav-link ${active === to ? "active" : ""}">${label}</a>`,
      )
      .join("");

    const mobileActions = user
      ? `
        <a href="/perfil" data-link class="btn btn-secondary">${icon("user")} Perfil (${escapeHtml(getFirstName(user))})</a>
        <button class="btn btn-secondary" data-action="logout">${icon("logout")} Sair</button>
      `
      : `
        <a href="/login" data-link class="btn btn-secondary">Entrar</a>
        <a href="/cadastro" data-link class="btn btn-dark">Começar grátis</a>
      `;

    return `
      <header class="site-header">
        <nav class="site-nav container">
          <a href="/" data-link class="brand" aria-label="NutriNow">${brandMarkup()}</a>
          <div class="nav-links">${navLinks}</div>
          <div class="nav-actions">${desktopActions}</div>
          <button class="icon-btn mobile-menu-button" data-action="toggle-mobile-menu" aria-label="Abrir menu">
            ${icon("menu", "icon-lg")}
          </button>
        </nav>
        <div class="mobile-panel" data-mobile-panel>
          <div class="mobile-panel-inner container">
            ${mobileLinks}
            ${mobileActions}
          </div>
        </div>
      </header>
    `;
  }

  function footerMarkup() {
    return `
      <footer class="site-footer">
        <div class="footer-inner container">
          <a href="/" data-link class="brand">
            <span class="brand-logo" style="width:1.75rem;height:1.75rem;border-radius:.55rem;background:var(--gradient-hero);color:var(--primary-foreground);box-shadow:none;">
              ${icon("leaf")}
            </span>
            <span>NutriNow</span>
          </a>
          <div class="footer-side">
            <a href="/feedbacks" data-link class="icon-btn" aria-label="Abrir página de feedbacks" title="Feedbacks">
              ${icon("message", "icon-lg")}
            </a>
            <p class="text-muted">© ${new Date().getFullYear()} NutriNow. Feito com cuidado para sua saúde.</p>
          </div>
        </div>
      </footer>
    `;
  }

  function pageShell(content, active = "") {
    return `<div class="app-shell">${headerMarkup(active)}${content}</div>`;
  }

  function landingPage() {
    const user = getUser();
    const userWeight = Number(user?.peso) > 0 ? Number(user.peso) : 68;
    const userHeight = Number(user?.altura) > 0 ? Number(user.altura) : 1.72;
    return pageShell(
      `
      <main>
        <section class="hero" id="top">
          <div class="hero-grid container">
            <div class="hero-copy animate-fade-up">
              <span class="badge">${icon("sparkles")} Powered by NutriAI</span>
              <h1>Sua rotina saudável, <span class="text-gradient">guiada por IA.</span></h1>
              <p>Planos de dieta e treino personalizados, análise de refeições pela foto e um assistente que conversa com você 24/7. Tudo em um só lugar.</p>
              <div class="hero-actions">
                <a href="/cadastro" data-link class="btn btn-primary">Criar conta grátis ${icon("arrowRight")}</a>
                <a href="#how" class="btn btn-secondary">Ver como funciona</a>
              </div>
              <div class="hero-checks">
                <span>${icon("check")} Sem cartão</span>
                <span>${icon("check")} Cancela quando quiser</span>
              </div>
            </div>
            <div class="hero-media animate-fade-up delay-200">
              <div class="hero-glow" aria-hidden="true"></div>
              <div class="hero-image" style="aspect-ratio:1 / 1;max-height:30rem;">
                <img src="${ASSETS.hero}" alt="Smoothie verde com frutas, abacate e halteres - nutrição e treino" width="1280" height="960" decoding="async" fetchpriority="high">
              </div>
              <div class="floating-card">
                <span class="floating-icon">${icon("activity", "icon-lg")}</span>
                <div>
                  <p class="text-muted" style="font-size:.78rem;">Hoje</p>
                  <strong>1.840 kcal • 132g proteína</strong>
                </div>
              </div>
              <div class="floating-card">
                <span class="floating-icon" style="background:color-mix(in oklab,var(--accent),transparent 70%);color:var(--foreground);">${icon("sparkles", "icon-lg")}</span>
                <div>
                  <p class="text-muted" style="font-size:.78rem;">NutriAI</p>
                  <strong>Plano gerado em 12s</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
        ${bmiMarkup("home-bmi", userWeight, userHeight)}
        ${featuresMarkup()}
        ${howMarkup()}
        ${ctaMarkup()}
      </main>
      ${footerMarkup()}
      `,
      "/",
    );
  }

  function featuresMarkup() {
    const items = [
      ["apple", "Dietas personalizadas", "Cardápios montados pela IA com base no seu objetivo, restrições e rotina."],
      ["dumbbell", "Treinos sob medida", "Programas semanais adaptados ao seu nível, equipamento e tempo disponível."],
      ["camera", "Análise por foto", "Tire foto da refeição e receba estimativa de calorias e macros na hora."],
      ["message", "Chat com NutriAI", "Tire dúvidas, ajuste planos e receba motivação a qualquer hora do dia."],
    ];
    return `
      <section class="section" id="features">
        <div class="container">
          <div class="section-heading">
            <h2>Tudo que você precisa para se sentir bem</h2>
            <p>Um app completo que combina nutrição, treino e inteligência artificial numa experiência simples.</p>
          </div>
          <div class="features-grid">
            ${items
              .map(
                ([name, title, desc]) => `
                <article class="feature-card">
                  <span class="feature-icon">${icon(name, "icon-xl")}</span>
                  <h3>${title}</h3>
                  <p>${desc}</p>
                </article>
              `,
              )
              .join("")}
          </div>
        </div>
      </section>
    `;
  }

  function howMarkup() {
    const steps = [
      ["01", "Crie seu perfil", "Conte seus objetivos, preferências e restrições em 2 minutos."],
      ["02", "Receba seu plano", "A NutriAI monta dieta e treino personalizados para você."],
      ["03", "Acompanhe e evolua", "Registre refeições, treinos e veja seu progresso em tempo real."],
    ];
    return `
      <section class="section surface" id="how">
        <div class="container">
          <div class="section-heading">
            <h2>Como funciona</h2>
            <p>Em três passos você já está no caminho de uma vida mais saudável.</p>
          </div>
          <div class="steps-grid">
            ${steps
              .map(
                ([n, title, desc]) => `
                  <article class="step-card">
                    <span class="step-number text-gradient">${n}</span>
                    <h3>${title}</h3>
                    <p>${desc}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>
    `;
  }

  function ctaMarkup() {
    return `
      <section class="section-tight">
        <div class="container">
          <div class="cta-card">
            <div class="cta-content">
              <h2>Comece sua jornada saudável hoje.</h2>
              <p>Crie sua conta grátis e tenha um plano personalizado em minutos.</p>
              <div class="inline-actions">
                <a href="/cadastro" data-link class="btn btn-light">Criar conta grátis ${icon("arrowRight")}</a>
                <a href="#features" class="btn btn-white">Saber mais</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function getBmiCategory(bmi) {
    return BMI_CATEGORIES.find((item) => bmi >= item.min && bmi <= item.max) || BMI_CATEGORIES[1];
  }

  function bmiMarkup(id, weight = 68, height = 1.72, className = "") {
    const bmi = weight / (height * height);
    const category = getBmiCategory(bmi);
    const activeIndex = Math.max(0, BMI_CATEGORIES.findIndex((item) => item.label === category.label));
    return `
      <section class="bmi-section ${className}" data-bmi="${id}">
        <div class="container">
          <div class="bmi-card" style="--bmi-glow:${category.color}26;">
            <div class="bmi-grid">
              <div class="bmi-copy">
                <span class="badge">${icon("activity")} Simulador de IMC</span>
                <h2>Veja o avatar reagir ao seu IMC em tempo real</h2>
                <p>Arraste os controles de peso e altura para calcular o IMC e observar o corpo estilizado mudar de forma e cor com uma transição suave.</p>
                <div class="slider-stack">
                  ${sliderMarkup("Peso", "scale", "weight", weight, 35, 180, 1, `${Math.round(weight)} kg`)}
                  ${sliderMarkup("Altura", "ruler", "height", height, 1.3, 2.1, 0.01, `${height.toFixed(2)} m`)}
                </div>
              </div>
              <div class="bmi-result-card">
                <div class="bmi-avatar" style="--avatar-color:${category.color};">
                  <div class="bmi-avatar-shadow"></div>
                  <div class="bmi-avatar-frame">
                    <img data-bmi-shape src="${ASSETS.bmiShapes[activeIndex]}" alt="" aria-hidden="true" loading="lazy" decoding="async">
                  </div>
                </div>
                <div class="bmi-result">
                  <small>IMC atual</small>
                  <div class="bmi-number" data-bmi-number>${bmi.toFixed(1)}</div>
                  <div class="bmi-pill" data-bmi-pill style="--bmi-color:${category.color};">${category.label}</div>
                </div>
                <div class="bmi-categories">
                  ${BMI_CATEGORIES.map(
                    (item, index) => `
                      <div class="bmi-category ${index === activeIndex ? "active" : ""}" data-bmi-category="${index}" style="${index === activeIndex ? `background:${item.color}20;color:${item.color};` : ""}">
                        <strong>${item.range}</strong>
                        <span>${item.label}</span>
                      </div>
                    `,
                  ).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function sliderMarkup(label, iconName, key, value, min, max, step, display) {
    return `
      <div class="slider-field">
        <div class="slider-row">
          <div class="slider-label"><span>${icon(iconName)}</span>${label}</div>
          <div class="slider-value" data-bmi-display="${key}">${display}</div>
        </div>
        <input class="range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-bmi-input="${key}" aria-label="${label}">
        <div class="slider-limits"><span>${min}</span><span>${max}</span></div>
      </div>
    `;
  }

  function updateBmi(root) {
    const weightInput = root.querySelector('[data-bmi-input="weight"]');
    const heightInput = root.querySelector('[data-bmi-input="height"]');
    const weight = Number(weightInput.value);
    const height = Number(heightInput.value);
    const bmi = weight / (height * height);
    const category = getBmiCategory(bmi);
    const index = Math.max(0, BMI_CATEGORIES.findIndex((item) => item.label === category.label));

    root.querySelector('[data-bmi-display="weight"]').textContent = `${Math.round(weight)} kg`;
    root.querySelector('[data-bmi-display="height"]').textContent = `${height.toFixed(2)} m`;
    root.querySelector("[data-bmi-number]").textContent = bmi.toFixed(1);
    root.querySelector("[data-bmi-pill]").textContent = category.label;
    root.querySelector("[data-bmi-pill]").style.setProperty("--bmi-color", category.color);
    root.querySelector(".bmi-card").style.setProperty("--bmi-glow", `${category.color}26`);
    root.querySelector(".bmi-avatar").style.setProperty("--avatar-color", category.color);
    root.querySelector("[data-bmi-shape]").src = ASSETS.bmiShapes[index];
    updateRangeProgress(weightInput);
    updateRangeProgress(heightInput);
    root.querySelectorAll("[data-bmi-category]").forEach((node) => {
      const active = Number(node.dataset.bmiCategory) === index;
      node.classList.toggle("active", active);
      node.setAttribute("style", active ? `background:${category.color}20;color:${category.color};` : "");
    });
  }

  function updateRangeProgress(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || min);
    const progress = ((value - min) / (max - min)) * 100;
    input.style.setProperty("--range-progress", `${Math.min(100, Math.max(0, progress))}%`);
  }

  function authShell(title, subtitle, body, footer = "") {
    return `
      <div class="auth-layout">
        <section class="auth-panel">
          <a href="/" data-link class="brand">${brandMarkup()}</a>
          <div class="auth-form-wrap">
            <h1>${title}</h1>
            <p>${subtitle}</p>
            ${body}
            ${footer ? `<div class="auth-footer">${footer}</div>` : ""}
          </div>
        </section>
        <aside class="auth-visual">
          <img src="${ASSETS.hero}" alt="" loading="lazy" decoding="async" width="1280" height="960">
          <div class="auth-quote">
            <blockquote>"Mudei minha rotina em semanas. O NutriNow virou meu coach pessoal de bolso."</blockquote>
            <div class="auth-person">
              <span>A</span>
              <div>
                <strong>Amanda S.</strong>
                <p>Estudante de Nutrição</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    `;
  }

  function fieldMarkup(label, name, type = "text", options = {}) {
    const iconMarkup = options.icon ? icon(options.icon) : "";
    const hasPasswordToggle = type === "password" || options.passwordToggle;
    const inputClass = `input ${options.icon ? "has-icon" : ""} ${hasPasswordToggle ? "has-action" : ""}`;
    const hintMarkup = options.passwordStrength
      ? `<span class="hint password-strength-hint" data-password-strength="true" data-min-length="${options.minLength || 10}"><span class="hint-check" aria-hidden="true">${icon("check")}</span>${escapeHtml(options.passwordStrength)}</span>`
      : options.hint
        ? `<span class="hint">${options.hint}</span>`
        : "";
    const attrs = [
      `name="${name}"`,
      `id="${name}"`,
      `class="${inputClass}"`,
      `type="${type}"`,
      options.required === false ? "" : "required",
      options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : "",
      options.value != null ? `value="${escapeHtml(options.value)}"` : "",
      options.step ? `step="${options.step}"` : "",
      options.min != null ? `min="${options.min}"` : "",
      `autocomplete="${escapeHtml(options.autocomplete || "off")}"`,
      options.passwordStrength ? 'data-password-strength-input="true"' : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `
      <label class="field">
        <div class="field-label-row">
          <span class="label">${label}</span>
          ${hintMarkup}
        </div>
        <div class="input-wrap">
          ${iconMarkup}
          <input ${attrs}>
          ${
            hasPasswordToggle
              ? `<button class="password-toggle" type="button" data-action="toggle-password" aria-label="Mostrar senha" aria-pressed="false">${icon("eye")}</button>`
              : ""
          }
        </div>
      </label>
    `;
  }

  function selectFieldMarkup(label, name, values, selected = "", required = true, options = {}) {
    return `
      <label class="field">
        <span class="label" style="margin-bottom:.4rem;">${label}</span>
        <select class="select" name="${name}" ${required ? "required" : ""} autocomplete="${escapeHtml(options.autocomplete || "off")}">
          ${values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function loginPage() {
    return authShell(
      "Bem-vindo de volta",
      "Entre na sua conta para continuar sua jornada.",
      `
      <form class="form" data-form="login">
        ${fieldMarkup("Email", "email", "email", { icon: "mail", placeholder: "seu@email.com", autocomplete: "email" })}
        ${fieldMarkup("Senha", "senha", "password", { icon: "lock", placeholder: "••••••••", autocomplete: "current-password" })}
        <div style="display:flex;justify-content:flex-end;">
          <a href="/esqueci-senha" data-link class="text-primary" style="font-size:.9rem;font-weight:700;">Esqueci minha senha</a>
        </div>
        <div data-form-error></div>
        <button class="btn btn-primary" type="submit">${icon("login")} Entrar</button>
        <div class="divider"><span>Ou continue com</span></div>
        <button class="btn btn-secondary" type="button" data-action="demo-google">${googleLogo()} Google</button>
      </form>
      `,
      `Ainda não tem conta? <a href="/cadastro" data-link class="text-primary" style="font-weight:800;">Cadastre-se grátis</a>`,
    );
  }

  function cadastroPage() {
    return authShell(
      "Crie sua conta",
      "Preencha seus dados para começar com planos personalizados.",
      `
      <form class="form" data-form="cadastro">
        <div class="grid-2">
          ${fieldMarkup("Nome", "nome", "text", { icon: "user", placeholder: "Nome", autocomplete: "given-name" })}
          ${fieldMarkup("Sobrenome", "sobrenome", "text", { icon: "user", placeholder: "Sobrenome", autocomplete: "family-name" })}
        </div>
        <div class="grid-2">
          ${fieldMarkup("Data de nascimento", "dataNascimento", "date", { autocomplete: "bday" })}
          ${selectFieldMarkup("Gênero", "genero", ["Masculino", "Feminino"], "Masculino", true, { autocomplete: "sex" })}
        </div>
        ${fieldMarkup("Email", "email", "email", { icon: "mail", placeholder: "Email", autocomplete: "email" })}
        ${fieldMarkup("Senha", "senha", "password", { icon: "lock", placeholder: "Senha", autocomplete: "new-password", passwordStrength: "Mínimo de 10 caracteres" })}
        <div class="grid-2">
          ${fieldMarkup("Meta", "meta", "text", { required: false, placeholder: "Meta", value: "Não definida" })}
          ${selectFieldMarkup("Já treinou?", "jaTreinou", ["Nunca treinou", "Iniciante", "Intermediário", "Avançado"], "Nunca treinou", false)}
        </div>
        <div class="grid-2">
          ${fieldMarkup("Altura (m)", "altura", "number", { required: false, placeholder: "1.70", step: "0.01", min: "0" })}
          ${fieldMarkup("Peso (kg)", "peso", "number", { required: false, placeholder: "68.5", step: "0.1", min: "0" })}
        </div>
        <div data-form-error></div>
        <button class="btn btn-primary" type="submit">${icon("user")} Criar conta grátis</button>
        <div class="divider"><span>Ou cadastre-se com</span></div>
        <button class="btn btn-secondary" type="button" data-action="demo-google">${googleLogo()} Google</button>
      </form>
      `,
      `Já tem conta? <a href="/login" data-link class="text-primary" style="font-weight:800;">Fazer login</a>`,
    );
  }

  function esqueciSenhaPage() {
    const body = state.recoverySent
      ? `
        <div class="success-box" style="display:block;text-align:center;margin-top:2rem;">
          ${icon("checkCircle", "icon-xl")}
          <h2 style="margin-top:1rem;">Link enviado!</h2>
          <p class="text-muted" style="margin-top:.5rem;">Se o email informado estiver cadastrado, você receberá um link em instantes.</p>
        </div>
      `
      : `
        <form class="form" data-form="forgot">
          ${fieldMarkup("Email cadastrado", "email", "email", { icon: "mail", placeholder: "seu@email.com", autocomplete: "email" })}
          <button class="btn btn-primary" type="submit">${icon("send")} Enviar link de recuperação</button>
          <div data-form-error></div>
        </form>
      `;
    return authShell(
      "Recuperar senha",
      "Enviaremos um link para você definir uma nova senha.",
      body,
      `<a href="/login" data-link class="text-primary" style="display:inline-flex;align-items:center;gap:.35rem;font-weight:800;">${icon("arrowLeft")} Voltar para o login</a>`,
    );
  }

  function resetSenhaPage() {
    const body = state.resetDone
      ? `
        <div class="success-box" style="display:block;text-align:center;margin-top:2rem;">
          ${icon("checkCircle", "icon-xl")}
          <h2 style="margin-top:1rem;">Senha atualizada!</h2>
          <p class="text-muted" style="margin-top:.5rem;">Você já pode voltar para o login.</p>
        </div>
      `
      : `
        <form class="form" data-form="reset">
          ${fieldMarkup("Nova senha", "senha", "password", { icon: "lock", placeholder: "********", autocomplete: "new-password", passwordStrength: "Mínimo de 10 caracteres" })}
          ${fieldMarkup("Confirmar nova senha", "confirmar", "password", { icon: "lock", placeholder: "********", autocomplete: "new-password" })}
          <div data-form-error></div>
          <button class="btn btn-primary" type="submit">${icon("key")} Atualizar senha</button>
        </form>
      `;
    return authShell(
      "Defina sua nova senha",
      "Escolha uma senha forte que você consiga lembrar.",
      body,
      `<a href="/login" data-link class="text-primary" style="font-weight:800;">Voltar para o login</a>`,
    );
  }

  function defaultUserFromEmail(email) {
    const name = email ? email.split("@")[0].replace(/[._-]+/g, " ") : "Usuário NutriNow";
    const formatted = name.replace(/\b\w/g, (letter) => letter.toUpperCase());
    return {
      nome: formatted || "Usuário NutriNow",
      sobrenome: "",
      email: email || "usuario@nutrinow.com",
      genero: "Masculino",
      dataNascimento: "",
      meta: "Ganhar constância com dieta e treino",
      altura: 1.72,
      peso: 68,
      jaTreinou: "Iniciante",
      avatar: "",
    };
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

  async function loadPlans(tipo = state.planTab, force = false) {
    if (!getToken()) return;
    if (!force && state.plans[tipo]) return;
    if (state.plans.loading) return;

    state.plans.loading = true;
    state.plans.error = "";
    try {
      const data = await apiRequest(`/dieta-treino?tipo=${encodeURIComponent(tipo)}`);
      state.plans[tipo] = (data.items || []).map(normalizePlanItem);
    } catch (error) {
      state.plans.error = getErrorMessage(error, "Erro ao carregar planos");
      if (error.status === 401) {
        setToken("");
        setUser(null);
      }
    } finally {
      state.plans.loading = false;
    }
  }

  async function loadBothPlanTypes(force = false) {
    if (!getToken()) return;
    const tipos = ["treino", "dieta"].filter((tipo) => force || !state.plans[tipo]);
    if (!tipos.length || state.plans.loading) return;

    state.plans.loading = true;
    state.plans.error = "";
    try {
      const results = await Promise.all(
        tipos.map(async (tipo) => {
          const data = await apiRequest(`/dieta-treino?tipo=${encodeURIComponent(tipo)}`);
          return [tipo, (data.items || []).map(normalizePlanItem)];
        }),
      );
      results.forEach(([tipo, items]) => {
        state.plans[tipo] = items;
      });
    } catch (error) {
      state.plans.error = getErrorMessage(error, "Erro ao carregar planos");
      if (error.status === 401) {
        setToken("");
        setUser(null);
      }
    } finally {
      state.plans.loading = false;
    }
  }

  function defaultPlans() {
    const today = todayInput();
    return [
      {
        id: 1,
        tipo: "treino",
        title: "Treino de força",
        description: "Agachamento, remada, supino e prancha. Intensidade moderada.",
        time: "08:00",
        scheduleDate: today,
        durationMinutes: 60,
        recurrenceType: "weekly",
        recurrenceDays: ["MO", "WE", "FR"],
        recurrenceUntil: todayInput(addDays(new Date(), 70)),
      },
      {
        id: 2,
        tipo: "dieta",
        title: "Café da manhã proteico",
        description: "Ovos mexidos, fruta e iogurte natural com aveia.",
        time: "07:20",
        scheduleDate: today,
        durationMinutes: 30,
        recurrenceType: "weekly",
        recurrenceDays: ["MO", "TU", "WE", "TH", "FR"],
        recurrenceUntil: todayInput(addDays(new Date(), 70)),
      },
      {
        id: 3,
        tipo: "treino",
        title: "Cardio leve",
        description: "Caminhada rápida de 30 minutos com alongamento no final.",
        time: "18:30",
        scheduleDate: todayInput(addDays(new Date(), 2)),
        durationMinutes: 45,
        recurrenceType: "none",
        recurrenceDays: [],
        recurrenceUntil: "",
      },
      {
        id: 4,
        tipo: "dieta",
        title: "Almoço balanceado",
        description: "Arroz, feijão, frango grelhado, salada e azeite.",
        time: "12:30",
        scheduleDate: todayInput(addDays(new Date(), 1)),
        durationMinutes: 45,
        recurrenceType: "none",
        recurrenceDays: [],
        recurrenceUntil: "",
      },
    ];
  }

  function getPlans() {
    if (getToken()) {
      return [...(state.plans.treino || []), ...(state.plans.dieta || [])];
    }
    return defaultPlans();
  }

  function setPlans(plans) {
    state.plans.treino = plans.filter((plan) => plan.tipo === "treino");
    state.plans.dieta = plans.filter((plan) => plan.tipo === "dieta");
  }

  function dashboardPage() {
    const user = getUser();
    if (!user) return loginPage();
    const dashboard = state.dashboard.data;
    const profile = {
      name: dashboard?.profile?.name || user.nome || "Usuário NutriNow",
      height: Number(dashboard?.profile?.height || user.altura) || 1.72,
      weight: Number(dashboard?.profile?.weight || user.peso) || 68,
      goal: dashboard?.profile?.goal || user.meta || "Não definida",
    };
    const bmi = profile.weight / (profile.height * profile.height);
    const insights = dashboard?.conversationInsights?.length ? dashboard.conversationInsights : [
      { date: "Hoje", activity: "Boa evolução: você manteve proteína alta e treino planejado.", status: "positive" },
      { date: "Ontem", activity: "Hidratação abaixo da meta. Tente distribuir copos de água ao longo do dia.", status: "alert" },
      { date: "Semana", activity: "A rotina está consistente, com três registros de treino.", status: "neutral" },
    ];
    const chartData = dashboard?.weightHistory?.length ? dashboard.weightHistory.map((item) => ({
      date: item.date,
      weight: Number(item.weight || profile.weight),
      activity: Number(item.activityLevel || 0),
    })) : [
      { date: "Seg", weight: profile.weight + 0.6, activity: 3 },
      { date: "Ter", weight: profile.weight + 0.3, activity: 4 },
      { date: "Qua", weight: profile.weight + 0.1, activity: 2 },
      { date: "Qui", weight: profile.weight, activity: 5 },
      { date: "Sex", weight: profile.weight - 0.2, activity: 4 },
      { date: "Sáb", weight: profile.weight - 0.1, activity: 3 },
      { date: "Dom", weight: profile.weight - 0.4, activity: 4 },
    ];

    return pageShell(
      `
      <main class="page-main">
        <div class="container-wide">
          <section class="dashboard-hero">
            <div class="dashboard-hero-inner">
              <div>
                <span class="badge">${icon("sparkles")} Visão geral</span>
                <h1 style="margin-top:1rem;font-size:clamp(2rem,5vw,3rem);">Dashboard de ${escapeHtml(profile.name)}</h1>
                <p class="text-muted" style="margin-top:.5rem;">Meta atual: <strong style="color:var(--foreground);">${escapeHtml(profile.goal)}</strong></p>
                ${state.dashboard.loading ? `<p class="text-muted" style="margin-top:.5rem;">Atualizando dados...</p>` : ""}
                ${state.dashboard.error ? `<div class="alert" style="margin-top:1rem;">${icon("alert")} ${escapeHtml(state.dashboard.error)}</div>` : ""}
              </div>
              <div class="insight-card">
                <div class="insight-row">
                  <span class="feature-icon" style="width:2.75rem;height:2.75rem;margin:0;">${icon("target", "icon-lg")}</span>
                  <div>
                    <p class="text-primary" style="font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Último insight</p>
                    <p style="margin-top:.25rem;line-height:1.55;">${escapeHtml(insights[0].activity)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <div class="metric-grid">
            ${metricCard("Peso", `${profile.weight.toFixed(1)} kg`, "Peso atual registrado", "scale")}
            ${metricCard("Altura", `${profile.height.toFixed(2)} m`, "Altura salva no perfil", "trend")}
            ${metricCard("IMC", bmi.toFixed(1), "Índice de massa corporal", "activity")}
          </div>
          <div class="dashboard-grid">
            <div>
              <section class="chart-panel">
                <div class="chart-head">
                  <div>
                    <h2>Evolução recente</h2>
                    <p class="text-muted" style="margin-top:.5rem;">Acompanhamento visual do peso e do nível de atividade ao longo dos últimos dias.</p>
                  </div>
                  <span class="badge">${icon("dumbbell")} Foco em constância</span>
                </div>
                <div class="chart-box">${chartMarkup(chartData)}</div>
              </section>
            </div>
            <aside class="timeline-panel">
              <span class="badge">${icon("sparkles")} Timeline</span>
              <h2 style="margin-top:1rem;">Insights da conversa</h2>
              <p class="text-muted" style="margin-top:.5rem;line-height:1.6;">Resumo automático do que o sistema identificou nas conversas e na rotina recente.</p>
              <ul class="timeline-list">
                ${insights
                  .map(
                    (item) => `
                    <li class="timeline-item">
                      <div class="timeline-item-top">
                        <span class="text-muted" style="font-size:.75rem;font-weight:800;text-transform:uppercase;">${escapeHtml(item.date)}</span>
                        <span class="status-pill status-${item.status}">${item.status}</span>
                      </div>
                      <p style="margin-top:.8rem;line-height:1.6;">${escapeHtml(item.activity)}</p>
                    </li>
                  `,
                  )
                  .join("")}
              </ul>
            </aside>
          </div>
          ${bmiMarkup("dashboard-bmi", profile.weight, profile.height, "dashboard-bmi-block")}
        </div>
      </main>
      `,
      "/dashboard",
    );
  }

  function metricCard(title, value, desc, iconName) {
    return `
      <article class="metric-card">
        <div class="metric-top">
          <div>
            <p class="text-muted">${title}</p>
            <div class="metric-value">${value}</div>
          </div>
          <span class="metric-icon">${icon(iconName, "icon-lg")}</span>
        </div>
        <p class="text-muted" style="margin-top:1rem;">${desc}</p>
      </article>
    `;
  }

  async function loadDashboard(force = false) {
    if (!getToken()) return;
    if (!force && state.dashboard.loaded) return;
    if (state.dashboard.loading) return;

    state.dashboard.loading = true;
    state.dashboard.error = "";
    try {
      const data = await apiRequest("/dashboard");
      state.dashboard.data = data;
      state.dashboard.loaded = true;
    } catch (error) {
      state.dashboard.error = getErrorMessage(error, "Erro ao carregar dashboard");
    } finally {
      state.dashboard.loading = false;
    }
  }

  function chartMarkup(data) {
    const width = 760;
    const height = 300;
    const pad = 46;
    const weights = data.map((item) => item.weight);
    const minW = Math.min(...weights) - 0.5;
    const maxW = Math.max(...weights) + 0.5;
    const maxA = Math.max(...data.map((item) => item.activity), 5);
    const x = (index) => pad + (index * (width - pad * 2)) / (data.length - 1);
    const yWeight = (weight) => height - pad - ((weight - minW) / (maxW - minW)) * (height - pad * 2);
    const yActivity = (activity) => height - pad - (activity / maxA) * (height - pad * 2);
    const lineWeight = data.map((item, index) => `${x(index)},${yWeight(item.weight)}`).join(" ");
    const lineActivity = data.map((item, index) => `${x(index)},${yActivity(item.activity)}`).join(" ");
    return `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de evolução">
        ${[0, 1, 2, 3].map((n) => `<line x1="${pad}" x2="${width - pad}" y1="${pad + n * 64}" y2="${pad + n * 64}" stroke="var(--border)" stroke-dasharray="4 5"/>`).join("")}
        <polyline points="${lineWeight}" fill="none" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="${lineActivity}" fill="none" stroke="var(--accent-foreground)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
        ${data
          .map(
            (item, index) => `
              <circle cx="${x(index)}" cy="${yWeight(item.weight)}" r="5" fill="var(--primary)"/>
              <circle cx="${x(index)}" cy="${yActivity(item.activity)}" r="4" fill="var(--accent-foreground)"/>
              <text x="${x(index)}" y="${height - 14}" text-anchor="middle" font-size="13" fill="var(--muted-foreground)">${item.date}</text>
            `,
          )
          .join("")}
        <text x="${pad}" y="22" font-size="13" fill="var(--primary)" font-weight="700">Peso</text>
        <text x="${width - pad}" y="22" text-anchor="end" font-size="13" fill="var(--accent-foreground)" font-weight="700">Atividade</text>
      </svg>
    `;
  }

  function planosPage() {
    const user = getUser();
    if (!user) return loginPage();
    const plans = getPlans();
    const visible = plans.filter((item) => item.tipo === state.planTab);
    const tabName = state.planTab === "treino" ? "treino" : "refeição";
    const needsLoad = getToken() && !state.plans[state.planTab];
    const plansLoading = needsLoad || state.plans.loading;
    return pageShell(
      `
      <main class="page-main">
        <div class="container">
          <div class="page-heading">
            <div>
              <span class="badge">${icon("sparkles")} Olá, ${escapeHtml(getFirstName(user))}</span>
              <h1>Meus planos</h1>
              <p>Organize sua semana de treinos e refeições em um só lugar.</p>
            </div>
            <button class="btn btn-primary" data-action="open-plan-modal">${icon("plus")} Adicionar</button>
          </div>
          <div class="tabs">
            <button class="tab-btn ${state.planTab === "treino" ? "active" : ""}" data-plan-tab="treino">${icon("dumbbell")} Treinos</button>
            <button class="tab-btn ${state.planTab === "dieta" ? "active" : ""}" data-plan-tab="dieta">${icon("apple")} Dietas</button>
          </div>
          ${state.plans.error ? `<div class="alert" style="margin-top:1rem;">${icon("alert")} ${escapeHtml(state.plans.error)}</div>` : ""}
          ${
            plansLoading
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
      `,
      "/planos",
    );
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
    const label = state.planTab === "treino" ? "treino" : "refeição";
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
            ${fieldMarkup("Título", "title", "text", { placeholder: state.planTab === "treino" ? "Ex: Treino de pernas" : "Ex: Café da manhã", value: item.title || "" })}
            <label class="field">
              <span class="label" style="margin-bottom:.4rem;">Descrição</span>
              <textarea name="description" class="textarea" required autocomplete="off" placeholder="Detalhes...">${escapeHtml(item.description || "")}</textarea>
            </label>
            ${fieldMarkup("Horário (opcional)", "time", "text", { required: false, placeholder: "Ex: 08:00 ou Pós-treino", value: item.time || "" })}
            <div class="modal-actions">
              <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
              <button class="btn btn-primary" type="submit">${editing ? "Salvar" : "Adicionar"}</button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  function calendarioPage() {
    const user = getUser();
    if (!user) return loginPage();
    const connected = Boolean(state.googleStatus.data?.connected);
    const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(state.calendarDate);
    return pageShell(
      `
      <main class="page-main">
        <div class="container-wide">
          <div class="calendar-toolbar">
            <div>
              <h1 style="font-size:clamp(2rem,5vw,3rem);">Calendário para treinos e dietas</h1>
              <p class="text-muted" style="margin-top:.6rem;max-width:44rem;line-height:1.6;">Veja sua agenda do mês em um único lugar. Os eventos são carregados da sua base atual de planos.</p>
            </div>
            <button class="btn btn-dark" data-action="open-calendar-modal">${icon("plus")} Adicionar item</button>
          </div>
          <section class="google-card">
            <div class="google-row">
              <div class="google-info">
                <span class="metric-icon" style="background:var(--secondary);color:var(--foreground);">${icon("calendar", "icon-lg")}</span>
                <div>
                  <h2 style="font-size:1.05rem;">Google Calendar</h2>
                  <p class="text-muted" style="margin-top:.25rem;">${
                    state.googleStatus.loading
                      ? "Verificando conexão..."
                      : connected
                        ? state.googleStatus.data?.needsReconnect
                          ? "Reconexão necessária"
                          : `Conectado em ${escapeHtml(state.googleStatus.data?.calendarId || "primary")}`
                        : "Não conectado"
                  }</p>
                </div>
              </div>
              <div class="google-actions">
                ${
                  connected
                    ? `
                      <button class="btn btn-primary" data-action="sync-google">${icon("refresh")} Forçar sincronização</button>
                      <button class="btn btn-secondary" data-action="disconnect-google">${icon("unlink")} Desconectar</button>
                    `
                    : `<button class="btn btn-dark" data-action="connect-google">${icon("link")} Conectar</button>`
                }
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
                <button class="icon-btn" data-action="prev-month" aria-label="Mês anterior">${icon("chevronLeft", "icon-lg")}</button>
                <button class="icon-btn" data-action="next-month" aria-label="Próximo mês">${icon("chevronRight", "icon-lg")}</button>
              </div>
            </div>
            ${calendarGridMarkup()}
          </section>
        </div>
      </main>
      ${calendarModalMarkup()}
      `,
      "/calendario",
    );
  }

  function calendarGridMarkup() {
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
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
        ${cells
          .map((day, index) => {
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
                  ${
                    dayEvents.length
                      ? dayEvents.map(calendarEventMarkup).join("")
                      : `<div class="calendar-event" style="border-style:dashed;border-color:var(--border);background:transparent;color:var(--muted-foreground);">Sem agenda</div>`
                  }
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function expandPlansForMonth(year, month) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    return getPlans().flatMap((plan) => {
      const date = parseDateOnly(plan.scheduleDate || todayInput());
      const [hour = "08", minute = "00"] = String(plan.time || "08:00").match(/^\d{2}:\d{2}$/)
        ? String(plan.time).split(":")
        : ["08", "00"];
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
    return {
      ...plan,
      eventId: `${plan.id}-${todayInput(date)}`,
      date,
      dateKey: todayInput(date),
      recurring,
    };
  }

  function calendarEventMarkup(item) {
    const isWorkout = item.tipo === "treino";
    const label = isWorkout ? "Treino" : "Dieta";
    const duration = item.durationMinutes ? ` • ${durationLabel(item.durationMinutes)}` : "";
    return `
      <article class="calendar-event ${isWorkout ? "workout" : "diet"}">
        <div class="event-title-row">
          <div class="event-title-text">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${label} • ${escapeHtml(item.time || timeInput(item.date))}${duration}${item.recurring ? " • Semanal" : ""}</small>
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

  async function loadGoogleStatus(force = false) {
    if (!getToken()) return;
    if (!force && state.googleStatus.loaded) return;
    if (state.googleStatus.loading) return;

    state.googleStatus.loading = true;
    state.googleStatus.error = "";
    try {
      const data = await apiRequest("/calendar/google/status");
      state.googleStatus.data = data;
      state.googleStatus.loaded = true;
    } catch (error) {
      state.googleStatus.error = getErrorMessage(error, "Erro ao verificar Google Calendar");
      state.googleError = state.googleStatus.error;
    } finally {
      state.googleStatus.loading = false;
    }
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
      tipo: "treino",
      title: "",
      description: "",
      scheduleDate: todayInput(),
      time: "08:00",
      durationMinutes: 120,
      recurrenceType: "none",
      recurrenceDays: [jsDayToGoogleDay[new Date().getDay()]],
      recurrenceUntil: todayInput(addDays(new Date(), 84)),
    };
    const isWeekly = item.recurrenceType === "weekly";
    const weekdays = state.calendarWeekdays.length ? state.calendarWeekdays : item.recurrenceDays || [jsDayToGoogleDay[new Date().getDay()]];
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
            <input type="hidden" name="tipo" value="${item.tipo}">
            ${fieldMarkup("Título", "title", "text", { placeholder: item.tipo === "treino" ? "Ex: Treino de pernas" : "Ex: Almoço", value: item.title || "" })}
            <label class="field">
              <span class="label" style="margin-bottom:.4rem;">Descrição</span>
              <textarea name="description" class="textarea" required autocomplete="off" placeholder="Detalhes...">${escapeHtml(item.description || "")}</textarea>
            </label>
            <div class="grid-2">
              ${fieldMarkup("Data", "scheduleDate", "date", { value: item.scheduleDate || todayInput() })}
              ${fieldMarkup("Horário", "time", "time", { value: item.time || "08:00", required: false })}
            </div>
            ${fieldMarkup("Duração (h)", "durationHours", "number", { value: ((item.durationMinutes || 60) / 60).toString(), min: "0.25", step: "0.25" })}
            <div class="slider-field" style="display:grid;gap:1rem;">
              <div class="segmented">
                <button type="button" class="${!isWeekly ? "active" : ""}" data-recurrence="none">Único</button>
                <button type="button" class="${isWeekly ? "active" : ""}" data-recurrence="weekly">Semanal</button>
              </div>
              <input type="hidden" name="recurrenceType" value="${isWeekly ? "weekly" : "none"}">
              <div data-weekly-options class="${isWeekly ? "" : "hidden"}" style="display:grid;gap:1rem;">
                <div class="weekday-toggle-grid">
                  ${weekDayOptions
                    .map(
                      (day) => `
                        <button type="button" class="weekday-toggle ${weekdays.includes(day.code) ? "active" : ""}" data-weekday="${day.code}">${day.label}</button>
                      `,
                    )
                    .join("")}
                </div>
                ${fieldMarkup("Até", "recurrenceUntil", "date", { value: item.recurrenceUntil || todayInput(addDays(new Date(), 84)) })}
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

  function chatPage() {
    const user = getUser();
    if (!user) return loginPage();
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
    return `
      <div class="chat-page">
        <header class="chat-topbar">
          <div class="chat-topbar-left">
            <button class="icon-btn open-sidebar-button" data-action="open-chat-sidebar" aria-label="Abrir histórico">${icon("menu", "icon-lg")}</button>
            <a href="/" data-link class="brand">${brandMarkup()}</a>
          </div>
          <nav class="chat-nav">
            ${chatNavLink("/chat", "message", "Chat", true)}
            ${chatNavLink("/dashboard", "layout", "Dashboard")}
            ${chatNavLink("/planos", "dumbbell", "Planos")}
            ${chatNavLink("/calendario", "calendar", "Calendário")}
            ${chatNavLink("/perfil", "user", getFirstName(user))}
            <button class="chat-nav-link" data-action="logout">${icon("logout")} Sair</button>
          </nav>
        </header>
        <main class="chat-shell">
          <button class="chat-backdrop ${state.chatSidebarOpen ? "open" : ""}" data-action="close-chat-sidebar" aria-label="Fechar histórico"></button>
          <aside class="chat-sidebar ${state.chatSidebarOpen ? "open" : ""}">
            <div class="chat-sidebar-head">
              <div>
                <p class="text-primary" style="font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Histórico</p>
                <h2 style="font-size:1.1rem;">Conversas</h2>
              </div>
              <button class="mini-icon close-sidebar" data-action="close-chat-sidebar" aria-label="Fechar histórico">${icon("x", "icon-lg")}</button>
            </div>
            <div class="chat-sidebar-actions">
              <button class="btn btn-primary" data-action="new-chat">${icon("plus")} Novo chat</button>
              <label class="chat-search">${icon("search")}<input value="${escapeHtml(state.chatSearch)}" data-chat-search autocomplete="off" placeholder="Buscar chats"></label>
            </div>
            <div class="chat-history">
              <p class="history-title">Recentes</p>
              ${
                visibleSessions.length
                  ? visibleSessions.map((session) => historyRow(session, session.id === currentId)).join("")
                  : `<div class="empty-state" style="margin:0;padding:1.5rem;">${icon("message")}<h3>Sem conversas</h3><p>As consultas salvas aparecem aqui.</p></div>`
              }
              ${state.chatSessions.error ? `<div class="alert" style="margin:.75rem;">${icon("alert")} ${escapeHtml(state.chatSessions.error)}</div>` : ""}
            </div>
          </aside>
          <section class="chat-main">
            <div class="messages" data-messages>
              ${messages.map((message) => chatMessageMarkup(message, user)).join("")}
              ${state.chatTyping ? typingMarkup() : ""}
            </div>
            ${
              hasOnlyWelcome
                ? `<div class="suggestions">
                    <div class="suggestions-inner">
                      <p class="text-muted" style="font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Sugestões</p>
                      <div class="suggestion-list">
                        ${["Sugira um café da manhã rápido", "Treino de 20 min em casa", "Quantas calorias tem 100g de arroz?", "Receita saudável com frango"]
                          .map((text) => `<button class="suggestion-btn" data-suggestion="${escapeHtml(text)}">${escapeHtml(text)}</button>`)
                          .join("")}
                      </div>
                    </div>
                  </div>`
                : ""
            }
            <form class="composer" data-form="chat">
              <div class="composer-inner">
                <label class="icon-btn" aria-label="Enviar imagem">
                  ${icon("imagePlus", "icon-lg")}
                  <input type="file" accept="image/*" class="hidden" data-chat-file>
                </label>
                <input type="text" name="message" autocomplete="off" placeholder="Pergunte algo à NutriAI...">
                <button class="icon-btn btn-primary" type="submit" aria-label="Enviar" style="border:0;">${icon("send", "icon-lg")}</button>
              </div>
            </form>
          </section>
        </main>
      </div>
    `;
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
    if (!id) {
      id = uid("session");
      sessionStorage.setItem(STORAGE.currentSession, id);
    }
    return id;
  }

  function mapSessionSummary(session) {
    return {
      id: session.session_id || session.id,
      title: session.title || "Nova conversa",
      preview: session.preview || "",
      createdAt: session.created_at || session.createdAt || new Date().toISOString(),
      updatedAt: session.updated_at || session.updatedAt || new Date().toISOString(),
      messages: session.messages || [],
      messageCount: session.message_count || session.messageCount || 0,
    };
  }

  function mapHistoryItem(item, index) {
    return {
      id: `${index}-${item.timestamp || Date.now()}`,
      text: item.content || "",
      isUser: item.role === "user",
      timestamp: item.timestamp || new Date().toISOString(),
    };
  }

  async function loadChatSessions(force = false) {
    if (!getToken()) return;
    if (!force && state.chatSessions.loaded) return;
    if (state.chatSessions.loading) return;

    state.chatSessions.loading = true;
    state.chatSessions.error = "";
    try {
      const data = await apiRequest("/chat_sessions");
      const sessions = (data.sessions || []).map(mapSessionSummary);
      setChatSessions(sessions);
      const currentId = getCurrentSessionId();
      if (!sessions.some((session) => session.id === currentId) && sessions[0]) {
        sessionStorage.setItem(STORAGE.currentSession, sessions[0].id);
      }
    } catch (error) {
      state.chatSessions.error = getErrorMessage(error, "Erro ao carregar histórico");
    } finally {
      state.chatSessions.loading = false;
    }
  }

  async function loadChatHistory(sessionId = getCurrentSessionId(), force = false) {
    if (!getToken() || !sessionId) return;
    if (!force && state.chatHistory[sessionId]) return;

    try {
      const data = await apiRequest(`/chat_history?session_id=${encodeURIComponent(sessionId)}`, {
        sessionId,
      });
      const history = (data.history || []).map(mapHistoryItem);
      state.chatHistory[sessionId] = history.length ? history : [welcomeMessage()];
    } catch (error) {
      state.chatHistory[sessionId] = [welcomeMessage()];
      state.chatSessions.error = getErrorMessage(error, "Erro ao carregar conversa");
    }
  }

  function welcomeMessage() {
    return {
      id: "welcome",
      text: "Olá. Sou a NutriAI. Como posso ajudar com sua alimentação e treino hoje?",
      isUser: false,
      timestamp: new Date().toISOString(),
    };
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
          <span class="chat-avatar user-avatar">${escapeHtml((user.nome || "U")[0].toUpperCase())}</span>
        </div>
      `;
    }
    return `
      <div class="message assistant">
        <span class="chat-avatar"><img src="${ASSETS.logo}" alt="NutriAI" width="36" height="36" decoding="async"></span>
        <div class="bubble assistant-bubble">
          <div class="bubble-head">
            <span><span class="bubble-status"></span>NutriAI</span>
            <span class="bubble-head-icon">${icon("sparkles")}</span>
          </div>
          <div class="bubble-body">${renderMessageText(message.text)}</div>
          <div class="bubble-footer"><span>Resposta</span><span>${time}</span></div>
        </div>
      </div>
    `;
  }

  function typingMarkup() {
    return `
      <div class="message assistant">
        <span class="chat-avatar"><img src="${ASSETS.logo}" alt="NutriAI" width="36" height="36" decoding="async"></span>
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
    const hasStructure = lines.some((line) => /^(#{1,6}\s+|>\s?|\|.*\|$|-{3,})/.test(line.trim())) || lines.filter((line) => line.trim()).length > 4;
    let html = "";
    let listType = "";
    let firstContent = true;

    const closeList = () => {
      if (!listType) return;
      html += `</${listType}>`;
      listType = "";
    };

    const openList = (type) => {
      if (listType === type) return;
      closeList();
      listType = type;
      html += `<${type}>`;
    };

    const tableRow = (line) => {
      const trimmed = line.trim();
      if (!/^\|.*\|$/.test(trimmed)) return null;
      return trimmed
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
    };

    const isSeparatorRow = (row) => row.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));

    const nextNonEmptyLine = (start) => {
      for (let index = start; index < lines.length; index += 1) {
        if (lines[index].trim()) return lines[index].trim();
      }
      return "";
    };

    const renderTable = (rows) => {
      const header = rows[0];
      const bodyRows = isSeparatorRow(rows[1] || []) ? rows.slice(2) : rows.slice(1);
      const head = header.map((cell) => `<th scope="col">${inlineMarkdown(cell)}</th>`).join("");
      const body = bodyRows
        .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="message-table-wrap"><table class="message-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    };

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const line = rawLine.trim();

      if (!line) {
        closeList();
        continue;
      }

      const currentTableRow = tableRow(line);
      const nextTableRow = tableRow(nextNonEmptyLine(index + 1));
      if (currentTableRow && nextTableRow) {
        closeList();
        const rows = [currentTableRow];
        while (index + 1 < lines.length) {
          const nextTrimmed = lines[index + 1].trim();
          if (!nextTrimmed) {
            if (tableRow(nextNonEmptyLine(index + 2))) {
              index += 1;
              continue;
            }
            break;
          }

          const row = tableRow(nextTrimmed);
          if (!row) break;
          rows.push(row);
          index += 1;
        }
        html += renderTable(rows);
        firstContent = false;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)/);
      if (heading) {
        closeList();
        const level = heading[1].length <= 2 ? "h3" : "h4";
        html += `<${level}>${inlineMarkdown(heading[2])}</${level}>`;
        firstContent = false;
        continue;
      }

      if (/^-{3,}$/.test(line)) {
        closeList();
        html += '<hr class="message-rule">';
        firstContent = false;
        continue;
      }

      const quote = line.match(/^>\s?(.+)/);
      if (quote) {
        closeList();
        const quoteLines = [quote[1]];
        while (index + 1 < lines.length) {
          const nextQuote = lines[index + 1].trim().match(/^>\s?(.+)/);
          if (!nextQuote) break;
          quoteLines.push(nextQuote[1]);
          index += 1;
        }
        html += `<blockquote>${quoteLines.map((item) => `<p>${inlineMarkdown(item)}</p>`).join("")}</blockquote>`;
        firstContent = false;
        continue;
      }

      const bullet = line.match(/^[-*]\s+(.+)/);
      if (bullet) {
        openList("ul");
        html += `<li>${inlineMarkdown(bullet[1])}</li>`;
        firstContent = false;
        continue;
      }

      const ordered = line.match(/^\d+[.)]\s+(.+)/);
      if (ordered) {
        openList("ol");
        html += `<li>${inlineMarkdown(ordered[1])}</li>`;
        firstContent = false;
        continue;
      }

      closeList();
      if (firstContent && hasStructure && line.length <= 120) {
        html += `<h3 class="message-title">${inlineMarkdown(line)}</h3>`;
      } else {
        html += `<p>${inlineMarkdown(line)}</p>`;
      }
      firstContent = false;
    }

    closeList();
    return html || "<p></p>";
  }

  function inlineMarkdown(value) {
    return value
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function normalizeText(value = "") {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function botResponse(text) {
    const normalized = normalizeText(text);
    if (normalized.includes("cafe") || normalized.includes("manhã") || normalized.includes("manha")) {
      return "**Café da manhã rápido:**\n- Iogurte natural com aveia e banana\n- 2 ovos mexidos\n- Café ou chá sem açúcar\n\nBoa combinação de proteína, fibra e energia para começar o dia.";
    }
    if (normalized.includes("treino") || normalized.includes("casa")) {
      return "**Treino de 20 minutos em casa:**\n- 4 min de aquecimento\n- 3 séries de agachamento, flexão inclinada e prancha\n- 4 min de alongamento\n\nMantenha intensidade confortável e priorize execução.";
    }
    if (normalized.includes("caloria") || normalized.includes("arroz")) {
      return "Em média, **100g de arroz cozido** tem cerca de `130 kcal`. O valor muda conforme preparo, quantidade de óleo e tipo de arroz.";
    }
    if (normalized.includes("frango") || normalized.includes("receita")) {
      return "**Receita saudável com frango:** frango grelhado em tiras, legumes salteados, arroz integral e molho de iogurte com limão. Fica simples, proteico e fácil de repetir na semana.";
    }
    return "Boa pergunta. Para uma rotina mais consistente, tente combinar **proteína em todas as refeições**, água ao longo do dia e treinos curtos que você consiga repetir. Posso montar um plano mais específico se você me disser seu objetivo e tempo disponível.";
  }

  function formatShortDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function perfilPage() {
    const cachedUser = getUser();
    if (!cachedUser) return loginPage();
    const profileData = state.profile.data || {};
    const user = {
      ...cachedUser,
      ...profileData,
      dataNascimento: profileData.dataNascimento ?? cachedUser.dataNascimento,
      jaTreinou: profileData.ja_treinou ?? cachedUser.jaTreinou,
      avatar: cachedUser.avatar || "",
    };
    const fullName = `${user.nome || ""} ${user.sobrenome || ""}`.trim() || "Usuário NutriNow";
    return pageShell(
      `
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
                <h2>Informações da conta</h2>
                <p class="text-muted" style="margin-top:.35rem;">Atualize os mesmos dados usados na experiência do app.</p>
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
                ${selectFieldMarkup("Gênero", "genero", ["Masculino", "Feminino"], user.genero || "Masculino", true, { autocomplete: "sex" })}
                ${fieldMarkup("Data de nascimento", "dataNascimento", "date", { value: user.dataNascimento || "", autocomplete: "bday" })}
              </div>
              ${fieldMarkup("Email", "email", "email", { icon: "mail", value: user.email || "", autocomplete: "email" })}
              <div class="grid-2">
                ${fieldMarkup("Meta", "meta", "text", { required: false, value: user.meta || "Não definida" })}
                ${selectFieldMarkup("Já treinou?", "jaTreinou", ["Nunca treinou", "Iniciante", "Intermediário", "Avançado"], user.jaTreinou || "Nunca treinou", false)}
              </div>
              <div class="grid-2">
                ${fieldMarkup("Altura (m)", "altura", "number", { required: false, value: user.altura || "", min: "0", step: "0.01" })}
                ${fieldMarkup("Peso (kg)", "peso", "number", { required: false, value: user.peso || "", min: "0", step: "0.1" })}
              </div>
              ${user.avatar ? `<button class="btn btn-ghost text-danger" style="justify-content:flex-start;padding-left:0;" type="button" data-action="remove-avatar">${icon("trash")} Remover avatar</button>` : ""}
              <div class="modal-actions" style="border-top:1px solid var(--border);padding-top:1.25rem;">
                <button class="btn btn-secondary" type="button" data-action="logout">${icon("logout")} Sair da conta</button>
                <button class="btn btn-primary" type="submit">${icon("save")} Salvar alterações</button>
              </div>
            </form>
          </section>
        </div>
      </main>
      `,
      "/perfil",
    );
  }

  async function loadProfile(force = false) {
    if (!getToken()) return;
    if (!force && state.profile.loaded) return;
    if (state.profile.loading) return;

    state.profile.loading = true;
    state.profile.error = "";
    try {
      const data = await apiRequest("/perfil");
      state.profile.data = data;
      state.profile.loaded = true;
      const user = getUser();
      if (user) {
        setUser({
          ...user,
          nome: data.nome ?? user.nome,
          sobrenome: data.sobrenome ?? user.sobrenome,
          email: data.email ?? user.email,
          altura: data.altura ?? user.altura,
          peso: data.peso ?? user.peso,
          meta: data.meta ?? user.meta,
          genero: data.genero ?? user.genero,
          dataNascimento: data.dataNascimento ?? user.dataNascimento,
          jaTreinou: data.ja_treinou ?? user.jaTreinou,
        });
      }
    } catch (error) {
      state.profile.error = getErrorMessage(error, "Erro ao carregar perfil");
    } finally {
      state.profile.loading = false;
    }
  }

  function feedbacksPage() {
    return pageShell(
      `
      <main class="page-main">
        <div class="container" style="max-width:50rem;">
          <a href="/" data-link class="btn btn-secondary">${icon("arrowLeft")} Voltar para a página inicial</a>
          <section class="feedback-card" style="margin-top:1.5rem;">
            <div class="feedback-hero">
              <span class="feature-icon" style="width:2.75rem;height:2.75rem;margin:0;background:rgba(255,255,255,.15);box-shadow:none;">${icon("message", "icon-lg")}</span>
              <h1 style="margin-top:1rem;font-size:clamp(2rem,5vw,3rem);">Feedbacks do NutriNow</h1>
              <p style="margin-top:.6rem;max-width:42rem;color:rgba(255,255,255,.88);line-height:1.6;">Sua opinião ajuda a gente a evoluir mais rápido. Conta pra gente o que você gostou e o que podemos melhorar.</p>
            </div>
            <div class="feedback-body">
              ${
                state.feedbackSubmitted
                  ? `
                    <div class="success-box" style="display:block;text-align:center;">
                      <h2>Obrigado pelo seu feedback!</h2>
                      <p class="text-muted" style="margin-top:.5rem;">Sua mensagem foi registrada e vai nos ajudar a melhorar o NutriNow.</p>
                      <button class="btn btn-secondary" style="margin-top:1.25rem;" data-action="new-feedback">Enviar outro feedback</button>
                    </div>
                  `
                  : `
                    <form class="form" data-form="feedback">
                      <div>
                        <p style="font-weight:800;">Como você avalia sua experiência?</p>
                        <div class="rating-row">
                          ${[1, 2, 3, 4, 5]
                            .map(
                              (value) => `
                                <button class="rating-btn ${state.feedbackRating >= value ? "active" : ""}" type="button" data-rating="${value}">
                                  ${icon("star")} ${value}
                                </button>
                              `,
                            )
                            .join("")}
                        </div>
                      </div>
                      ${fieldMarkup("Nome (opcional)", "name", "text", { required: false, placeholder: "Seu nome", autocomplete: "name" })}
                      <label class="field">
                        <span class="label" style="margin-bottom:.4rem;">Mensagem</span>
                        <textarea name="message" class="textarea" required autocomplete="off" placeholder="Escreva seu feedback aqui..."></textarea>
                      </label>
                      <div data-form-error></div>
                      <button class="btn btn-primary" type="submit">${icon("send")} Enviar feedback</button>
                    </form>
                  `
              }
            </div>
          </section>
        </div>
      </main>
      `,
      "/feedbacks",
    );
  }

  function render() {
    const path = normalizePath(getCurrentPath());
    state.recoverySent = path === "/esqueci-senha" ? state.recoverySent : false;
    state.resetDone = path === "/reset-senha" ? state.resetDone : false;
    const titles = {
      "/": "NutriNow - Nutrição e treinos com IA",
      "/login": "Entrar - NutriNow",
      "/cadastro": "Criar conta - NutriNow",
      "/esqueci-senha": "Recuperar senha - NutriNow",
      "/reset-senha": "Redefinir senha - NutriNow",
      "/dashboard": "Dashboard - NutriNow",
      "/planos": "Meus planos - NutriNow",
      "/calendario": "Calendário - NutriNow",
      "/chat": "Chat NutriAI - NutriNow",
      "/perfil": "Meu perfil - NutriNow",
      "/feedbacks": "Feedbacks - NutriNow",
    };
    document.title = titles[path] || titles["/"];
    const pages = {
      "/": landingPage,
      "/login": loginPage,
      "/cadastro": cadastroPage,
      "/esqueci-senha": esqueciSenhaPage,
      "/reset-senha": resetSenhaPage,
      "/dashboard": dashboardPage,
      "/planos": planosPage,
      "/calendario": calendarioPage,
      "/chat": chatPage,
      "/perfil": perfilPage,
      "/feedbacks": feedbacksPage,
    };
    app.innerHTML = pages[path]();
    bindPage();
    handleBackendRedirectParams(path);
    scheduleRouteLoads(path);
    requestAnimationFrame(() => {
      app.querySelectorAll("[data-bmi]").forEach((root) => updateBmi(root));
      const messages = app.querySelector("[data-messages]");
      if (messages) messages.scrollTop = messages.scrollHeight;
    });
  }

  function cleanQueryParams(keys) {
    if (!location.protocol.startsWith("http")) return;
    const url = new URL(location.href);
    let changed = false;
    keys.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (changed) history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function handleBackendRedirectParams(path) {
    if (!location.protocol.startsWith("http")) return;
    const params = new URLSearchParams(location.search);
    const authCode = params.get("auth_code");
    if (authCode && !state.authExchanging) {
      state.authExchanging = true;
      apiRequest("/auth/exchange-code", {
        method: "POST",
        body: JSON.stringify({ code: authCode }),
        token: "",
      })
        .then((payload) => {
          saveSessionPayload(payload);
          state.authExchanging = false;
          cleanQueryParams(["auth_code"]);
          routeTo("/", true);
        })
        .catch((error) => {
          state.authExchanging = false;
          cleanQueryParams(["auth_code"]);
          alert(getErrorMessage(error, "Falha ao concluir login com Google"));
          routeTo("/login", true);
        });
    }

    const calendarResult = params.get("google_calendar");
    if (path === "/calendario" && calendarResult) {
      if (calendarResult === "connected") {
        state.googleMessage = "Google Calendar conectado.";
        state.googleError = "";
      } else if (calendarResult === "denied") {
        state.googleError = "Permissão do Google Calendar negada.";
        state.googleMessage = "";
      } else {
        state.googleError = "Não foi possível conectar o Google Calendar.";
        state.googleMessage = "";
      }
      state.googleStatus.loaded = false;
      cleanQueryParams(["google_calendar"]);
    }
  }

  function scheduleRouteLoads(path) {
    if (!getToken()) return;

    if (path === "/dashboard" && !state.dashboard.loaded && !state.dashboard.loading) {
      loadDashboard().then(render);
    }

    if (path === "/perfil" && !state.profile.loaded && !state.profile.loading) {
      loadProfile().then(render);
    }

    if (path === "/planos" && !state.plans[state.planTab] && !state.plans.loading) {
      loadPlans(state.planTab).then(render);
    }

    if (
      path === "/calendario" &&
      ((!state.plans.treino || !state.plans.dieta) && !state.plans.loading)
    ) {
      loadBothPlanTypes().then(render);
    }

    if (path === "/calendario" && !state.googleStatus.loaded && !state.googleStatus.loading) {
      loadGoogleStatus().then(render);
    }

    if (path === "/chat" && !state.chatSessions.loaded && !state.chatSessions.loading) {
      loadChatSessions()
        .then(() => loadChatHistory(getCurrentSessionId()))
        .then(render);
    } else if (path === "/chat" && !state.chatHistory[getCurrentSessionId()]) {
      loadChatHistory(getCurrentSessionId()).then(render);
    }
  }

  function bindPage() {
    app.querySelectorAll("a[data-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("http")) return;
        event.preventDefault();
        routeTo(href);
      });
    });

    app.querySelectorAll('[data-action="toggle-mobile-menu"]').forEach((button) => {
      button.addEventListener("click", () => {
        app.querySelector("[data-mobile-panel]")?.classList.toggle("open");
      });
    });

    app.querySelectorAll('[data-action="logout"]').forEach((button) => {
      button.addEventListener("click", async () => {
        await logoutFromBackend();
        routeTo("/");
      });
    });

    app.querySelectorAll('[data-bmi-input]').forEach((input) => {
      input.addEventListener("input", () => updateBmi(input.closest("[data-bmi]")));
    });

    bindPasswordControls();
    bindAuth();
    bindPlans();
    bindCalendar();
    bindChat();
    bindProfile();
    bindFeedback();
    bindModalClose();
  }

  function setFormError(form, message) {
    const target = form.querySelector("[data-form-error]");
    if (target) target.innerHTML = message ? `<div class="alert">${icon("alert")} ${escapeHtml(message)}</div>` : "";
  }

  function bindPasswordControls() {
    app.querySelectorAll('[data-action="toggle-password"]').forEach((button) => {
      button.addEventListener("click", () => {
        const input = button.closest(".input-wrap")?.querySelector("input");
        if (!input) return;
        const wasHidden = input.type === "password";
        input.type = wasHidden ? "text" : "password";
        button.innerHTML = icon(wasHidden ? "eyeOff" : "eye");
        button.setAttribute("aria-label", wasHidden ? "Ocultar senha" : "Mostrar senha");
        button.setAttribute("aria-pressed", String(wasHidden));
        input.focus();
      });
    });

    app.querySelectorAll("[data-password-strength-input]").forEach((input) => {
      const updateStrength = () => {
        const hint = input.closest(".field")?.querySelector("[data-password-strength]");
        if (!hint) return;
        const minLength = Number(hint.dataset.minLength || 10);
        const isStrong = input.value.length >= minLength;
        hint.classList.toggle("is-strong", isStrong);
        hint.setAttribute("aria-label", isStrong ? "Senha forte" : "Senha ainda fraca");
      };
      updateStrength();
      input.addEventListener("input", updateStrength);
    });
  }

  function bindAuth() {
    const login = app.querySelector('[data-form="login"]');
    if (login) {
      login.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(login);
        const email = String(data.get("email") || "").trim();
        const senha = String(data.get("senha") || "");
        if (!email || !senha) return setFormError(login, "Preencha email e senha.");
        setFormError(login, "");
        const button = login.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = `${icon("login")} Entrando...`;
        try {
          const payload = await apiRequest("/login", {
            method: "POST",
            body: JSON.stringify({ email, senha }),
            token: "",
          });
          saveSessionPayload(payload);
          routeTo("/");
        } catch (error) {
          setFormError(login, getErrorMessage(error, "Erro ao entrar"));
          button.disabled = false;
          button.innerHTML = `${icon("login")} Entrar`;
        }
      });
    }

    const cadastro = app.querySelector('[data-form="cadastro"]');
    if (cadastro) {
      cadastro.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(cadastro);
        const senha = String(data.get("senha") || "");
        if (senha.length < 10) return setFormError(cadastro, "Senha deve ter ao menos 10 caracteres.");
        const nome = String(data.get("nome") || "").trim();
        const sobrenome = String(data.get("sobrenome") || "").trim();
        const email = String(data.get("email") || "").trim();
        const button = cadastro.querySelector('button[type="submit"]');
        setFormError(cadastro, "");
        button.disabled = true;
        button.innerHTML = `${icon("user")} Criando conta...`;
        try {
          const cadastroPayload = await apiRequest("/cadastro", {
            method: "POST",
            body: JSON.stringify({
              nome,
              sobrenome,
              data_nascimento: String(data.get("dataNascimento") || ""),
              genero: String(data.get("genero") || "Masculino"),
              email,
              senha,
              meta: String(data.get("meta") || "Nao definida").trim() || "Nao definida",
              altura: Number(data.get("altura")) || undefined,
              peso: Number(data.get("peso")) || undefined,
              ja_treinou: String(data.get("jaTreinou") || "Nunca treinou"),
            }),
            token: "",
          });

          if (cadastroPayload.access_token || cadastroPayload.token) {
            saveSessionPayload(cadastroPayload);
          } else {
            const payload = await apiRequest("/login", {
              method: "POST",
              body: JSON.stringify({ email, senha }),
              token: "",
            });
            saveSessionPayload(payload);
          }
          routeTo("/");
        } catch (error) {
          setFormError(cadastro, getErrorMessage(error, "Erro ao cadastrar"));
          button.disabled = false;
          button.innerHTML = `${icon("user")} Criar conta grátis`;
        }
      });
    }

    app.querySelectorAll('[data-action="demo-google"]').forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const { auth_url: authUrl } = await apiRequest("/auth/login", { method: "GET", token: "" });
          if (authUrl) window.location.href = authUrl;
        } catch (error) {
          alert(getErrorMessage(error, "Erro ao conectar com o Google"));
        }
      });
    });

    const forgot = app.querySelector('[data-form="forgot"]');
    if (forgot) {
      forgot.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(forgot);
        setFormError(forgot, "");
        try {
          await apiRequest("/esqueci-senha", {
            method: "POST",
            body: JSON.stringify({ email: String(data.get("email") || "").trim() }),
            token: "",
          });
          state.recoverySent = true;
          render();
        } catch (error) {
          setFormError(forgot, getErrorMessage(error, "Falha ao solicitar recuperação"));
        }
      });
    }

    const reset = app.querySelector('[data-form="reset"]');
    if (reset) {
      reset.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(reset);
        const senha = String(data.get("senha") || "");
        const confirmar = String(data.get("confirmar") || "");
        if (senha.length < 10) return setFormError(reset, "Senha deve ter ao menos 10 caracteres.");
        if (senha !== confirmar) return setFormError(reset, "As senhas não coincidem.");
        const tokenFromUrl = new URLSearchParams(location.search).get("token") || "";
        if (!tokenFromUrl) return setFormError(reset, "Token inválido ou ausente.");
        try {
          await apiRequest("/redefinir-senha", {
            method: "POST",
            body: JSON.stringify({ token: tokenFromUrl, nova_senha: senha }),
            token: "",
          });
          state.resetDone = true;
          render();
        } catch (error) {
          setFormError(reset, getErrorMessage(error, "Erro ao redefinir senha"));
        }
      });
    }
  }

  function bindPlans() {
    app.querySelectorAll("[data-plan-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.planTab = button.dataset.planTab;
        render();
      });
    });

    app.querySelectorAll('[data-action="open-plan-modal"]').forEach((button) => {
      button.addEventListener("click", () => {
        state.planModal = { mode: "new", item: null };
        render();
      });
    });

    app.querySelectorAll('[data-action="edit-plan"]').forEach((button) => {
      button.addEventListener("click", () => {
        const item = getPlans().find((plan) => String(plan.id) === button.dataset.id);
        if (!item) return;
        state.planModal = { mode: "edit", item };
        render();
      });
    });

    app.querySelectorAll('[data-action="delete-plan"]').forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir este item?")) return;
        try {
          await apiRequest(`/dieta-treino/${button.dataset.id}`, { method: "DELETE" });
          state.plans[state.planTab] = (state.plans[state.planTab] || []).filter(
            (plan) => String(plan.id) !== button.dataset.id,
          );
        } catch (error) {
          state.plans.error = getErrorMessage(error, "Erro ao excluir item");
        }
        render();
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
          await loadPlans(state.planTab, true);
          state.planModal = null;
        } catch (error) {
          state.plans.error = getErrorMessage(error, "Erro ao salvar item");
        } finally {
          button.disabled = false;
        }
        render();
      });
    }
  }

  function bindCalendar() {
    const actions = {
      "prev-month": () => {
        state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
        render();
      },
      "next-month": () => {
        state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
        render();
      },
      "connect-google": async () => {
        try {
          const { auth_url: authUrl } = await apiRequest("/calendar/google/connect", { method: "GET" });
          if (authUrl) window.location.href = authUrl;
        } catch (error) {
          state.googleError = getErrorMessage(error, "Erro ao conectar Google Calendar");
          state.googleMessage = "";
          render();
        }
      },
      "sync-google": async () => {
        try {
          const result = await apiRequest("/calendar/google/sync", {
            method: "POST",
            body: JSON.stringify({}),
          });
          state.googleMessage =
            result.total === 0
              ? "Nenhum item local para sincronizar."
              : `Sincronização concluída: ${result.created} criado(s), ${result.updated} atualizado(s).`;
          state.googleError = result.failed?.length ? `${result.failed.length} item(ns) falharam.` : "";
        } catch (error) {
          state.googleError = getErrorMessage(error, "Erro ao sincronizar Google Calendar");
          state.googleMessage = "";
        }
        render();
      },
      "disconnect-google": async () => {
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
        render();
      },
      "open-calendar-modal": () => {
        state.calendarModal = { mode: "new", item: null };
        state.calendarWeekdays = [jsDayToGoogleDay[new Date().getDay()]];
        render();
      },
    };

    Object.entries(actions).forEach(([name, handler]) => {
      app.querySelectorAll(`[data-action="${name}"]`).forEach((button) => button.addEventListener("click", handler));
    });

    app.querySelectorAll('[data-action="edit-calendar-item"]').forEach((button) => {
      button.addEventListener("click", () => {
        const item = getPlans().find((plan) => String(plan.id) === button.dataset.id);
        if (!item) return;
        state.calendarModal = { mode: "edit", item };
        state.calendarWeekdays = Array.isArray(item.recurrenceDays) ? item.recurrenceDays : [];
        render();
      });
    });

    app.querySelectorAll('[data-action="delete-calendar-item"]').forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir este item?")) return;
        try {
          await apiRequest(`/dieta-treino/${button.dataset.id}`, { method: "DELETE" });
          state.plans.treino = null;
          state.plans.dieta = null;
          await loadBothPlanTypes(true);
          state.googleMessage = "Item excluído do calendário.";
          state.googleError = "";
        } catch (error) {
          state.googleError = getErrorMessage(error, "Erro ao excluir item");
          state.googleMessage = "";
        }
        render();
      });
    });

    app.querySelectorAll("[data-calendar-type]").forEach((button) => {
      button.addEventListener("click", () => {
        const form = button.closest("form");
        form.querySelector('input[name="tipo"]').value = button.dataset.calendarType;
        form.querySelectorAll("[data-calendar-type]").forEach((node) => {
          node.classList.remove("active", "workout", "diet");
        });
        button.classList.add("active", button.dataset.calendarType === "treino" ? "workout" : "diet");
      });
    });

    app.querySelectorAll("[data-recurrence]").forEach((button) => {
      button.addEventListener("click", () => {
        const form = button.closest("form");
        const value = button.dataset.recurrence;
        form.querySelector('input[name="recurrenceType"]').value = value;
        form.querySelectorAll("[data-recurrence]").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        form.querySelector("[data-weekly-options]").classList.toggle("hidden", value !== "weekly");
      });
    });

    app.querySelectorAll("[data-weekday]").forEach((button) => {
      button.addEventListener("click", () => {
        button.classList.toggle("active");
        const active = app.querySelectorAll("[data-weekday].active");
        if (!active.length) button.classList.add("active");
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
        button.disabled = true;
        try {
          const result = await apiRequest(
            state.calendarModal.mode === "edit"
              ? `/dieta-treino/${state.calendarModal.item.id}`
              : "/dieta-treino",
            {
              method: state.calendarModal.mode === "edit" ? "PUT" : "POST",
              body: JSON.stringify({
                tipo: payload.tipo,
                title: payload.title,
                description: payload.description,
                date: payload.scheduleDate,
                time: payload.time || null,
                durationMinutes: payload.durationMinutes,
                recurrenceType: payload.recurrenceType,
                recurrenceDays: payload.recurrenceDays,
                recurrenceUntil: payload.recurrenceUntil || null,
              }),
            },
          );
          state.plans.treino = null;
          state.plans.dieta = null;
          await loadBothPlanTypes(true);
          state.googleMessage = result.googleCalendar?.synced
            ? state.calendarModal.mode === "edit"
              ? "Item atualizado e sincronizado com Google Calendar."
              : "Item criado e sincronizado com Google Calendar."
            : state.calendarModal.mode === "edit"
              ? "Item atualizado no calendário do NutriNow."
              : "Item criado no calendário do NutriNow.";
          state.googleError = result.googleCalendar?.error || "";
          state.calendarModal = null;
        } catch (error) {
          state.googleError = getErrorMessage(error, "Erro ao salvar item");
          state.googleMessage = "";
        } finally {
          button.disabled = false;
        }
        render();
      });
    }
  }

  function bindChat() {
    app.querySelectorAll('[data-action="open-chat-sidebar"]').forEach((button) => {
      button.addEventListener("click", () => {
        state.chatSidebarOpen = true;
        render();
      });
    });

    app.querySelectorAll('[data-action="close-chat-sidebar"]').forEach((button) => {
      button.addEventListener("click", () => {
        state.chatSidebarOpen = false;
        render();
      });
    });

    const search = app.querySelector("[data-chat-search]");
    if (search) {
      search.addEventListener("input", () => {
        state.chatSearch = search.value;
        render();
      });
    }

    app.querySelectorAll('[data-action="new-chat"]').forEach((button) => {
      button.addEventListener("click", () => {
        sessionStorage.setItem(STORAGE.currentSession, uid("session"));
        state.chatSidebarOpen = false;
        render();
      });
    });

    app.querySelectorAll('[data-action="open-session"]').forEach((button) => {
      button.addEventListener("click", () => {
        sessionStorage.setItem(STORAGE.currentSession, button.dataset.id);
        state.chatSidebarOpen = false;
        render();
      });
    });

    app.querySelectorAll('[data-action="delete-session"]').forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir conversa?")) return;
        try {
          await apiRequest(`/chat_sessions/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
        } catch (error) {
          state.chatSessions.error = getErrorMessage(error, "Erro ao excluir conversa");
        }
        const next = getChatSessions().filter((session) => session.id !== button.dataset.id);
        setChatSessions(next);
        delete state.chatHistory[button.dataset.id];
        if (sessionStorage.getItem(STORAGE.currentSession) === button.dataset.id) {
          sessionStorage.setItem(STORAGE.currentSession, next[0]?.id || uid("session"));
        }
        render();
      });
    });

    app.querySelectorAll("[data-suggestion]").forEach((button) => {
      button.addEventListener("click", () => sendChatMessage(button.dataset.suggestion));
    });

    const chatForm = app.querySelector('[data-form="chat"]');
    if (chatForm) {
      chatForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = chatForm.querySelector('input[name="message"]');
        sendChatMessage(input.value);
      });
    }

    const file = app.querySelector("[data-chat-file]");
    if (file) {
      file.addEventListener("change", () => {
        if (!file.files?.[0]) return;
        sendChatImage(file.files[0]);
        file.value = "";
      });
    }
  }

  function updateLocalChatSession(sessionId, message, titleSeed) {
    const sessions = getChatSessions();
    let session = sessions.find((item) => item.id === sessionId);
    const now = new Date().toISOString();

    if (!session) {
      session = {
        id: sessionId,
        title: titleFromMessage(titleSeed || message.text),
        preview: message.text,
        createdAt: now,
        updatedAt: now,
        messages: [message],
      };
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
    render();
    try {
      const response = await apiRequest("/chat", {
        method: "POST",
        sessionId,
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
      });
      const nextSessions = getChatSessions();
      const next = nextSessions.find((item) => item.id === sessionId);
      if (!next) return;
      const responseText = response.response || botResponse(trimmed);
      next.messages.push({ id: uid("msg"), text: responseText, isUser: false, timestamp: new Date().toISOString() });
      next.preview = responseText;
      next.updatedAt = new Date().toISOString();
      setChatSessions(nextSessions);
      state.chatHistory[sessionId] = next.messages;
    } catch (error) {
      const nextSessions = getChatSessions();
      const next = nextSessions.find((item) => item.id === sessionId);
      if (next) {
        next.messages.push({
          id: uid("msg"),
          text: getErrorMessage(error, "Erro ao enviar mensagem"),
          isUser: false,
          timestamp: new Date().toISOString(),
        });
        setChatSessions(nextSessions);
        state.chatHistory[sessionId] = next.messages;
      }
    } finally {
      state.chatTyping = false;
      render();
    }
  }

  async function sendChatImage(file) {
    if (!file || state.chatTyping) return;
    const sessionId = getCurrentSessionId();
    const label = `Imagem enviada: ${file.name}`;
    const userMessage = { id: uid("msg"), text: label, isUser: true, timestamp: new Date().toISOString() };
    updateLocalChatSession(sessionId, userMessage, label);
    state.chatTyping = true;
    render();

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("message_type", "human");
      form.append("session_id", sessionId);
      const response = await apiRequest("/analyze_image", {
        method: "POST",
        sessionId,
        body: form,
      });
      const sessions = getChatSessions();
      const session = sessions.find((item) => item.id === sessionId);
      if (session) {
        session.messages.push({
          id: uid("msg"),
          text: response.response || "Imagem analisada.",
          isUser: false,
          timestamp: new Date().toISOString(),
        });
        session.preview = response.response || "Imagem analisada.";
        session.updatedAt = new Date().toISOString();
        setChatSessions(sessions);
        state.chatHistory[sessionId] = session.messages;
      }
    } catch (error) {
      const sessions = getChatSessions();
      const session = sessions.find((item) => item.id === sessionId);
      if (session) {
        session.messages.push({
          id: uid("msg"),
          text: getErrorMessage(error, "Erro ao analisar imagem"),
          isUser: false,
          timestamp: new Date().toISOString(),
        });
        setChatSessions(sessions);
      }
    } finally {
      state.chatTyping = false;
      render();
    }
  }

  function titleFromMessage(text) {
    const generic = new Set(["oi", "olá", "ola", "ok", "sim", "não", "nao", "valeu"]);
    const normalized = normalizeText(text);
    if (generic.has(normalized) || normalized.length < 4) return "Nova conversa";
    return text.length > 42 ? `${text.slice(0, 42)}...` : text;
  }

  function bindProfile() {
    const file = app.querySelector("[data-avatar-input]");
    app.querySelectorAll('[data-action="pick-avatar"]').forEach((button) => {
      button.addEventListener("click", () => file?.click());
    });
    if (file) {
      file.addEventListener("change", () => {
        const selected = file.files?.[0];
        if (!selected) return;
        const reader = new FileReader();
        reader.onload = () => {
          const user = getUser();
          setUser({ ...user, avatar: reader.result });
          render();
        };
        reader.readAsDataURL(selected);
      });
    }

    app.querySelectorAll('[data-action="remove-avatar"]').forEach((button) => {
      button.addEventListener("click", () => {
        const user = getUser();
        setUser({ ...user, avatar: "" });
        render();
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
          meta: String(data.get("meta") || "Não definida").trim() || "Não definida",
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
              nome: nextUser.nome,
              sobrenome: nextUser.sobrenome,
              genero: nextUser.genero,
              email: nextUser.email,
              dataNascimento: nextUser.dataNascimento,
              meta: nextUser.meta,
              altura: nextUser.altura ? Number(nextUser.altura) : null,
              peso: nextUser.peso ? Number(nextUser.peso) : null,
              ja_treinou: nextUser.jaTreinou,
            }),
          });
          setUser(nextUser);
          state.profile.data = {
            ...(state.profile.data || {}),
            ...nextUser,
            ja_treinou: nextUser.jaTreinou,
          };
          state.dashboard.loaded = false;
          state.profileSaved = true;
        } catch (error) {
          state.profile.error = getErrorMessage(error, "Erro ao salvar perfil");
        } finally {
          button.disabled = false;
        }
        render();
        setTimeout(() => {
          state.profileSaved = false;
          if (normalizePath(getCurrentPath()) === "/perfil") render();
        }, 1800);
      });
    }
  }

  function bindFeedback() {
    app.querySelectorAll("[data-rating]").forEach((button) => {
      button.addEventListener("click", () => {
        state.feedbackRating = Number(button.dataset.rating);
        render();
      });
    });

    app.querySelectorAll('[data-action="new-feedback"]').forEach((button) => {
      button.addEventListener("click", () => {
        state.feedbackSubmitted = false;
        state.feedbackRating = 0;
        render();
      });
    });

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
          await apiRequest("/feedbacks", {
            method: "POST",
            body: JSON.stringify({
              rating: state.feedbackRating,
              name: String(data.get("name") || "").trim() || getUser()?.nome || "",
              message,
            }),
          });
          state.feedbackSubmitted = true;
          render();
        } catch (error) {
          setFormError(form, getErrorMessage(error, "Não foi possível enviar o feedback"));
          button.disabled = false;
        }
      });
    }
  }

  function bindModalClose() {
    app.querySelectorAll('[data-action="close-modal"]').forEach((button) => {
      button.addEventListener("click", (event) => {
        if (event.target.closest("[data-modal-card]") && !event.target.closest('[data-action="close-modal"]')) return;
        state.planModal = null;
        state.calendarModal = null;
        render();
      });
    });

    app.querySelectorAll("[data-modal-card]").forEach((card) => {
      card.addEventListener("click", (event) => event.stopPropagation());
    });
  }

  window.addEventListener("popstate", render);
  window.addEventListener("hashchange", render);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (state.planModal || state.calendarModal || state.chatSidebarOpen)) {
      state.planModal = null;
      state.calendarModal = null;
      state.chatSidebarOpen = false;
      render();
    }
  });

  function bootstrapPersistentSession() {
    if (getToken() || !getRefreshCsrfToken()) return;
    refreshSession()
      .then(() => render())
      .catch(() => {
        setToken("");
        setUser(null);
      });
  }

  migratePersistentSession();
  render();
  bootstrapPersistentSession();
})();
