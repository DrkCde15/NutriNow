# NutriNow

NutriNow e uma plataforma web para acompanhamento de nutricao, treinos e rotina saudavel com apoio da NutriAI.

![Logo do projeto](Nutrinow-Frontend\public\logo.png)

## Visao geral

O projeto combina uma SPA em **React + TypeScript** no frontend (buildada com Vite) com uma API Flask no backend. A aplicacao permite criar conta, manter perfil fisico, registrar dietas e treinos, acompanhar progresso no dashboard, conversar com a NutriAI, consultar um catalogo de exercicios com midia (GIF/JPG), encontrar academias proximas, receber lembretes por notificacoes internas (in-app e e-mail) e, para profissionais (nutricionistas/personal trainers), convidar pacientes e gerenciar pacientes.

> **Nota:** o backend Flask tambem e capaz de servir o frontend estatico gerado em `Nutrinow-Frontend/dist/` em um unico Web Service (deploy no Render).

## Funcionalidades

### Autenticacao e conta

- Cadastro com dados pessoais, objetivo inicial, altura, peso e historico de treino.
- Login tradicional com e-mail e senha.
- Login com Google OAuth, criando o usuario automaticamente quando necessario.
- Logout com limpeza de cookies/tokens e cache de agentes da NutriAI.
- Renovacao de sessao com refresh token em cookie seguro (com CSRF).
- Endpoint `/me` para recuperar a conta autenticada.
- Recuperacao e redefinicao de senha por e-mail, com token temporario salvo no MySQL.
- Validacao de senha minima e bloqueio de senhas comuns.
- Rate limit em fluxos sensiveis, como login, cadastro, redefinicao de senha, chat e feedback.
- Roles de usuario: `user` (padrao), `nutritionist` e `personal_trainer` habilitam a area profissional.

### Acesso Free e Premium

- Contas novas entram como gratuitas por padrao.
- Contas gratuitas podem acessar Login, Cadastro, Perfil, Chat NutriAI, Feedbacks, Termos de Uso, Privacidade e LGPD.
- Funcionalidades gratuitas para todos: notificacoes (campainha in-app), convite de pacientes, area do profissional (pacientes e anotacoes), Academias e catalogo de exercicios.
- Dashboard, dietas/treinos, calendario de eventos e notificacoes por e-mail exigem conta premium.
- A pagina de Planos (`/planos`) apresenta comparativo Gratis vs Premium, FAQ e botao de checkout.
- O botao Pagar chama `/billing/checkout`, que gera o link da Cakto com `refId=nutrinow_user_<id>`.
- O webhook `/billing/webhook/cakto` ativa premium somente apos validar o pedido como pago na API da Cakto.
- A pagina de retorno para pagamento aprovado fica em `/pagamento-aprovado`, com alias `/pagamento-sucesso`.
- O backend bloqueia APIs premium com `402` e codigo `premium_required`.
- O estado premium fica em `usuarios.is_premium`, com expiracao opcional em `usuarios.premium_expires_at`.

### Perfil e dashboard

- Perfil editavel com nome, sobrenome, genero, data de nascimento, e-mail, meta, altura, peso e experiencia com treino.
- Persistencia dos dados do perfil no MySQL.
- Dashboard autenticado com peso, altura, IMC e objetivo atual.
- Historico recente de peso/atividade baseado nos registros de dieta e treino.
- Insights gerados a partir de conversas com a NutriAI e itens cadastrados na rotina.
- Avatar local no frontend para personalizar a experiencia do usuario.

### Dietas, treinos e calendario

- Cadastro de itens de dieta e treino com titulo, descricao, tipo e horario.
- Edicao e exclusao de itens existentes.
- Separacao entre abas de treino e dieta no frontend.
- Agendamento por data e hora.
- Duracao configuravel por item.
- Recorrencia semanal com selecao de dias da semana e data final opcional.
- Calendario mensal no frontend com expansao de eventos recorrentes.
- Lembretes da rotina exibidos no calendario e na campainha de notificacoes.
- Eventos personalizados do usuario (premium) em `calendario_eventos`, com categorias `evento`, `lembrete`, `dieta` e `treino`, via blueprints `calendario` (`GET/POST /calendario/eventos`, `PUT/DELETE /calendario/eventos/<id>`).

### Notificacoes (agenda interna)

- Agenda interna com lembretes; sem integracao com calendarios externos.
- Ao criar/editar/excluir itens de dieta/treino, o backend agenda uma notificacao (`notifications` service).
- Notificacoes in-app listadas na campainha do header (`/notificacoes`) e marcadas como lidas (`/notificacoes/<id>/lida`).
- Envio de e-mail agendado (quando a conta e premium) com idempotencia via flag `enviado_email`.
- Job do APScheduler (`disparar_notificacoes_vencidas`) a cada minuto dispara e-mails vencidos.
- Recorrencia: ao enviar, o item e reagendado para a proxima ocorrencia (recorrencia semanal).

