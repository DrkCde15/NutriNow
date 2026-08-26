const STORAGE = {
  token: 'nutrinow_access_token',
  user: 'nutrinow_user',
  apiBase: 'nutrinow_api_base',
  refreshToken: 'nutrinow_refresh_token',
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

export interface CalendarioEvento {
  id: number;
  title: string;
  description?: string;
  categoria: string;
  event_date: string;
  time?: string;
  duration_minutes?: number;
  created_at: string;
}

export interface CalendarioEventosResponse {
  success: boolean;
  count: number;
  eventos: CalendarioEvento[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
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

export interface Notificacao {
  id: number;
  dieta_treino_id: number | null;
  tipo: 'treino' | 'dieta';
  titulo: string;
  mensagem: string;
  agendado_para: string;
  enviado_email: number;
  lida: number;
  recorrente: number;
  enviado_em: string | null;
  criado_em: string;
}

export interface NotificacoesResponse {
  notificacoes: Notificacao[];
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
  if (isLocalhost && location.port !== '8000') return '/api';
  return location.origin;
}

function getToken(): string {
  return localStorage.getItem(STORAGE.token) || '';
}

function setToken(token: string) {
  if (token) localStorage.setItem(STORAGE.token, token);
  else localStorage.removeItem(STORAGE.token);
}

function getRefreshToken(): string {
  return localStorage.getItem(STORAGE.refreshToken) || '';
}

function setRefreshToken(refreshToken: string) {
  if (refreshToken) localStorage.setItem(STORAGE.refreshToken, refreshToken);
  else localStorage.removeItem(STORAGE.refreshToken);
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

// Decode the `exp` claim of a JWT without verifying the signature. Returns
// the expiry as a unix timestamp (seconds) or null if it can't be read.
function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

// True when the token is missing an expiry we can read, already expired, or
// expires within `marginSec`. Used to refresh proactively and skip a 401.
function tokenExpiringSoon(token: string, marginSec = 60): boolean {
  const exp = decodeJwtExp(token);
  if (exp === null) return false;
  return exp - Math.floor(Date.now() / 1000) <= marginSec;
}

export function clearLocalSession() {
  setToken('');
  setUser(null);
  setRefreshToken('');
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
    const refreshToken = getRefreshToken();
    if (refreshToken) headers['Authorization'] = `Bearer ${refreshToken}`;
    const res = await fetchWithTimeout(`${getApiBase()}/refresh`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new ApiError('Falha ao renovar sessão', res.status);
    const data = await res.json();
    setToken(data.access_token || data.token || '');
    if (data.refresh_token) setRefreshToken(data.refresh_token);
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
  let token = tokenOverride !== undefined ? (tokenOverride || '') : getToken();
  const isFormData = body instanceof FormData;

  // Proactive refresh: renew the access token BEFORE sending the request so we
  // never fire an unauthenticated call that 401s first. Triggers when we have
  // no usable token (e.g. it was dropped from storage but the httpOnly refresh
  // cookie survived a reload) OR when the current token is near/at expiry.
  // Gated on the refresh CSRF cookie (same prerequisite as the on-401 fallback);
  // refreshSession() deduplicates concurrent refreshes.
  const tokenMissingOrExpiring = !token || tokenExpiringSoon(token);
  if (tokenOverride === undefined && (getRefreshCsrfToken() || getRefreshToken()) && tokenMissingOrExpiring) {
    try {
      await refreshSession();
      token = getToken();
    } catch {
      // Refresh failed; the request may still 401 and trigger the fallback.
    }
  }

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
      (getRefreshCsrfToken() || getRefreshToken()) &&
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

    if (res.status === 401) {
      clearLocalSession();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('nutrinow:unauthorized'));
    }

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

export async function getNotificacoes(): Promise<Notificacao[]> {
  const data = await apiRequest<NotificacoesResponse>('/notificacoes');
  return Array.isArray(data?.notificacoes) ? data.notificacoes : [];
}

export async function marcarNotificacaoLida(id: number): Promise<void> {
  await apiRequest(`/notificacoes/${id}/lida`, { method: 'POST' });
}

export async function getEventosCalendario(desde?: string, ate?: string): Promise<CalendarioEvento[]> {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (ate) params.set('ate', ate);
  const qs = params.toString();
  const data = await apiRequest<CalendarioEventosResponse>(`/calendario/eventos${qs ? `?${qs}` : ''}`);
  return Array.isArray(data?.eventos) ? data.eventos : [];
}

export interface CalendarioEventoPayload {
  title: string;
  description?: string;
  categoria?: string;
  event_date: string;
  time?: string;
  duration_minutes?: number;
}

export async function criarEventoCalendario(payload: CalendarioEventoPayload): Promise<CalendarioEvento> {
  const data = await apiRequest<{ success: boolean; evento: CalendarioEvento }>('/calendario/eventos', {
    method: 'POST',
    body: payload,
  });
  return data.evento;
}

export async function atualizarEventoCalendario(id: number, payload: CalendarioEventoPayload): Promise<CalendarioEvento> {
  const data = await apiRequest<{ success: boolean; evento: CalendarioEvento }>(`/calendario/eventos/${id}`, {
    method: 'PUT',
    body: payload,
  });
  return data.evento;
}

export async function excluirEventoCalendario(id: number): Promise<void> {
  await apiRequest(`/calendario/eventos/${id}`, { method: 'DELETE' });
}

export interface ConviteInfo {
  id: number;
  nome: string;
  email: string;
  tipo: 'nutricionista' | 'personal_trainer';
  foto: string | null;
}

export interface ValidarConviteResponse {
  success: boolean;
  valid: boolean;
  professional: ConviteInfo;
}

export async function criarConvite(): Promise<{ token: string; expiraEm: string }> {
  const data = await apiRequest<{ success: boolean; token: string; expiraEm: string }>('/invites', {
    method: 'POST',
  });
  return { token: data.token, expiraEm: data.expiraEm };
}

export async function validarConvite(token: string): Promise<ConviteInfo | null> {
  try {
    const data = await apiRequest<ValidarConviteResponse>(`/invites/validate?token=${encodeURIComponent(token)}`);
    return data.professional || null;
  } catch {
    return null;
  }
}

export { getApiBase, getToken, setToken, getRefreshToken, setRefreshToken, getUser, setUser };
