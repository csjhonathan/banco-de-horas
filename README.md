# Banco de Horas

Controle de **banco de horas** para quem usa o **[Clockify](https://clockify.me)** no dia a dia.

Você registra o trabalho no Clockify como já faz; este app puxa essas horas
(por importação ou em tempo real via webhook), compara com a sua meta de jornada
e mostra o **saldo acumulado** — quanto você está de crédito ou débito, mês a mês.

> Feito para quem gerencia jornada de trabalho no Clockify (efetivado, estagiário,
> PJ com meta de horas...). Cada pessoa cadastra a própria chave do Clockify e
> define a própria jornada.

## O que faz

- **Login por usuário** — cada um com o seu banco de horas e as suas credenciais.
- **Jornada configurável** (`HH:MM` por dia útil) — serve para 6h/dia, 8h/dia, 44h/semana, etc.
- **Saldo real** — dia útil que passou sem lançamento conta como **−8h** (débito), então a meta acumulada nunca "infla". Mostra meta do mês, saldo do mês e o que veio acumulado dos meses anteriores.
- **Feriados & folgas** — já vem com os feriados oficiais de 2026; dá para adicionar/remover.
- **Clockify (somente leitura — o app nunca escreve de volta no seu time tracking):**
  - **Importar por período** — modal com presets (hoje, esta semana, este mês, este ano...) ou intervalo custom.
  - **Sincronizar hoje** — um clique puxa o dia atual.
  - **Importar CSV** — aceita o *Relatório de Tempo Detalhado* exportado do Clockify.
  - **Webhook em tempo real** — self-service pela tela (URL + guia + signing secrets por evento).
- **Auto-refresh** — a aba pede "hoje" ao backend a cada 1 min e atualiza sozinha (sem atrapalhar o que você está digitando).
- **Backup / importar / reiniciar** o seu estado (JSON).

## Stack

Node + Express · MongoDB · HTML/CSS/JS puro (sem build) · Docker.
Autenticação com o `crypto` nativo (senha via `scrypt`, sessão em cookie assinado) — sem dependências de auth.

## Requisitos

- **Docker** e **Docker Compose**.
- (Opcional) uma conta no **Clockify** para a integração.

## Como rodar

```bash
git clone <url-do-repo> banco-de-horas
cd banco-de-horas
cp .env.example .env
# gere o segredo de sessão e cole em SESSION_SECRET no .env:
openssl rand -hex 32
```

### Desenvolvimento (com hot reload)

```bash
make dev
# ou, sem make:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Sobe o app + um MongoDB local. Acesse **http://localhost:3000**
(ou a porta que você definiu em `APP_PORT`).

### Produção

```bash
make up     # app + Mongo local, em background
make logs   # acompanha os logs
make down   # derruba
```

### Usando o MongoDB Atlas (sem Mongo local)

1. Cole a connection string em `MONGO_URI` no `.env` (`mongodb+srv://...`).
2. Suba só o app:

```bash
make atlas
```

> Se a porta 3000 estiver ocupada, troque `APP_PORT` no `.env`. Dentro do
> container o app sempre escuta 3000; `APP_PORT` é só a porta do host.

## Primeiro uso

1. Abra o app e clique em **Criar conta** (usuário + senha).
2. Clique na jornada no topo (**"8h/dia · 40h/semana"**) para ajustar as suas horas por dia.
3. Abra **Clockify**, cole a sua **API key** (Clockify → *Settings → API*) e clique em **Salvar e testar**.
4. Use **Importar do Clockify** (escolha o período) ou **Sincronizar hoje**.

### Webhook em tempo real (opcional)

Para o app atualizar no instante em que você para um relógio no Clockify, é preciso
que ele tenha uma **URL pública**. Em ambiente local, use um túnel:

```bash
ngrok http 3000        # ou a sua APP_PORT
```

Na tela **Clockify** do app, a **URL do endpoint** já aparece pronta. Copie e
registre em **Clockify → Settings → Webhooks** (o passo a passo está na própria
tela, em *"Como configurar no Clockify"*), depois cole as **signing secrets** de
cada evento nos campos correspondentes. Sem webhook, o *auto-refresh* de 1 min já
mantém o dia de hoje em dia.

## Variáveis de ambiente

Só o essencial precisa estar no `.env` (veja o `.env.example`):

| Variável | O quê | Padrão |
|---|---|---|
| `APP_PORT` | Porta do host | `3000` |
| `MONGO_URI` | Mongo local ou Atlas | Mongo do compose |
| `SESSION_SECRET` | Segredo dos cookies de sessão | *(gere um)* |
| `DEFAULT_TZ` | Fuso para agrupar horas por dia | `America/Sao_Paulo` |
| `ALLOW_REGISTER` | Deixa o cadastro aberto | `true` |

A chave do Clockify **não** fica no `.env` — cada usuário cadastra a dele pela tela.

## Comandos (Makefile)

| Comando | O quê |
|---|---|
| `make dev` | Sobe em dev com hot reload |
| `make up` | Sobe em produção (background) |
| `make atlas` | Sobe só o app (para usar com o Atlas) |
| `make logs` | Logs do app |
| `make down` | Derruba os containers |
| `make clean` | Derruba e **apaga** o volume do Mongo (perde os dados) |

## Estrutura

```
server/
  index.js     rotas Express + boot
  db.js        conexão Mongo (com retry) + acesso por usuário
  auth.js      senha (scrypt) + sessão (cookie assinado) + middleware
  clockify.js  cliente Clockify (leitura: importar / sincronizar / webhook)
  seed.js      estado inicial (feriados oficiais 2026) e migração
public/
  index.html   o app inteiro (HTML/CSS/JS)
```
