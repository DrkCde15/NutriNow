import { isLoopbackHost, isLoopbackUrl, isLikelyJwt, readJson, writeJson, getCookie, httpErrorMessage, isHtmlDocument } from "./utils.js";

export const STORAGE = {
  token: "nutrinow_access_token",
  user: "nutrinow_user",
  apiBase: "nutrinow_api_base",
  sessions: "nutrinow_chat_sessions_cache",
  currentSession: "nutrinow_static_current_session",
};

let refreshSessionPromise = null;

export function getApiBase() {
  const isLocalhost = isLoopbackHost(location.hostname);
  const storedApiBase = localStorage.getItem(STORAGE.apiBase) || "";
  if (storedApiBase) {
    const normalized = storedApiBase.replace(/\/+$/, "");
    if (!isLocalhost && isLoopbackUrl(normalized)) {
      localStorage.removeItem(STORAGE.apiBase);
    } else {
      return normalized;
    }
  }
  const configured = window.NUTRINOW_API_BASE || "";
  if (configured) return configured.replace(/\/+$/, "");
  if (!location.protocol.startsWith("http")) return "http://127.0.0.1:8000";
  if (isLocalhost && location.port && location.port !== "8000") return "http://127.0.0.1:8000";
  return location.origin;
}

export function getToken() {
  const token = localStorage.getItem(STORAGE.token) || "";
  if (token && !isLikelyJwt(token)) {
    localStorage.removeItem(STORAGE.token);
    sessionStorage.removeItem(STORAGE.token);
    return "";
  }
  return token;
}

export function setToken(token) {
  if (token) localStorage.setItem(STORAGE.token, token);
  else localStorage.removeItem(STORAGE.token);
  sessionStorage.removeItem(STORAGE.token);
}

export function getUser() {
  const user = readJson(STORAGE.user, null, localStorage);
  return getToken() ? user : null;
}

export function setUser(user) {
  if (user) writeJson(STORAGE.user, user, localStorage);
  else localStorage.removeItem(STORAGE.user);
  sessionStorage.removeItem(STORAGE.user);
}

export function clearLocalSession() {
  setToken("");
  setUser(null);
}

export function getRefreshCsrfToken() {
  const token = getCookie("csrf_refresh_token");
  return token ? decodeURIComponent(token) : "";
}

function buildApiError(response, data) {
  const message = typeof data === "object" && data ? data.error || data.message : data;
  const safeMessage = typeof message === "string" && isHtmlDocument(message) ? "" : message;
  const error = new Error(safeMessage || httpErrorMessage(response.status));
  error.status = response.status;
  error.payload = data;
  return error;
}

export async function refreshSession() {
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

async function parseApiResponse(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

function isJwtAuthError(response, data) {
  return response.status === 422 && typeof data === "object" && data && typeof data.msg === "string";
}

function isAuthFailureResponse(response, data) {
  return response.status === 401 || isJwtAuthError(response, data);
}

function shouldRefreshAuth(path, response, data, options) {
  if (options.skipAuthRefresh || !isAuthFailureResponse(response, data)) return false;
  if (["/refresh", "/login", "/cadastro", "/auth/exchange-code"].includes(path)) return false;
  return Boolean(getRefreshCsrfToken());
}

async function performApiRequest(path, options = {}, tokenOverride) {
  const { headers: optionHeaders, sessionId, skipAuthRefresh, token: optionToken, ...fetchOptions } = options;
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

export async function apiRequest(path, options = {}) {
  const result = await performApiRequest(path, options);
  if (!result.response.ok && shouldRefreshAuth(path, result.response, result.data, options)) {
    try {
      await refreshSession();
      const retry = await performApiRequest(path, options, getToken());
      if (retry.response.ok) return retry.data;
      throw buildApiError(retry.response, retry.data);
    } catch (error) {
      clearLocalSession();
      throw error;
    }
  }
  if (!result.response.ok) {
    const error = buildApiError(result.response, result.data);
    if (isAuthFailureResponse(result.response, result.data)) {
      clearLocalSession();
    }
    throw error;
  }
  return result.data;
}

function saveSessionPayload(payload) {
  setToken(payload.access_token || payload.token || "");
  if (payload.user) setUser(payload.user);
}

export async function logoutFromBackend() {
  try {
    await apiRequest("/logout", { method: "POST" });
  } catch {
    // A sessao local ainda deve ser encerrada se o backend estiver indisponivel.
  }
  clearLocalSession();
}

export function defaultAuthenticatedRoute(user) {
  const role = user?.role;
  if (role === "nutritionist" || role === "personal_trainer") return "/pacientes";
  return "/";
}

export function getPaymentUrl() {
  return String(window.NUTRINOW_CHECKOUT_URL || window.NUTRINOW_PAYMENT_URL || "").trim();
}

export function migratePersistentSession() {
  try {
    const LEGACY_SESSION_AUTH_KEYS = [STORAGE.token, STORAGE.user];
    LEGACY_SESSION_AUTH_KEYS.forEach((key) => {
      const value = sessionStorage.getItem(key);
      if (value) localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    });
  } catch {
    // Ignora navegadores que bloqueiam acesso ao storage.
  }
}
