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

**Next.js (App Router) full-stack** — um único deploy (pensado pra Vercel):

- **Backend:** Route Handlers em `app/api/*` (runtime Node). Sem Express.
- **Frontend:** React + TypeScript no mesmo projeto, **Tailwind + shadcn/ui**,
  organizado em **Atomic Design**.
- **Banco:** MongoDB (local via docker-compose **ou** Atlas — troca só a `MONGO_URI`).
  Client cacheado num global (`lib/db.ts`) para sobreviver ao serverless.
- **Auth:** **Auth.js (NextAuth v5)**, provider **Credentials** reusando o esquema de
  senha do app original (`scrypt`+salt em `lib/password.ts`). Sessão JWT em cookie
  httpOnly gerenciado pelo NextAuth. Config "split": `auth.config.ts` (edge-safe, usado
  no `middleware.ts`) + `auth.ts` (Node, com o provider).

### Estrutura

```
app/
  layout.tsx  globals.css            layout raiz + tema (paleta original em CSS vars)
  login/page.tsx                     server: checa sessão + ALLOW_REGISTER
  page.tsx                           server: exige sessão, renderiza <Dashboard/>
  api/
    auth/[...nextauth]/route.ts      handlers do NextAuth
    auth/register/route.ts           cria usuário (scrypt) — respeita ALLOW_REGISTER
    me/route.ts                      username + clockify público + webhookUrl
    state/route.ts   reset/route.ts  estado do banco de horas (GET/PUT, reset)
    clockify/config|sync|webhook     integração (SOMENTE LEITURA)
    health/route.ts
auth.ts  auth.config.ts  middleware.ts
lib/
  db.ts        Mongo (cache serverless) + acesso por usuário
  password.ts  scrypt + salt (hash/verify)
  clockify.ts  cliente Clockify SOMENTE LEITURA (verify/syncRange/recomputeDay/webhook)
  seed.ts      estado inicial (feriados 2026) + migração + validState
  horas.ts     LÓGICA DE SALDO (funções puras: saldoMes, carryIn, diasContabilizados…)
  user.ts      helpers de Clockify público / webhookUrl / secrets
  api.ts       cliente HTTP do front (mesma origem)
  csv.ts       parser do CSV de Relatório Detalhado do Clockify
  utils.ts     cn()
hooks/
  useBancoDeHoras.ts  estado central (usuário, db, mutações, sync, auto-refresh)
  usePersistence.ts   save otimista com debounce
  useAutoRefresh.ts   refresh encadeado sem sobreposição
  useBackup.ts        export/import (JSON+CSV) e reset
components/            Atomic Design
  ui/                  ATOMS = shadcn (button, input, label, card, dialog, tabs)
  molecules/           SaldoValue, StatTile, TimeInput, DayRow, MonthNav, SecretRow…
  organisms/           TopBar, HeroSaldo, MonthCard, OpenMonthView, ClosedMonthView,
                       LogForm, DayTable, FeriadosPanel, LoginForm, Dashboard,
                       dialogs/{Jornada,Import,Clockify}Dialog
```

> **Atomic Design é obrigatório aqui.** shadcn/ui é a camada de **atoms**; componha
> **molecules** e **organisms** em vez de criar "god-files". A lógica de estado mora
> em `hooks/`, não dentro dos componentes.

## Comandos

```bash
npm install
npm run dev        # Next em dev (hot reload) — http://localhost:3000
npm run build      # tsc (via next) + build de produção
npm run start      # sobe o build
npm run lint       # eslint (next lint)
make mongo         # sobe só o MongoDB local (docker) em background
```

**Validação de sintaxe/tipos** (o Node local do dono está com o nvm quebrado — use Docker):
```bash
docker run --rm -v "$PWD":/app -w /app node:20-alpine \
  sh -c 'npm install --no-audit --no-fund && npx tsc --noEmit'
```

## Modelo de dados

Uma coleção `usuarios`, um documento por usuário (inalterado da versão anterior):

```
{ _id: <username>, salt, hash, createdAt, updatedAt,
  clockify: { apiKey, workspaceId, userId, name, email,
              webhookSecrets: { upd, new, del } } | null,
  data: <estado do banco de horas> }
```

`data` (o estado, também usado no backup/restore):
```
{ feriadosVersion,
  jornadas: [{desde:"AAAA-MM-DD", metaDiaSec, diasSemana:[1..5]}],  // vigências (fonte da verdade)
  metaDiaSec, diasSemana: [1..5],                                   // espelho da vigência de hoje (compat)
  fechados: [{ym, dias, trab, metaSec?}],                          // metaSec = meta congelada no fechamento
  registros: {"AAAA-MM-DD": segundos}, feriados: {"AAAA-MM-DD": nome},
  atestados: {"AAAA-MM-DD": segundos}, presencial: {"AAAA-MM-DD": true},
  ferias: {"AAAA-MM-DD": true},
  escritorio: { lat, lng, raioM, label } | null }
```

## Pontos não óbvios (leia antes de mexer)

