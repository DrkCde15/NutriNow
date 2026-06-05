# NutriNow

NutriNow e uma plataforma web para acompanhamento de nutricao, treinos e rotina saudavel com apoio da NutriAI.

![Logo do projeto](Nutrinow_Frontend/assets/logo.png)

## Visao geral

O projeto combina uma SPA estatica no frontend com uma API Flask no backend. A aplicacao permite criar conta, manter perfil fisico, registrar dietas e treinos, acompanhar progresso no dashboard, conversar com a NutriAI e sincronizar itens de rotina com o Google Calendar.

## Funcionalidades

### Autenticacao e conta

- Cadastro com dados pessoais, objetivo inicial, altura, peso e historico de treino.
- Login tradicional com e-mail e senha.
- Login com Google OAuth, criando o usuario automaticamente quando necessario.
- Logout com limpeza de cookies/tokens e cache de agentes da NutriAI.
- Renovacao de sessao com refresh token em cookie seguro.
- Endpoint `/me` para recuperar a conta autenticada.
- Recuperacao e redefinicao de senha por e-mail, com token temporario salvo no MySQL.
- Validacao de senha minima e bloqueio de senhas comuns.
- Rate limit em fluxos sensiveis, como login, cadastro, redefinicao de senha, chat e feedback.

### Acesso Free e Premium

- Contas novas entram como `free` por padrao.
- Contas free podem acessar Login, Cadastro, Perfil, Chat NutriAI, Feedbacks, Termos de Uso, Privacidade e LGPD.
- Dashboard, dietas/treinos e Google Calendar exigem conta premium.
- Ao clicar em atalhos premium com conta free, o frontend exibe um modal com as opcoes Pagar e Fechar.
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
- Sincronizacao automatica com Google Calendar ao criar, editar ou excluir itens, quando a conta estiver conectada.

### Google Calendar

- Verificacao de status da conexao.
- Fluxo OAuth dedicado para permissao de calendario.
- Armazenamento de access token, refresh token, escopo, expiracao e calendario ativo no MySQL.
- Renovacao automatica do token quando possivel.
- Sincronizacao manual de todos os itens cadastrados.
- Criacao, atualizacao e exclusao de eventos no calendario do Google.
- Suporte a eventos recorrentes via RRULE semanal.
- Desconexao com remocao dos tokens e mapeamentos locais.

### NutriAI e chat

- Chat autenticado com sessoes independentes.
- Historico persistido por usuario e sessao.
- Listagem de conversas recentes com titulo, preview, data e quantidade de mensagens.
- Exclusao de sessoes de conversa.
- Contexto automatico do perfil do usuario no prompt da NutriAI.
- Contexto automatico da agenda de dieta/treino no prompt da NutriAI.
- Cache em memoria para agentes por usuario/sessao, reduzindo recriacao durante a conversa.
- Fallback entre modelos Groq configuraveis por variavel de ambiente.
- Retry com backoff para erros transitorios de rede, cota ou indisponibilidade.
- Renderizacao de Markdown basico no frontend, incluindo listas, tabelas e enfases.
- Upload de imagem no chat com analise visual real quando `GROQ_VISION_MODEL` aponta para um modelo multimodal compativel.

### Feedbacks

- Pagina publica/autenticada de feedback.
- Envio de nota de 1 a 5 e comentario.
- Associacao opcional ao usuario logado.
- Persistencia dos feedbacks no MySQL.
- Notificacao por e-mail para o endereco configurado em `EMAIL_SENDER`.

## Stack

### Frontend

- HTML, CSS e JavaScript puro.
- SPA com roteamento client-side em `app.js`.
- Scripts Node.js para servidor local, build estatico e checagem de sintaxe.
- Assets em `Nutrinow_Frontend/assets/`.
- Interface responsiva com paginas para landing, autenticacao, dashboard, planos, calendario, chat, perfil e feedbacks.
- Estado de sessao salvo em `localStorage`, com compatibilidade para migrar dados antigos de `sessionStorage`.
- Cache local para usuario autenticado, sessoes de chat e sessao atual.
- Comunicacao com a API via `fetch`, incluindo envio automatico de JWT, refresh de sessao e tratamento centralizado de erros.
- Upload de arquivos com `FormData` para o endpoint de analise de imagem.
- Paginas de termos de uso, privacidade e LGPD com rotas publicas.
- Analytics proprio com consentimento explicito e eventos minimizados.
- Build proprio em `build-static.mjs`, com minificacao simples de HTML/CSS e copia de assets para `dist/`.
- Servidor local proprio em `serve-static.mjs`, com fallback de SPA e headers de cache por tipo de arquivo.

### Backend