### NutriAI e chat

- Chat autenticado com sessoes independentes.
- Historico persistido por usuario e sessao.
- Listagem de conversas recentes (`/chat_sessions`) com titulo, preview, data e quantidade de mensagens.
- Exclusao de sessoes de conversa.
- Contexto automatico do perfil do usuario no prompt da NutriAI.
- Contexto automatico da agenda de dieta/treino no prompt da NutriAI.
- Cache em memoria para agentes por usuario/sessao, reduzindo recriacao durante a conversa.
- Fallback entre modelos Groq configuraveis por variavel de ambiente.
- Retry com backoff para erros transitorios de rede, cota ou indisponibilidade.
- Renderizacao de Markdown basico no frontend, incluindo listas, tabelas e enfases.
- Sugestoes de mensagem (chips) exibidas acima da barra de texto quando a conversa esta vazia, enviando exemplos prontos para a NutriAI ao clicar.
- Upload de imagem no chat com analise visual real quando `GROQ_VISION_MODEL` aponta para um modelo multimodal compativel (`/analyze_image`).

### Academias

- Pagina `/academias` (gratuita) para buscar academias proximas ao usuario.
- Geolocalizacao do navegador ou entrada manual de coordenadas (latitude/longitude).
- Raio de busca configuravel (5/10/20/50 km) com validacao de limites no backend.
- Dados de academias obtidos da API Overpass (OpenStreetMap) via `GET /academias/nearby`.
- Resposta com nome, endereco, telefone, website, horarios e distancia em km (ordenada por distancia).
- Link para rota no Google Maps por academia.
- Rate limit de 60 requisicoes/hora por usuario no endpoint e cache de resultados (`ACADEMIAS_CACHE_SECONDS`).

### Catalogo de exercicios

- Endpoint publico `GET /exercises` com listagem, filtros por grupo muscular, equipamento, categoria, alvo e busca textual (`q`).
- Suporte a paginacao com `limit` e filtros em `GET /exercises/filters`.
- Detalhe de exercicio em `GET /exercises/<id>` e lista completa em `GET /exercises/all`.
- Midia dos exercicios servida estaticamente em `GET /exercises/media/<arquivo>` (GIF/JPG).
- Dataset local em `NutriNow_BackEnd/exercises-dataset/` (nao versionado no git), carregado em memoria com indice por filtros no boot (`exercises_service.ensure_loaded`).
- Sincronizacao do dataset via Google Drive ou URL de arquivo (`scripts/sync_exercises_dataset.py`, variaveis `EXERCISES_DATASET_*`) — tambem executada no boot do deploy (Render) por `render-build.sh`.

### Area do profissional

- Disponivel para usuarios com role `nutritionist` ou `personal_trainer`.
- **Convite de pacientes**: o profissional gera um link de convite (`POST /invites`) e o paciente que se cadastra com `?convite=<token>` e associado a `usuarios.convidado_por`. A validade e consultada em `GET /invites/validate`.
- Listagem, cadastro, edicao e exclusao de pacientes (`/patients`).
- Anotacoes por paciente (`/notes`) com CRUD completo.
- Visualizacao e registro de dieta (`/patients/<id>/diet`) e treino (`/patients/<id>/workout`) do paciente.
- Paginas no frontend: `Pacientes`, `PacienteDetalhe`, `Anotacoes` e `Convidar` (todas gratuitas para profissionais).
- O perfil do paciente exibe "quem te convidou" (`convidadoPor`) e a foto do profissional (`perfil.foto`).

### Feedbacks

- Pagina publica/autenticada de feedback.
- Envio de nota de 1 a 5 e comentario.
- Associacao opcional ao usuario logado.
- Persistencia dos feedbacks no MySQL.
- Notificacao por e-mail para o endereco configurado em `EMAIL_SENDER`.

### Analytics

- Captura de eventos first-party com consentimento explicito (`/analytics/events`).
- Armazenamento em `analytics_events` no MySQL.
- Metadados sensiveis sao filtrados no cliente e no servidor.

## Stack

### Frontend

