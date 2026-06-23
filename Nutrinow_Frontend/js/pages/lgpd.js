import { pageShell, footerMarkup, bindGlobalEvents } from '../shared/ui.js';
import { LEGAL_PAGES } from '../shared/product.js';
import { escapeHtml, normalizePath, getCurrentPath } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());
  const page = LEGAL_PAGES.lgpd;

  app.innerHTML = pageShell(`
    <main class="page-main legal-page">
      <div class="container">
        <section class="legal-hero">
          <span class="badge">${icon("checkCircle")} ${escapeHtml(page.eyebrow)}</span>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.summary)}</p>
          <small>Atualizado em ${escapeHtml(page.updatedAt)}. Modelo inicial: revise com assessoria jur\u00eddica antes de uso comercial.</small>
        </section>
        <section class="legal-grid" aria-label="${escapeHtml(page.title)}">
          ${page.sections.map((section) => `
            <article class="legal-section">
              <h2>${escapeHtml(section.title)}</h2>
              <p>${escapeHtml(section.body)}</p>
            </article>
          `).join("")}
        </section>
        <section class="compliance-note">
          <h2>Pr\u00f3ximo passo obrigat\u00f3rio</h2>
          <p>Configure o controlador, o canal do encarregado, pol\u00edtica de reten\u00e7\u00e3o e registros de consentimento antes de vender ou operar o NutriNow com usu\u00e1rios reais.</p>
          <div class="inline-actions">
            <a href="/termos" data-link class="btn btn-secondary">Ver termos</a>
            <a href="/privacidade" data-link class="btn btn-primary">Ver privacidade</a>
          </div>
        </section>
      </div>
    </main>
    ${footerMarkup()}
  `, path);

  bindGlobalEvents(app);
}
