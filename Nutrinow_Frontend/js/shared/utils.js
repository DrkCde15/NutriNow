export const WEEKDAY_ORDER = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
export const weekDayOptions = [
  { code: "MO", label: "Seg" },
  { code: "TU", label: "Ter" },
  { code: "WE", label: "Qua" },
  { code: "TH", label: "Qui" },
  { code: "FR", label: "Sex" },
  { code: "SA", label: "Sáb" },
  { code: "SU", label: "Dom" },
];
export const jsDayToGoogleDay = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export const BMI_CATEGORIES = [
  { min: 0, max: 18.49, label: "Abaixo do peso", range: "< 18.5", color: "#60a5fa" },
  { min: 18.5, max: 24.9, label: "Peso normal", range: "18.5 - 24.9", color: "#22c55e" },
  { min: 25, max: 29.9, label: "Sobrepeso", range: "25 - 29.9", color: "#facc15" },
  { min: 30, max: 34.9, label: "Obesidade I", range: "30 - 34.9", color: "#fb923c" },
  { min: 35, max: Infinity, label: "Obesidade II+", range: "> 35", color: "#ef4444" },
];

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function uid(prefix = "id") {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readJson(key, fallback, storage = sessionStorage) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value, storage = sessionStorage) {
  storage.setItem(key, JSON.stringify(value));
}

export function isLoopbackHost(hostname) {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
}

export function isLoopbackUrl(value) {
  try {
    return isLoopbackHost(new URL(value, location.origin).hostname);
  } catch {
    return false;
  }
}

export function getErrorMessage(error, fallback = "Erro ao comunicar com o backend") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getCookie(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || "";
}

export function getFirstName(user) {
  return (user?.nome || "Perfil").split(" ")[0] || "Perfil";
}

export function getInitials(name) {
  return String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function todayInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function timeInput(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseDateOnly(value) {
  if (!value) return new Date();
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (year && month && day) return new Date(year, month - 1, day);
  return new Date(value);
}

export function isHtmlDocument(value) {
  const text = String(value || "").trim().toLowerCase();
  return text.startsWith("<!doctype html") || text.startsWith("<html") || text.includes("<title>");
}

export function httpErrorMessage(status) {
  if (status >= 500) return "Erro interno no servidor. Tente novamente em instantes.";
  if (status === 404) return "Recurso não encontrado.";
  return `Erro HTTP ${status}`;
}

export function normalizePath(raw) {
  const path = raw.split("?")[0].replace(/\/+$/, "") || "/";
  const valid = new Set([
    "/", "/login", "/cadastro", "/esqueci-senha", "/reset-senha",
    "/pagamento-aprovado", "/pagamento-sucesso",
    "/dashboard", "/planos", "/calendario", "/chat", "/perfil",
    "/feedbacks", "/termos", "/privacidade", "/lgpd",
    "/pacientes", "/anotacoes", "/paciente-detalhe",
  ]);
  return valid.has(path) ? path : "/";
}

export function getCurrentPath() {
  if (location.protocol === "file:") {
    return location.hash.startsWith("#/") ? location.hash.slice(1) : "/";
  }
  let path = location.pathname || "/";
  if (path.endsWith("/index.html")) path = "/";
  return path || "/";
}

export function routeHref(path) {
  return location.protocol.startsWith("http") ? path : `#${path}`;
}

export function roleLabel(role) {
  if (role === "nutritionist") return "Nutricionista";
  if (role === "personal_trainer") return "Personal Trainer";
  return "Usuario comum";
}

export function professionalSpecialtyLabel(role) {
  return role === "nutritionist" ? "Dietas, refeições e macros" : "Treinos, séries e grupos musculares";
}

export function isProfessionalUser(user) {
  return user?.role === "nutritionist" || user?.role === "personal_trainer";
}

export function isPremiumUser(user) {
  return Boolean(user?.is_premium || user?.premium || user?.plan === "premium");
}

export function premiumLabel(user) {
  return isPremiumUser(user) ? "Premium" : "Free";
}

export function isLikelyJwt(token) {
  const parts = String(token || "").split(".");
  return parts.length === 3 && parts.every(Boolean);
}

export function isPremiumRoute(path, PREMIUM_ROUTES) {
  return PREMIUM_ROUTES.has(normalizePath(path));
}

let _renderFn = null;

export function setRenderFn(fn) {
  _renderFn = fn;
}

export function navigate(path) {
  const normalized = normalizePath(path);
  if (normalized === normalizePath(getCurrentPath())) return;
  history.pushState({}, "", normalized);
  if (_renderFn) _renderFn();
}