- **React 19 + TypeScript**, buildado com **Vite 6**.
- Roteamento client-side com **React Router 7** (`src/App.tsx`).
- `AuthContext` (`src/context/AuthContext.tsx`) para sessao/usuario.
- Cliente HTTP centralizado em `src/api/client.ts` com:
  - Envio automatico de JWT no header `Authorization`.
  - Refresh de sessao com deduplicacao (`/refresh`) e CSRF token via cookie.
  - Tratamento centralizado de erros (`ApiError`, `NetworkError`, `TimeoutError`).
  - Base de API resolvida automaticamente (proxy `/api` do Vite em dev, `location.origin` em producao).
- Comunicacao com a API via `fetch`.
- Upload de arquivos com `FormData` para o endpoint de analise de imagem.
- Paginas de termos de uso, privacidade e LGPD com rotas publicas.
- Analytics proprio com consentimento explicito e eventos minimizados.
- Interface responsiva com paginas para landing, autenticacao, dashboard, planos, calendario, chat, perfil, academias, feedbacks e area do profissional.

### Backend

- Python + Flask (factory `create_app()` em `app/__init__.py`).
- Flask-Cors, Flask-JWT-Extended (access + refresh com CSRF).
- MySQL Connector com pool de conexoes (`app/database.py`).
- Werkzeug para hash de senha.
- Requests + OAuthlib para Google OAuth.
- Groq em formato compativel com OpenAI Chat Completions para a NutriAI.
- Gunicorn para deploy.
- Blueprints separados por dominio:
  - `auth` (cadastro, login, Google OAuth, logout, refresh, `/me`, esqueci/redefinir senha)
  - `profile` (perfil, dashboard)
  - `fitness` (dieta/treino CRUD + agendamento de notificacoes)
  - `chatbot` (chat, historico, sessoes, analise de imagem)
  - `notifications` (listar e marcar notificacoes)
  - `invites` (gerar/validar convite de profissional)
  - `feedbacks`
  - `billing` (checkout Cakto + webhook)
  - `analytics` (eventos)
  - `professional` (pacientes, anotacoes, dietas/treinos de paciente)
  - `calendario` (eventos personalizados premium)
  - `gym` (academias proximas via Overpass)
  - `exercises` (catalogo de exercicios + midia estática)
