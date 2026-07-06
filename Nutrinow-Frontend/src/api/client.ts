const STORAGE = {
  token: 'nutrinow_access_token',
  user: 'nutrinow_user',
  apiBase: 'nutrinow_api_base',
} as const;

// ---------------------------------------------------------------------------
// Tipos espelhando os schemas do backend
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  nome: string;
  sobrenome?: string;
  email: string;
  altura?: number;
  peso?: number;
  is_premium?: boolean;
  premium?: boolean;
  plan?: string;
  premium_expires_at?: string;
  role?: string;
  meta?: string;
  genero?: string;
  dataNascimento?: string;
  ja_treinou?: string;
  avatar?: string;
}

export interface DietaTreinoItem {
  id: number;
  title: string;
  description?: string;
  time?: string;
  tipo: string;
  created_at: string;
  duration_minutes?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  session_id?: string;
  conversation_id?: string;
}

export interface CheckoutResponse {
  checkout_url: string;
  alreadyPremium: boolean;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | false;
  sessionId?: string;
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Erros customizados
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Sem conexão com o servidor') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'O servidor demorou para responder') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ---------------------------------------------------------------------------
// Helpers de storage
// ---------------------------------------------------------------------------

function getApiBase(): string {
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const stored = localStorage.getItem(STORAGE.apiBase);
  if (stored) {
    const normalized = stored.replace(/\/+$/, '');
    if (!isLocalhost && (normalized.includes('localhost') || normalized.includes('127.0.0.1'))) {
      localStorage.removeItem(STORAGE.apiBase);
    } else {
      return normalized;
    }
  }
  if (isLocalhost && location.port !== '8000') return 'http://127.0.0.1:8000';
  return location.origin;
}

function getToken(): string {
  return localStorage.getItem(STORAGE.token) || '';
}

function setToken(token: string) {
  if (token) localStorage.setItem(STORAGE.token, token);
  else localStorage.removeItem(STORAGE.token);
}

function getUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setUser(user: User | null) {
  if (user) localStorage.setItem(STORAGE.user, JSON.stringify(user));
  else localStorage.removeItem(STORAGE.user);
}

function getRefreshCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_refresh_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function clearLocalSession() {
  setToken('');
  setUser(null);
}

// ---------------------------------------------------------------------------
// Refresh de sessão com deduplicação
// ---------------------------------------------------------------------------

let refreshPromise: Promise<unknown> | null = null;

async function refreshSession(): Promise<unknown> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const csrf = getRefreshCsrfToken();
    if (csrf) headers['X-CSRF-TOKEN'] = csrf;
    const res = await fetchWithTimeout(`${getApiBase()}/refresh`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new ApiError('Falha ao renovar sessão', res.status);
    const data = await res.json();
    setToken(data.access_token || data.token || '');
    if (data.user) setUser(data.user);
    return data;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

// ---------------------------------------------------------------------------
// Fetch wrapper com timeout
// ---------------------------------------------------------------------------

async function fetchWithTimeout(input: RequestInfo, init: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = 15000, ...rest } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(input, { ...rest, signal: controller.signal });
    return response;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TimeoutError();
    }
    if (err instanceof TypeError && (err.message?.includes('fetch') || err.message?.includes('network'))) {
      throw new NetworkError();
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

async function parseResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  const text = await res.text();
  return text;
}

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    return String(obj.error || obj.message || obj.detail || '');
  }
  return String(data || '');
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    token: tokenOverride,
    sessionId,
    skipAuthRefresh,
    signal,
    timeout,
  } = options;

  const headers: Record<string, string> = { ...extraHeaders };
  const token = tokenOverride !== undefined ? (tokenOverride || '') : getToken();
  const isFormData = body instanceof FormData;

  if (!isFormData && body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (sessionId && !headers['X-Session-ID']) {
    headers['X-Session-ID'] = sessionId;
  }

  const res = await fetchWithTimeout(`${getApiBase()}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal,
    timeout,
  });

  const data = res.status === 204 ? null : await parseResponse(res);

  if (!res.ok) {
    const shouldRefresh =
      !skipAuthRefresh &&
      res.status === 401 &&
      getRefreshCsrfToken() &&
      !['/refresh', '/login', '/cadastro', '/auth/exchange-code'].includes(path);

    if (shouldRefresh) {
      try {
        await refreshSession();
        return apiRequest<T>(path, { ...options, skipAuthRefresh: true, token: getToken() });
      } catch {
        clearLocalSession();
        throw new ApiError('Sessão expirada', 401);
      }
    }

    if (res.status === 401) clearLocalSession();

    const message = extractErrorMessage(data) || `Erro ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Auth helpers públicos
// ---------------------------------------------------------------------------

export async function logoutFromBackend() {
  try {
    await apiRequest('/logout', { method: 'POST', timeout: 5000 });
  } catch { /* fire-and-forget */ }
  clearLocalSession();
}

export function defaultAuthenticatedRoute(user: User | null): string {
  const role = user?.role;
  if (role === 'nutritionist' || role === 'personal_trainer') return '/pacientes';
  return '/';
}

export { getApiBase, getToken, setToken, getUser, setUser };
