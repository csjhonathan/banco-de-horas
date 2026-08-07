# CLAUDE.md

Orientações para o Claude Code trabalhar neste projeto. Docs, commits e strings
de usuário em **português brasileiro** (padrão do projeto).

## O que é

**Banco de Horas** — app para controlar banco de horas de quem usa o **Clockify**.
O app **lê** as horas do Clockify (importação por período, sincronização de hoje e
webhook em tempo real), compara com a meta de jornada do usuário e mostra o **saldo
acumulado** mês a mês.

> Integração é **somente leitura**: o app **nunca** escreve de volta no Clockify.
> Não reintroduza escrita (push/criação/edição de time entries) — foi removido de
> propósito por segurança.

## Arquitetura

Monolito leve, sem build no front:

- **Backend:** Node + Express (`express`, `mongodb`, `dotenv`). Serve a API (`/api/*`)
  **e** o front estático na mesma porta/origem (sem CORS).
- **Frontend:** `public/index.html` — HTML/CSS/JS puro, tudo num arquivo só.
- **Banco:** MongoDB (local via docker-compose **ou** Atlas — troca só a `MONGO_URI`).
- **Auth:** sem libs — `crypto` nativo. Senha com `scrypt`+salt; sessão em cookie
  `httpOnly` assinado (HMAC). Ver `server/auth.js`.

### Arquivos

```
server/
  index.js     rotas Express + boot (app.listen)
  db.js        conexão Mongo (com retry) + acesso por usuário
  auth.js      senha (scrypt) + sessão (cookie assinado) + middleware requireAuth
  clockify.js  cliente Clockify SOMENTE LEITURA (verify / syncRange / recomputeDay / webhook)
  seed.js      estado inicial (feriados oficiais 2026) + migração
public/
  index.html   o app inteiro (render, wiring, dialogs, auto-refresh)
```

## Comandos

Roda tudo em Docker (o Makefile encapsula):

- `make dev` — sobe com **hot reload** (nodemon em `--legacy-watch`/polling; o inotify
  do Docker no WSL não propaga eventos de bind mount, por isso polling).
- `make up` / `make down` / `make logs` — produção local (app + Mongo).
- `make atlas` — sobe só o app (quando `MONGO_URI` aponta pro Atlas).
- `make clean` — derruba e **apaga** o volume do Mongo.

**Validação de sintaxe** (o Node local do dono está com o nvm quebrado no shell — use Docker):
```bash
docker run --rm -v "$PWD":/app -w /app node:20-alpine sh -c 'for f in server/*.js; do node --check "$f"; done'
# front: extrair o <script> do index.html e rodar node --check
```

## Modelo de dados

Uma coleção `usuarios`, um documento por usuário:

```
{ _id: <username>, salt, hash, createdAt,
  clockify: { apiKey, workspaceId, userId, name, email,
              webhookSecrets: { upd, new, del } } | null,
  data: <estado do banco de horas> }
```

`data` (o estado, também usado no backup/restore):
```
{ feriadosVersion, metaDiaSec, fechados: [{ym, dias, trab}], registros: {"AAAA-MM-DD": segundos}, feriados: {"AAAA-MM-DD": nome} }
```

## Pontos não óbvios (leia antes de mexer)

- **`DAY` (meta diária)** no front é sincronizado de `db.metaDiaSec` a cada render —
  jornada é **por usuário** (estagiário 6h, efetivado 8h, etc.). Não hardcode 8h.
- **Dia útil que já passou sem lançamento conta como −8h** (débito). Hoje e futuro
  só contam se lançados. É o que faz a "Meta do mês" e o saldo baterem. Ver
  `diasContabilizados`/`saldoMes` em `public/index.html`.
- **Clockify é a fonte da verdade na leitura**: apagar um registro no app é só local;
  um sync que cubra o dia pode trazê-lo de volta.
- **Webhook**: roteado pelo `workspaceId`+`userId` do payload; assinatura validada
  contra as `webhookSecrets` **do usuário** (fallback global opcional em
  `CLOCKIFY_WEBHOOK_SECRET`). Precisa de URL pública (ngrok/domínio) — a URL é
  deduzida do request (ou de `WEBHOOK_URL`).
- **Auto-refresh**: o front pede "hoje" ao backend a cada 60s (`setTimeout` encadeado,
  sem sobreposição) e só aplica se não estiver atrapalhando o usuário. Não há timer
  no backend.
- **Portas**: o container escuta sempre **3000**; `APP_PORT` é só a porta do host.
- **Env**: só `APP_PORT`, `MONGO_URI`, `SESSION_SECRET` são essenciais (ver
  `.env.example`). A chave do Clockify **não** vai no `.env` — cada usuário cadastra
  a dele pela tela.

## Follow-ups / Roadmap

- [ ] **Migrar para Rails (API) + React (SPA).** Transformar este monolito
      Express+HTML num backend **Rails somente-API** (mantendo a mesma modelagem:
      usuários, estado do banco de horas, integração Clockify de leitura, webhook)
      e um front **React** (Vite). Seguir o padrão do workspace: **Rails só como
      API, nunca front**; front em React/TS. Manter a integração **somente leitura**
      com o Clockify. Avaliar Postgres no lugar do Mongo nessa migração (o estado é
      relacional o suficiente: usuários, registros diários, feriados, meses fechados).
- [ ] Deploy (Render/Railway/Fly rodam o Dockerfile como está; Vercel exigiria
      adapter serverless + cache de conexão + Atlas).
