# Banco de Horas

Controle de **banco de horas** para quem usa o **Clockify**. O app **lê** as horas do
Clockify (importação por período, sincronização de hoje e webhook em tempo real),
compara com a sua **meta de jornada** e mostra o **saldo acumulado** mês a mês.

> A integração com o Clockify é **somente leitura** — o app nunca escreve de volta.

## Stack

- **Next.js (App Router)** full-stack + TypeScript — API em `app/api/*` e front no mesmo projeto.
- **Tailwind CSS + shadcn/ui**, organizados em **Atomic Design** (`components/{ui,molecules,organisms}`).
- **MongoDB** (local via Docker ou **Atlas**).
- **Auth.js (NextAuth v5)** — login por usuário/senha (`scrypt`+salt), sessão em cookie httpOnly.
- Deploy pensado pra **Vercel** (um único deploy).

## Rodando localmente

```bash
cp .env.example .env      # preencha MONGO_URI e AUTH_SECRET
npx auth secret           # gera e sugere um AUTH_SECRET (ou: openssl rand -base64 32)

make mongo                # sobe um MongoDB local (docker) — ou use o Atlas na MONGO_URI
npm install
npm run dev               # http://localhost:3000
```

Crie uma conta na tela de login, depois cadastre a sua **chave de API do Clockify** em
**Clockify → Integração** e importe/sincronize as horas.

## Variáveis de ambiente

| Var | Obrigatória | Descrição |
|-----|:---:|-----------|
| `MONGO_URI` | ✅ | Conexão do MongoDB (local ou Atlas). |
| `AUTH_SECRET` | ✅ | Segredo que assina a sessão (`npx auth secret`). |
| `DEFAULT_TZ` | — | Fuso p/ agrupar as horas por dia (padrão `America/Sao_Paulo`). |
| `ALLOW_REGISTER` | — | `false` fecha o cadastro de novos usuários. |
| `WEBHOOK_URL` | — | URL pública do webhook (na Vercel é deduzida do request). |
| `CLOCKIFY_WEBHOOK_SECRET` | — | Fallback global de signing secret (normalmente não precisa). |

A chave da API do Clockify **não** vai no `.env` — cada usuário cadastra a dele pela tela.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure `MONGO_URI` (Atlas) e `AUTH_SECRET` em *Environment Variables*.
3. Deploy. O webhook do Clockify usa a própria URL do deploy
   (`https://SEU-APP.vercel.app/api/clockify/webhook`).

## Como funciona o saldo

- A **meta diária** (`metaDiaSec`) é por usuário (6h, 8h…). Nada é hardcoded.
- **Dia útil que já passou sem lançamento conta como débito** (−meta). Hoje e o futuro
  só contam se você lançar.
- Meses podem ser **consolidados** (saldo fechado) e recalibrados manualmente.
- Feriados/folgas oficiais de 2026 já vêm carregados e são editáveis.

Toda a lógica de saldo vive em `lib/horas.ts` (funções puras).
