import { pageShell, footerMarkup, ASSETS, bindGlobalEvents } from '../shared/ui.js';
import { getUser } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getFirstName } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());
  const user = getUser();
  const userWeight = Number(user?.peso) > 0 ? Number(user.peso) : 68;
  const userHeight = Number(user?.altura) > 0 ? Number(user.altura) : 1.72;

  app.innerHTML = pageShell(`
    <main>
      <section class="hero" id="top">
        <div class="hero-grid container">
          <div class="hero-copy animate-fade-up">
            <span class="badge">${icon("sparkles")} Powered by NutriAI</span>
            <h1>Sua rotina saud\u00e1vel, <span class="text-gradient">guiada por IA.</span></h1>
            <p>Planos de dieta e treino personalizados, an\u00e1lise de refei\u00e7\u00f5es pela foto e um assistente que conversa com voc\u00ea 24/7. Tudo em um s\u00f3 lugar.</p>
            <div class="hero-actions">
              <a href="/cadastro" data-link class="btn btn-primary">Criar conta gr\u00e1tis ${icon("arrowRight")}</a>
              <a href="#features" class="btn btn-secondary">Ver como funciona</a>
            </div>
            <div class="hero-checks">
              <span>${icon("check")} Sem cart\u00e3o</span>
              <span>${icon("check")} Cancela quando quiser</span>
            </div>
          </div>
          <div class="hero-media animate-fade-up delay-200">
            <div class="hero-glow" aria-hidden="true"></div>
            <div class="hero-image" style="aspect-ratio:1 / 1;max-height:30rem;">
              <img src="${ASSETS.hero}" alt="Smoothie verde com frutas, abacate e halteres - nutri\u00e7\u00e3o e treino" width="1280" height="960" decoding="async" fetchpriority="high">
            </div>
            <div class="floating-card">
              <span class="floating-icon">${icon("activity", "icon-lg")}</span>
              <div>
                <p class="text-muted" style="font-size:.78rem;">Hoje</p>
                <strong>1.840 kcal &bull; 132g prote\u00edna</strong>
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
      ${ctaMarkup()}
    </main>
    ${footerMarkup()}
  `, path);

  bindGlobalEvents(app);
  bindBmiSliders(app);
}