- Python + Flask.
- Flask-Cors.
- Flask-JWT-Extended.
- MySQL Connector com pool de conexoes.
- Werkzeug para hash de senha.
- Requests + OAuthlib para Google OAuth e Google Calendar.
- Groq em formato compativel com OpenAI Chat Completions para a NutriAI.
- Gunicorn para deploy.
- Estrutura em factory com `create_app()` e blueprints separados por dominio.
- Blueprints principais: `auth`, `profile`, `fitness`, `calendar`, `chatbot` e `feedbacks`.
- CORS configuravel por ambiente, com origens locais e de producao.
- Cookies de refresh token com suporte a CSRF.
- Headers de seguranca, incluindo `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, CSP e HSTS em producao.
- Validacao obrigatoria de configuracao de producao para segredos, HTTPS, cookies seguros e integracoes.
- Endpoint `/health/ready` para checar prontidao do banco em deploy.
- Limite de upload configuravel por `MAX_UPLOAD_MB`.
- Cache TTL em memoria para sessoes de chat, itens de rotina e dados de conta.
- Servimento opcional do frontend estatico gerado em `Nutrinow_Frontend/dist/`.

### Banco de dados

- MySQL 8+.
- Schema principal em `NutriNow_BackEnd/app/services/db_schema.py`.
- Script de inicializacao/atualizacao em `NutriNow_BackEnd/init_db.py`.
- `NutriNow_BackEnd/SQL.txt` fica como referencia historica/manual.
- Tabelas principais: `usuarios`, `perfil`, `redefinicao_senha`, `dieta_treino`, `chat_history`, `uploads`, `feedbacks`, `google_calendar_tokens` e `google_calendar_events`.
- Relacionamentos com chaves estrangeiras e exclusao em cascata onde faz sentido, como perfil, rotina e tokens vinculados ao usuario.
- Indices para consultas frequentes por usuario, sessao, e-mail, data e tipo de item.
- Pool de conexoes configuravel por `MYSQL_POOL_SIZE`, com opcao de desativar via `MYSQL_DISABLE_POOL`.
- Suporte opcional a SSL no MySQL por `MYSQL_SSL_MODE` e `MYSQL_SSL_CA`.

### Integracoes e servicos

- Google OAuth para login social.
- Google Calendar API para criar, atualizar e excluir eventos de rotina.
- Cakto para checkout premium e webhook de confirmacao de pagamento.
- SMTP para recuperacao de senha e notificacao de feedbacks.
- Groq API para respostas da NutriAI.
- `python-dotenv` para carregar variaveis de ambiente em desenvolvimento.

### Seguranca e confiabilidade

- Hash de senhas com Werkzeug.
- Validacao basica de e-mail e senha.
- Tokens JWT em access token e refresh token.
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
|  `- app/
|     |- routes/
|     `- services/
|- Nutrinow_Frontend/
|  |- index.html
|  |- app.js
|  |- styles.css
|  |- build-static.mjs
|  |- serve-static.mjs
|  `- assets/
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

O script cria ou atualiza as tabelas principais: usuarios, perfil, redefinicao de senha, dieta/treino, historico de chat, uploads, feedbacks e tabelas do Google Calendar.

## Variaveis de ambiente

Crie `NutriNow_BackEnd/.env`:

```env
APP_ENV=development
HOST=127.0.0.1
PORT=8000
FLASK_DEBUG=true
FLASK_SECRET_KEY=troque_esta_chave_por_uma_chave_grande
JWT_SECRET_KEY=troque_esta_chave_por_uma_chave_grande
JWT_ACCESS_TOKEN_MINUTES=9999
JWT_REFRESH_TOKEN_DAYS=30
JWT_COOKIE_SECURE=false
JWT_COOKIE_SAMESITE=Lax

FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha
MYSQL_DATABASE=nutrinow2
MYSQL_POOL_SIZE=2

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
GOOGLE_CALENDAR_REDIRECT_URI=http://127.0.0.1:8000/calendar/google/callback
GOOGLE_CALENDAR_TIMEZONE=America/Sao_Paulo
GOOGLE_CALENDAR_EVENT_DURATION_MINUTES=60

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

## Testes e verificacoes

Frontend:

```powershell
cd Nutrinow_Frontend
npm run lint
npm test
npm run build
```

Backend:

```powershell
cd NutriNow_BackEnd
python -m unittest discover tests
python -m compileall .
```

## Deploy no Render em um unico Web Service

Para o backend tambem servir o frontend estatico, crie um servico do tipo **Web Service** no Render e use:

```text
Root Directory: deixe vazio
Build Command: bash NutriNow_BackEnd/render-build.sh
Start Command: gunicorn --chdir NutriNow_BackEnd App:app
```

O script `render-build.sh` instala as dependencias Python, instala/prepara o frontend e gera `Nutrinow_Frontend/dist/`. O Flask serve esse `dist/` automaticamente pela mesma URL do backend.

Nao configure **Publish Directory** nesse caso. Publish Directory e apenas para **Static Site** separado. Deixar o Root Directory vazio tambem faz mudancas no frontend dispararem deploy automatico.