- CORS configuravel por ambiente, com origens locais e de producao.
- Cookies de refresh token com suporte a CSRF.
- Headers de seguranca, incluindo `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, CSP e HSTS em producao.
- Validacao obrigatoria de configuracao de producao para segredos, HTTPS, cookies seguros e integracoes.
- Endpoint `/health/ready` para checar prontidao do banco em deploy.
- Limite de upload configuravel por `MAX_UPLOAD_MB`.
- Cache TTL em memoria para sessoes de chat, itens de rotina e dados de conta.

### Banco de dados

- MySQL 8+.
- Schema principal em `NutriNow_BackEnd/app/services/db_schema.py`.
- Script de inicializacao/atualizacao em `NutriNow_BackEnd/init_db.py`.
- `NutriNow_BackEnd/SQL.txt` fica como referencia historica/manual.
- Tabelas principais: `usuarios`, `perfil`, `redefinicao_senha`, `dieta_treino`, `notificacoes`, `chat_history`, `uploads`, `feedbacks`, `analytics_events`, `calendario_eventos`, `pacientes`, `paciente_anotacoes`, `paciente_dietas`, `paciente_treinos` e `convites_profissionais`.
- Relacionamentos com chaves estrangeiras e exclusao em cascata onde faz sentido, como perfil, rotina e tokens vinculados ao usuario.
- Indices para consultas frequentes por usuario, sessao, e-mail, data e tipo de item.
- Pool de conexoes configuravel por `MYSQL_POOL_SIZE` (padrao `10`), com opcao de desativar via `MYSQL_DISABLE_POOL`.
- Tentativa (retry) com backoff curto ao esgotar o pool (`PoolError`), evitando falha imediata da requisicao sob concorrencia.
- Suporte opcional a SSL no MySQL por `MYSQL_SSL_MODE` e `MYSQL_SSL_CA`.

### Integracoes e servicos

- Google OAuth para login social.
- Cakto para checkout premium e webhook de confirmacao de pagamento.
- SMTP para recuperacao de senha, notificacao de feedbacks e envio de lembretes agendados.
- Groq API para respostas da NutriAI.
- Overpass API (OpenStreetMap) para busca de academias proximas.
- Google Drive (arquivo publico) para sincronizacao do dataset de exercicios.
- APScheduler para disparo agendado de notificacoes/e-mails.
- `python-dotenv` para carregar variaveis de ambiente em desenvolvimento.

### Seguranca e confiabilidade

- Hash de senhas com Werkzeug.
- Validacao basica de e-mail e senha.
- Tokens JWT em access token e refresh token (com CSRF nos cookies de refresh).
- Serializacao assinada com `itsdangerous` para estados/codigos de OAuth e tokens de redefinicao.
- Rate limit em memoria por IP, escopo e usuario/e-mail quando aplicavel.
- Validacao de extensao, MIME type e assinatura dos arquivos de imagem enviados.
- Bloqueio de CORS wildcard (`*`) para evitar configuracao insegura.
- Segredos obrigatorios e com tamanho minimo em producao.
- Analytics first-party somente apos consentimento; metadados sensiveis sao filtrados no cliente e no servidor.

## Estrutura

```text
NutriNow-2/
|- NutriNow_BackEnd/
|  |- App.py
|  |- init_db.py
|  |- requirements.txt
|  |- Procfile
|  |- render-build.sh
|  |- .env.example
|  |- SQL.txt
|  |- nutrinow2.sql
|  |- migrations/          # scripts SQL de migracao pontual
|  |- exercises-dataset/   # dataset de exercicios (nao versionado; sincronizado via Drive)
|  |- scripts/
|  |  |- sync_exercises_dataset.py  # download/atualizacao do dataset
|  |- tests/               # testes de integracao e de validacao de producao
|  |- app/
|  |  |- __init__.py        # factory create_app()
|  |  |- database.py        # pool de conexoes MySQL
|  |  |- security.py        # helpers de ambiente/CORS
|  |  |- routes/            # blueprints: auth, profile, fitness, chatbot,
|  |  |                     #   notifications, invites, feedbacks, billing,
|  |  |                     #   analytics, professional, calendario, gym, exercises
|  |  |- services/          # db_schema, mail_service, cakto_service,
|  |                        #   agent_service, access_control, caches, validation,
|  |                        #   exercises_service, gym_service, ...
|- Nutrinow-Frontend/
|  |- index.html
|  |- package.json
|  |- vite.config.ts        # dev server na porta 5173 com proxy /api -> :8000
|  |- tsconfig.json
|  |- src/
|  |  |- main.tsx
|  |  |- App.tsx            # rotas React Router
|  |  |- api/client.ts      # cliente HTTP centralizado
|  |  |- context/AuthContext.tsx
|  |  |- hooks/
|  |  |- components/        # Navbar, NavLink, Footer, Icon, NotificacaoBell, ...
|  |  |- pages/             # auth/, professional/, legal/, e paginas principais
|  |  |- styles.css
|  |- public/
|  `- dist/                 # build de producao (gerado)
`- README.md
```

## Requisitos

- Node.js 18+
- npm
- Python 3.10+
- MySQL 8+

## Configuracao do banco

Crie o banco antes de iniciar o backend:

```sql
CREATE DATABASE nutrinow2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Depois de configurar o `.env`, rode o inicializador de schema:

```powershell
cd NutriNow_BackEnd
python init_db.py
```

O script cria ou atualiza as tabelas principais: usuarios, perfil, redefinicao de senha, dieta/treino, notificacoes, historico de chat, uploads, feedbacks, analytics, eventos de calendario e as tabelas da area profissional (pacientes, anotacoes, dietas, treinos de paciente e convites). Tabelas e colunas novas tambem sao criadas dinamicamente em bancos ja existentes via `schema_cache`.

## Variaveis de ambiente

Crie `NutriNow_BackEnd/.env` copiando de `NutriNow_BackEnd/.env.example`:

```env
APP_ENV=development
HOST=127.0.0.1
PORT=8000
FLASK_DEBUG=true
FLASK_USE_RELOADER=true
FLASK_RELOADER_TYPE=stat
FLASK_SECRET_KEY=troque_esta_chave_por_uma_chave_grande
JWT_SECRET_KEY=troque_esta_chave_por_uma_chave_grande
JWT_ACCESS_TOKEN_MINUTES=9999
JWT_REFRESH_TOKEN_DAYS=30
JWT_COOKIE_SECURE=false
JWT_COOKIE_SAMESITE=Lax

FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_SUPPORTS_CREDENTIALS=true

TRUST_PROXY_HEADERS=false
OAUTHLIB_INSECURE_TRANSPORT=1   # so em desenvolvimento

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha
MYSQL_DATABASE=nutrinow2
MYSQL_POOL_SIZE=10
MYSQL_DISABLE_POOL=false
MYSQL_SSL_MODE=disabled

GROQ_API_KEY=sua_chave_groq
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_PRIMARY_MODEL=groq/compound-mini
GROQ_FALLBACK_MODELS=groq/compound
GROQ_VISION_MODEL=seu_modelo_multimodal_para_imagens
GROQ_TIMEOUT_SECONDS=60
GROQ_MAX_RETRIES=5
GROQ_TEMPERATURE=0.7

GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GOOGLE_LOGIN_REDIRECT_URI=http://127.0.0.1:8000/auth/callback

CAKTO_CLIENT_ID=seu_cakto_client_id
CAKTO_CLIENT_SECRET=seu_cakto_client_secret
CAKTO_API_KEY=sua_cakto_api_key
BASE_URL_CAKTO=https://api.cakto.com.br/
CHECKOUT_LINK=https://pay.cakto.com.br/seu_checkout
CAKTO_WEBHOOK_SECRET=um_segredo_para_validar_webhook
WEBHOOK_KEY=um_segredo_para_validar_webhook

EMAIL_SENDER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app

MAX_UPLOAD_MB=5
VISION_IMAGE_MAX_MB=5
UPLOAD_FOLDER=uploads
CHAT_MESSAGE_MAX_CHARS=8000
CHAT_SESSIONS_CACHE_SECONDS=12
USER_ACCOUNT_CACHE_SECONDS=120

ACADEMIAS_CACHE_SECONDS=600
OVERPASS_URL=https://overpass-api.de/api/interpreter

# Exercises dataset: caminho local (drive montado/sincronizado) ou download no boot.
# EXERCISES_DATASET_DIR=/app/exercises-dataset
# EXERCISES_DATASET_ARCHIVE_URL=https://.../exercises-dataset.tar.gz
# EXERCISES_DATASET_COPY_DIR=/mnt/drive/exercises-dataset
```

Em producao, use `APP_ENV=production`, configure `FRONTEND_URL_PROD`/`CORS_ORIGINS_PROD` com HTTPS, ative `JWT_COOKIE_SECURE=true`, configure `GROQ_VISION_MODEL` com um modelo multimodal para analise real de imagens e use segredos com pelo menos 32 caracteres. `groq/compound-mini` e `groq/compound` ficam recomendados para texto/fallback. A aplicacao falha no boot se a validacao de producao encontrar configuracao insegura ou incompleta.

Para pagamentos, configure na Cakto o webhook apontando para `https://seu-backend/billing/webhook/cakto` e use o mesmo valor de `WEBHOOK_KEY` ou `CAKTO_WEBHOOK_SECRET` no painel e no backend. O checkout deve preservar o parametro `refId` enviado pelo NutriNow para que o webhook encontre a conta correta. Para retorno pos-compra/upsell, use `https://seu-backend/pagamento-aprovado`.

## Como rodar localmente

### Backend

```powershell
cd NutriNow_BackEnd
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python init_db.py
python App.py
```

API local: `http://127.0.0.1:8000`

### Frontend

Em desenvolvimento o Vite roda na porta `5173` e faz proxy de `/api/*` para o backend em `http://127.0.0.1:8000` (ver `vite.config.ts`).

```powershell
cd Nutrinow-Frontend
npm install
npm run dev        # servidor de desenvolvimento (Vite) em http://localhost:5173
npm run build      # gera dist/ (tsc -b && vite build)
npm run preview    # serve o build de producao localmente
```

## Testes e verificacoes

Frontend:

```powershell
cd Nutrinow-Frontend
npm run lint       # type-check com tsc --noEmit
npm run build      # build de producao
```

Backend:

```powershell
cd NutriNow_BackEnd
python -m pytest            # suiter de testes (26+ verificacoes de integracao)
python -m compileall .
```

## Deploy no Render em um unico Web Service

Para o backend tambem servir o frontend estatico, crie um servico do tipo **Web Service** no Render e use:

```text
Root Directory: deixe vazio
Build Command: bash NutriNow_BackEnd/render-build.sh
Start Command: gunicorn --chdir NutriNow_BackEnd App:app
```

O script `render-build.sh` instala as dependencias Python, instala/prepara o frontend e gera `Nutrinow_Frontend/dist/`. O Flask serve esse `dist/` automaticamente pela mesma URL do backend (fallback de SPA em `app/__init__.py`).

No Render, defina alem das variaveis do `.env.example`:
- `EXERCISES_DATASET_ARCHIVE_URL` (link publico do arquivo do dataset, ex.: Google Drive) — o `render-build.sh` baixa e extrai o dataset durante o build para `exercises-dataset/`. Sem essa variavel, o catalogo de exercicios fica indisponivel.
- Opcional: `EXERCISES_DATASET_DIR` (caminho customizado) e `OVERPASS_URL` (padrao: `https://overpass-api.de/api/interpreter`).

Nao configure **Publish Directory** nesse caso. Publish Directory e apenas para **Static Site** separado. Deixar o Root Directory vazio tambem faz mudancas no frontend dispararem deploy automatico.