function bmiMarkup(id, weight, height, className = "") {
  const bmi = weight / (height * height);
  const categories = getBmiCategories();
  const category = getBmiCategory(bmi, categories);
  const activeIndex = Math.max(0, categories.findIndex((item) => item.label === category.label));
  return `
    <section class="bmi-section ${className}" data-bmi="${id}">
      <div class="container">
        <div class="bmi-card" style="--bmi-glow:${category.color}26;">
          <div class="bmi-grid">
            <div class="bmi-copy">
              <span class="badge">${icon("activity")} Simulador de IMC</span>
              <h2>Veja o avatar reagir ao seu IMC em tempo real</h2>
              <p>Arraste os controles de peso e altura para calcular o IMC e observar o corpo estilizado mudar de forma e cor com uma transi\u00e7\u00e3o suave.</p>
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
                ${categories.map((item, index) => `
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

function featuresMarkup() {
  const items = [
    { iconName: "apple", title: "Dietas personalizadas", description: "Card\u00e1pios montados pela IA com base no seu objetivo, restri\u00e7\u00f5es e rotina." },
    { iconName: "dumbbell", title: "Treinos sob medida", description: "Programas semanais adaptados ao seu n\u00edvel, equipamento e tempo dispon\u00edvel." },
    { iconName: "camera", title: "An\u00e1lise por foto", description: "Tire foto da refei\u00e7\u00e3o e receba estimativa de calorias e macros na hora." },
    { iconName: "message", title: "Chat com NutriAI", description: "Tire d\u00favidas, ajuste planos e receba motiva\u00e7\u00e3o a qualquer hora do dia.", href: "/chat" },
  ];
  return `
    <section class="section" id="features">
      <div class="container">
        <div class="section-heading">
          <h2>Tudo que voc\u00ea precisa para se sentir bem</h2>
          <p>Um app completo que combina nutri\u00e7\u00e3o, treino e intelig\u00eancia artificial numa experi\u00eancia simples.</p>
        </div>
        <div class="features-grid">
          ${items.map(featureCardMarkup).join("")}
        </div>
      </div>
    </section>
  `;
}

function featureCardMarkup(item) {
  const content = `
    <span class="feature-icon">${icon(item.iconName, "icon-xl")}</span>
    <h3>${item.title}</h3>
    <p>${item.description}</p>
  `;
  if (item.href) {
    return `<a href="${item.href}" data-link class="feature-card">${content}</a>`;
  }
  return `<article class="feature-card">${content}</article>`;
}

function ctaMarkup() {
  return `
    <section class="section-tight">
      <div class="container">
        <div class="cta-card">
          <div class="cta-content">
            <h2>Comece sua jornada saud\u00e1vel hoje.</h2>
            <p>Crie sua conta gr\u00e1tis e tenha um plano personalizado em minutos.</p>
            <div class="inline-actions">
              <a href="/cadastro" data-link class="btn btn-light">Criar conta gr\u00e1tis ${icon("arrowRight")}</a>
              <a href="#features" class="btn btn-white">Saber mais</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function getBmiCategories() {
  return [
    { min: 0, max: 18.49, label: "Abaixo do peso", range: "< 18.5", color: "#60a5fa" },
    { min: 18.5, max: 24.9, label: "Peso normal", range: "18.5 - 24.9", color: "#22c55e" },
    { min: 25, max: 29.9, label: "Sobrepeso", range: "25 - 29.9", color: "#facc15" },
    { min: 30, max: 34.9, label: "Obesidade I", range: "30 - 34.9", color: "#fb923c" },
    { min: 35, max: Infinity, label: "Obesidade II+", range: "> 35", color: "#ef4444" },
  ];
}

function getBmiCategory(bmi, categories) {
  return categories.find((item) => bmi >= item.min && bmi <= item.max) || categories[1];
}

function bindBmiSliders(app) {
  const bmiSections = app.querySelectorAll("[data-bmi]");
  bmiSections.forEach((root) => {
    const weightInput = root.querySelector('[data-bmi-input="weight"]');
    const heightInput = root.querySelector('[data-bmi-input="height"]');
    if (weightInput) {
      weightInput.addEventListener("input", () => updateBmi(root));
      updateRangeProgress(weightInput);
    }
    if (heightInput) {
      heightInput.addEventListener("input", () => updateBmi(root));
      updateRangeProgress(heightInput);
    }
  });
}

function updateBmi(root) {
  const categories = getBmiCategories();
  const weightInput = root.querySelector('[data-bmi-input="weight"]');
  const heightInput = root.querySelector('[data-bmi-input="height"]');
  const weight = Number(weightInput.value);
  const height = Number(heightInput.value);
  const bmi = weight / (height * height);
  const category = getBmiCategory(bmi, categories);
  const index = Math.max(0, categories.findIndex((item) => item.label === category.label));

  const weightDisplay = root.querySelector('[data-bmi-display="weight"]');
  const heightDisplay = root.querySelector('[data-bmi-display="height"]');
  const bmiNumber = root.querySelector("[data-bmi-number]");
  const bmiPill = root.querySelector("[data-bmi-pill]");
  const bmiCard = root.querySelector(".bmi-card");
  const bmiAvatar = root.querySelector(".bmi-avatar");
  const bmiShape = root.querySelector("[data-bmi-shape]");
  const categoryNodes = root.querySelectorAll("[data-bmi-category]");

  if (weightDisplay) weightDisplay.textContent = `${Math.round(weight)} kg`;
  if (heightDisplay) heightDisplay.textContent = `${height.toFixed(2)} m`;
  if (bmiNumber) bmiNumber.textContent = bmi.toFixed(1);
  if (bmiPill) {
    bmiPill.textContent = category.label;
    bmiPill.style.setProperty("--bmi-color", category.color);
  }
  if (bmiCard) bmiCard.style.setProperty("--bmi-glow", `${category.color}26`);
  if (bmiAvatar) bmiAvatar.style.setProperty("--avatar-color", category.color);
  if (bmiShape) bmiShape.src = ASSETS.bmiShapes[index];
  updateRangeProgress(weightInput);
  updateRangeProgress(heightInput);
  categoryNodes.forEach((node) => {
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
