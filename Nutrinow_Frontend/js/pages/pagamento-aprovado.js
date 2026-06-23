import { pageShell, footerMarkup, ASSETS, bindGlobalEvents } from '../shared/ui.js';
import { getUser, apiRequest } from '../shared/api.js';
import { escapeHtml, normalizePath, getCurrentPath, getErrorMessage, isPremiumUser } from '../shared/utils.js';
import { icon } from '../shared/icons.js';

let state = {
  paymentReturn: { checking: false, checked: false, error: "" },
};

export function renderPage() {
  const app = document.getElementById('app');
  const path = normalizePath(getCurrentPath());
  const user = getUser();
  const premium = isPremiumUser(user);
  const checking = state.paymentReturn.checking;
  const checked = state.paymentReturn.checked;

  const statusMarkup = !user
    ? `<div class="alert payment-status">${icon("alert")} Entre com a mesma conta usada no checkout para liberar o Premium.</div>`
    : premium
      ? `<div class="success-box payment-status">${icon("checkCircle")} Premium ativo. Sua conta ja esta liberada.</div>`
      : `<div class="success-box payment-status">${icon("clock")} Pagamento recebido. Se o acesso ainda nao apareceu, aguarde alguns segundos e atualize o status.</div>`;
  const secondaryStatus = checked && !premium && !state.paymentReturn.error
    ? `<p class="text-muted payment-hint">A Cakto pode levar alguns instantes para enviar o webhook de confirmacao.</p>`
    : "";

  app.innerHTML = pageShell(`
    <main>
      <section class="payment-success-hero">
        <div class="container payment-success-layout">
          <div class="payment-success-copy animate-fade-up">
            <span class="badge">${icon("checkCircle")} Pagamento aprovado</span>
            <h1>${premium ? "Premium ativado" : "Seu Premium esta sendo ativado"}</h1>
            <p>Obrigado por assinar o NutriNow. Agora voce pode acessar dashboard, dietas, treinos e calendario integrado assim que a confirmacao do pagamento chegar.</p>
            ${statusMarkup}
            ${state.paymentReturn.error ? `<div class="alert payment-status">${icon("alert")} ${escapeHtml(state.paymentReturn.error)}</div>` : ""}
            ${secondaryStatus}
            <div class="inline-actions payment-success-actions">
              ${premium ? `<a href="/dashboard" data-link class="btn btn-primary">${icon("layout")} Acessar dashboard</a>`
                : user ? `<button type="button" class="btn btn-primary" data-action="refresh-payment-status" ${checking ? "disabled" : ""}>${icon("refresh")} ${checking ? "Atualizando..." : "Atualizar status"}</button>`
                : `<a href="/login" data-link class="btn btn-primary">${icon("login")} Entrar</a>`}
              <a href="/chat" data-link class="btn btn-secondary">${icon("message")} Abrir Chat NutriAI</a>
            </div>
          </div>
          <div class="payment-success-media animate-fade-up delay-200">
            <img src="${ASSETS.hero}" alt="Refeicao saudavel com frutas e ingredientes naturais" width="1280" height="960" decoding="async">
          </div>
        </div>
      </section>
      <section class="section surface">
        <div class="container">
          <div class="steps-grid">
            <article class="step-card">
              <span class="step-number text-gradient">01</span>
              <h3>Pagamento confirmado</h3>
              <p>A Cakto envia o webhook de aprovacao para o NutriNow.</p>
            </article>
            <article class="step-card">
              <span class="step-number text-gradient">02</span>
              <h3>Conta liberada</h3>
              <p>O backend valida o pedido na Cakto e marca sua conta como Premium.</p>
            </article>
            <article class="step-card">
              <span class="step-number text-gradient">03</span>
              <h3>Rotina premium</h3>
              <p>Voce acessa planos, dashboard e calendario para organizar seu progresso.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
    ${footerMarkup()}
  `, path);

  bindGlobalEvents(app);
  bindPaymentReturn(app);
}

function bindPaymentReturn(app) {
  app.querySelectorAll('[data-action="refresh-payment-status"]').forEach((button) => {
    button.addEventListener("click", async () => {
      state.paymentReturn = { checking: true, checked: state.paymentReturn.checked, error: "" };
      renderPage();

      try {
        const user = await apiRequest("/me");
        if (user?.id) {
          const { setUser } = await import('../shared/api.js');
          setUser(user);
          state.paymentReturn = { checking: false, checked: true, error: "" };
        } else {
          state.paymentReturn = { checking: false, checked: true, error: "Nao foi possivel atualizar sua conta agora." };
        }
      } catch {
        state.paymentReturn = { checking: false, checked: true, error: "Nao foi possivel atualizar sua conta agora." };
      }
      renderPage();
    });
  });
}