- **Jornada tem HISTÓRICO (`state.jornadas`)** — lista de vigências
  `{desde, metaDiaSec, diasSemana}` ordenada por `desde`. É a **fonte da verdade** do
  cálculo: cada dia usa `jornadaDe(state, dia)` = a última vigência cujo `desde <= dia`.
  Serve pra jornada que muda no tempo (ex.: promoção 6h→8h; os dias sob 6h contam 6h,
  os sob 8h contam 8h). **Nunca** derive `DAY`/dias direto de `state.metaDiaSec` no
  cálculo — `metaDia`/`isUtil` já roteiam pela vigência do dia. `metaDiaSec`/`diasSemana`
  no topo do state são só **espelho da vigência de hoje** (rótulo da TopBar + compat de
  backup antigo); quem escreve jornadas (`setJornadas` no hook) mantém o espelho em dia.
- **Dias úteis vêm da vigência do dia** (`diasSemana`, 0=dom…6=sáb), **não** "seg–sex"
  fixo — `isUtil` checa esse conjunto + feriados. Meta do mês = **soma dia a dia**
  (`metaMesSec`), não `dias × metaDiaSec`, pra aguentar virada de vigência no meio do mês.
- **Meses fechados congelam a meta**: `MesFechado.metaSec` (opcional). `fechadoMeta` usa
  esse valor se presente; senão deriva de `dias × jornada vigente no início do mês` —
  nunca pela jornada de hoje. `migrate` constrói `jornadas` a partir do espelho legado.
- **Atestado credita horas no dia**: `metaEfetiva = max(0, metaDia − atestado)`. O saldo
  usa `metaEfetiva`, então atestado abate a meta do dia (da vigência daquele dia) mas
  nunca vira crédito sozinho.
- **Férias** é um flag por dia (`ferias[dia]=true`) — dia de férias vira **não útil**
  (`isUtil` também exclui `isFerias`), então não conta meta nem gera débito, como um
  feriado pessoal. O fluxo (`FeriasPanel`) adiciona/remove por **período** (intervalo de
  datas): `addFerias`/`removeFerias` no hook expandem o range com `rangeDias`; a listagem
  reagrupa dias contíguos com `agruparPeriodos`. Trabalhar num dia de férias (registro do
  Clockify) vira crédito puro (meta 0).
- **Presencial** é um flag por dia (`presencial[dia]=true`) — só marca ida ao escritório,
  não afeta saldo. Check-in por GPS: `escritorio` (lat/lng/raio) + `checkIn()` no hook
  (haversine `distMeters`); geocoding de endereço via `/api/geocode` (Nominatim/OSM, sem
  chave). Nada roda em segundo plano — a posição só é lida no clique.
- **Open Graph**: `app/opengraph-image.tsx` gera o card de preview (WhatsApp lê `og:image`);
  `metadataBase` vem de `VERCEL_PROJECT_PRODUCTION_URL`. Mudou de domínio? Redeploy + o
  WhatsApp cacheia por URL.
- **Dia útil que já passou sem lançamento conta como −meta** (débito). Hoje e futuro
  só contam se lançados. É o que faz a "Meta do mês" e o saldo baterem. Ver
  `diasContabilizados`/`saldoMes` em `lib/horas.ts`.
- **Clockify é a fonte da verdade na leitura**: apagar um registro no app é só local;
  um sync que cubra o dia pode trazê-lo de volta.
- **Webhook**: roteado pelo `workspaceId`+`userId` do payload; assinatura validada
  contra as `webhookSecrets` **do usuário** (fallback global em `CLOCKIFY_WEBHOOK_SECRET`).
  Precisa de URL pública; a URL é deduzida do request (ou de `WEBHOOK_URL`).
- **Auto-refresh**: o front pede "hoje" ao backend a cada 60s (`useAutoRefresh`,
  encadeado, sem sobreposição) e só aplica se não estiver atrapalhando o usuário
  (`canRun` em `useBancoDeHoras`). Não há timer no backend.
- **Persistência otimista** (`usePersistence`): mutações do usuário chamam `commit`
  (agenda save com debounce); dados vindos do servidor usam `replaceFromServer` (não
  re-salvam).
- **Env essenciais**: `MONGO_URI` e `AUTH_SECRET` (ver `.env.example`). A chave do
  Clockify **não** vai no `.env` — cada usuário cadastra a dela pela tela.

## Deploy

- **Vercel**: importar o repo; setar `MONGO_URI` (Atlas) e `AUTH_SECRET` nas env vars.
  Deploy único (front + API). O webhook usa a própria URL do deploy.
- Qualquer host que rode Next também serve (Railway/Render/Fly). `trustHost: true`
  já está ligado para funcionar atrás de proxy.

## Follow-ups / Roadmap

- [ ] Testes (Vitest/RTL) para `lib/horas.ts` (lógica de saldo) e para as API routes.
- [ ] Índice no Mongo para `clockify.workspaceId`+`clockify.userId` (rota do webhook).
