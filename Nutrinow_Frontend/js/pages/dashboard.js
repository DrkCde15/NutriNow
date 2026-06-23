import { pageShell, footerMarkup, ASSETS, bindGlobalEvents, premiumModalMarkup } from '../shared/ui.js';
import { getUser, getToken, apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getFirstName, getErrorMessage, BMI_CATEGORIES, todayInput, parseDateOnly, addDays, isPremiumUser } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());
  const user = getUser();
  if (!user) {
    import('./login.js').then((m) => m.renderPage());
    return;
  }
  const isPremium = isPremiumUser(user);

  const dashboard = window.__dashboardState?.data || {};
  const loading = window.__dashboardState?.loading || false;
  const error = window.__dashboardState?.error || "";

  const profile = {
    name: dashboard?.profile?.name || user.nome || "Usu\u00e1rio NutriNow",
    height: Number(dashboard?.profile?.height || user.altura) || 1.72,
    weight: Number(dashboard?.profile?.weight || user.peso) || 68,
    goal: dashboard?.profile?.goal || user.meta || "N\u00e3o definida",
  };
  const bmi = profile.weight / (profile.height * profile.height);
  const insights = dashboard?.conversationInsights?.length ? dashboard.conversationInsights : [
    { date: "Hoje", activity: "Boa evolu\u00e7\u00e3o: voc\u00ea manteve prote\u00edna alta e treino planejado.", status: "positive" },
    { date: "Ontem", activity: "Hidrata\u00e7\u00e3o abaixo da meta. Tente distribuir copos de \u00e1gua ao longo do dia.", status: "alert" },
    { date: "Semana", activity: "A rotina est\u00e1 consistente, com tr\u00eas registros de treino.", status: "neutral" },
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
    { date: "S\u00e1b", weight: profile.weight - 0.1, activity: 3 },
    { date: "Dom", weight: profile.weight - 0.4, activity: 4 },
  ];

  app.innerHTML = pageShell(`
    <main class="page-main">
      <div class="container-wide">
        <section class="dashboard-hero">
          <div class="dashboard-hero-inner">
            <div>
              <span class="badge">${icon("sparkles")} Vis\u00e3o geral</span>
              <h1 style="margin-top:1rem;font-size:clamp(2rem,5vw,3rem);">Dashboard de ${escapeHtml(profile.name)}</h1>
              <p class="text-muted" style="margin-top:.5rem;">Meta atual: <strong style="color:var(--foreground);">${escapeHtml(profile.goal)}</strong></p>
              ${loading ? `<p class="text-muted" style="margin-top:.5rem;">Atualizando dados...</p>` : ""}
              ${error ? `<div class="alert" style="margin-top:1rem;">${icon("alert")} ${escapeHtml(error)}</div>` : ""}
            </div>
            <div class="insight-card">
              <div class="insight-row">
                <span class="feature-icon" style="width:2.75rem;height:2.75rem;margin:0;">${icon("target", "icon-lg")}</span>
                <div>
                  <p class="text-primary" style="font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">\u00daltimo insight</p>
                  <p style="margin-top:.25rem;line-height:1.55;">${escapeHtml(insights[0].activity)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div class="metric-grid">
          ${metricCard("Peso", `${profile.weight.toFixed(1)} kg`, "Peso atual registrado", "scale")}
          ${metricCard("Altura", `${profile.height.toFixed(2)} m`, "Altura salva no perfil", "trend")}
          ${metricCard("IMC", bmi.toFixed(1), "\u00cdndice de massa corporal", "activity")}
        </div>
        <div class="dashboard-grid">
          <div>
            <section class="chart-panel">
              <div class="chart-head">
                <div>
                  <h2>Evolu\u00e7\u00e3o recente</h2>
                  <p class="text-muted" style="margin-top:.5rem;">Acompanhamento visual do peso e do n\u00edvel de atividade ao longo dos \u00faltimos dias.</p>
                </div>
                <span class="badge">${icon("dumbbell")} Foco em const\u00e2ncia</span>
              </div>
              <div class="chart-box">${chartMarkup(chartData)}</div>
            </section>
          </div>
          <aside class="timeline-panel">
            <span class="badge">${icon("sparkles")} Timeline</span>
            <h2 style="margin-top:1rem;">Insights da conversa</h2>
            <p class="text-muted" style="margin-top:.5rem;line-height:1.6;">Resumo autom\u00e1tico do que o sistema identificou nas conversas e na rotina recente.</p>
            <ul class="timeline-list">
              ${insights.map((item) => `
                <li class="timeline-item">
                  <div class="timeline-item-top">
                    <span class="text-muted" style="font-size:.75rem;font-weight:800;text-transform:uppercase;">${escapeHtml(item.date)}</span>
                    <span class="status-pill status-${item.status}">${item.status}</span>
                  </div>
                  <p style="margin-top:.8rem;line-height:1.6;">${escapeHtml(item.activity)}</p>
                </li>
              `).join("")}
            </ul>
          </aside>
        </div>
        ${bmiMarkup("dashboard-bmi", profile.weight, profile.height, "dashboard-bmi-block")}
      </div>
    </main>
    ${footerMarkup()}
    ${!isPremium ? premiumModalMarkup(path) : ""}
  `, path);

  bindGlobalEvents(app);
  bindBmiSliders(app);
  loadDashboardData(app);
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
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gr\u00e1fico de evolu\u00e7\u00e3o">
      ${[0, 1, 2, 3].map((n) => `<line x1="${pad}" x2="${width - pad}" y1="${pad + n * 64}" y2="${pad + n * 64}" stroke="var(--border)" stroke-dasharray="4 5"/>`).join("")}
      <polyline points="${lineWeight}" fill="none" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="${lineActivity}" fill="none" stroke="var(--accent-foreground)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
      ${data.map((item, index) => `
        <circle cx="${x(index)}" cy="${yWeight(item.weight)}" r="5" fill="var(--primary)"/>
        <circle cx="${x(index)}" cy="${yActivity(item.activity)}" r="4" fill="var(--accent-foreground)"/>
        <text x="${x(index)}" y="${height - 14}" text-anchor="middle" font-size="13" fill="var(--muted-foreground)">${item.date}</text>
      `).join("")}
      <text x="${pad}" y="22" font-size="13" fill="var(--primary)" font-weight="700">Peso</text>
      <text x="${width - pad}" y="22" text-anchor="end" font-size="13" fill="var(--accent-foreground)" font-weight="700">Atividade</text>
    </svg>
  `;
}

function bmiMarkup(id, weight, height, className = "") {
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
              <p>Arraste os controles de peso e altura para calcular o IMC e observar o corpo estilizado mudar de forma e cor.</p>
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
                ${BMI_CATEGORIES.map((item, index) => `
                  <div class="bmi-category ${index === activeIndex ? "active" : ""}" data-bmi-category="${index}" style="${index === activeIndex ? `background:${item.color}20;color:${item.color};` : ""}">
                    <strong>${item.range}</strong>
                    <span>${item.label}</span>
                  </div>
                `).join("")}
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

function getBmiCategory(bmi) {
  return BMI_CATEGORIES.find((item) => bmi >= item.min && bmi <= item.max) || BMI_CATEGORIES[1];
}

function bindBmiSliders(app) {
  app.querySelectorAll("[data-bmi]").forEach((root) => {
    const weightInput = root.querySelector('[data-bmi-input="weight"]');
    const heightInput = root.querySelector('[data-bmi-input="height"]');
    const handler = () => updateBmi(root);
    if (weightInput) { weightInput.addEventListener("input", handler); updateRangeProgress(weightInput); }
    if (heightInput) { heightInput.addEventListener("input", handler); updateRangeProgress(heightInput); }
  });
}

function updateBmi(root) {
  const weightInput = root.querySelector('[data-bmi-input="weight"]');
  const heightInput = root.querySelector('[data-bmi-input="height"]');
  const weight = Number(weightInput.value);
  const height = Number(heightInput.value);
  const bmi = weight / (height * height);
  const category = getBmiCategory(bmi);
  const index = Math.max(0, BMI_CATEGORIES.findIndex((item) => item.label === category.label));

  const els = {
    weightDisplay: root.querySelector('[data-bmi-display="weight"]'),
    heightDisplay: root.querySelector('[data-bmi-display="height"]'),
    bmiNumber: root.querySelector("[data-bmi-number]"),
    bmiPill: root.querySelector("[data-bmi-pill]"),
    bmiCard: root.querySelector(".bmi-card"),
    bmiAvatar: root.querySelector(".bmi-avatar"),
    bmiShape: root.querySelector("[data-bmi-shape]"),
    categories: root.querySelectorAll("[data-bmi-category]"),
  };

  if (els.weightDisplay) els.weightDisplay.textContent = `${Math.round(weight)} kg`;
  if (els.heightDisplay) els.heightDisplay.textContent = `${height.toFixed(2)} m`;
  if (els.bmiNumber) els.bmiNumber.textContent = bmi.toFixed(1);
  if (els.bmiPill) { els.bmiPill.textContent = category.label; els.bmiPill.style.setProperty("--bmi-color", category.color); }
  if (els.bmiCard) els.bmiCard.style.setProperty("--bmi-glow", `${category.color}26`);
  if (els.bmiAvatar) els.bmiAvatar.style.setProperty("--avatar-color", category.color);
  if (els.bmiShape) els.bmiShape.src = ASSETS.bmiShapes[index];
  updateRangeProgress(weightInput);
  updateRangeProgress(heightInput);
  els.categories.forEach((node) => {
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

async function loadDashboardData(app) {
  const token = getToken();
  if (!token) return;

  if (!window.__dashboardState) {
    window.__dashboardState = { loaded: false, loading: false, data: null, error: "" };
  }

  if (window.__dashboardState.loaded || window.__dashboardState.loading) return;
  window.__dashboardState.loading = true;

  try {
    const data = await apiRequest("/dashboard");
    window.__dashboardState.data = data;
    window.__dashboardState.loaded = true;
    window.__dashboardState.loading = false;
  } catch (error) {
    window.__dashboardState.error = getErrorMessage(error, "Erro ao carregar dashboard");
    window.__dashboardState.loading = false;
  }

  renderPage();
}
