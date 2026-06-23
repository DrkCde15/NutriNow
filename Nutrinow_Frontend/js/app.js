import { migratePersistentSession } from './shared/api.js';
import { normalizePath, getCurrentPath, setRenderFn } from './shared/utils.js';

migratePersistentSession();

const PAGE_MODULES = {
  '/': './pages/landing.js',
  '/login': './pages/login.js',
  '/cadastro': './pages/cadastro.js',
  '/esqueci-senha': './pages/esqueci-senha.js',
  '/reset-senha': './pages/reset-senha.js',
  '/pagamento-aprovado': './pages/pagamento-aprovado.js',
  '/pagamento-sucesso': './pages/pagamento-aprovado.js',
  '/dashboard': './pages/dashboard.js',
  '/planos': './pages/planos.js',
  '/calendario': './pages/calendario.js',
  '/chat': './pages/chat.js',
  '/perfil': './pages/perfil.js',
  '/feedbacks': './pages/feedbacks.js',
  '/termos': './pages/termos.js',
  '/privacidade': './pages/privacidade.js',
  '/lgpd': './pages/lgpd.js',
  '/pacientes': './pages/pacientes.js',
  '/anotacoes': './pages/anotacoes.js',
  '/paciente-detalhe': './pages/paciente-detalhe.js',
};

async function render() {
  const path = normalizePath(getCurrentPath());
  const app = document.getElementById('app');
  if (!app) return;

  const modulePath = PAGE_MODULES[path];
  if (!modulePath) {
    const { pageShell } = await import('./shared/ui.js');
    app.innerHTML = pageShell('<main class="container" style="padding:4rem 1rem;text-align:center;"><h1>Página não encontrada</h1><p class="text-muted">A página que você procura não existe.</p></main>', path);
    return;
  }

  try {
    const page = await import(modulePath);
    if (typeof page.renderPage === 'function') {
      page.renderPage();
    }
  } catch {
    const { pageShell } = await import('./shared/ui.js');
    app.innerHTML = pageShell('<main class="container" style="padding:4rem 1rem;text-align:center;"><h1>Erro ao carregar página</h1><p class="text-muted">Não foi possível carregar o conteúdo.</p></main>', path);
  }
}

setRenderFn(render);
window.addEventListener('popstate', render);
render();
