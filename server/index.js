'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');

const db = require('./db');
const auth = require('./auth');
const { seed, migrate } = require('./seed');
const clockify = require('./clockify');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ALLOW_REGISTER = process.env.ALLOW_REGISTER !== 'false';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const DEFAULT_TZ = process.env.DEFAULT_TZ || 'America/Sao_Paulo';

app.set('trust proxy', true); // respeita x-forwarded-proto (ngrok/proxy)
app.use(express.json({ limit: '4mb' }));
app.use(express.static(PUBLIC_DIR));

const wrap = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.error('[api]', err.message);
  res.status(err.status || 400).json({ error: err.message });
});

// URL publica do app: WEBHOOK_URL do .env tem prioridade; senao deriva
// de como o cliente acessou (funciona com ngrok, dominio proprio, etc.).
function publicBase(req) {
  if (WEBHOOK_URL) return WEBHOOK_URL.replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}
function webhookUrlFor(req) {
  return `${publicBase(req)}/api/clockify/webhook`;
}

function credsFrom(user) {
  const c = user.clockify || {};
  return { apiKey: c.apiKey, workspaceId: c.workspaceId, userId: c.userId, tz: DEFAULT_TZ };
}

// webhookSecrets pode ser objeto {upd,new,del} (novo) ou array (legado).
function secretList(ws) {
  if (!ws) return [];
  return Array.isArray(ws) ? ws.filter(Boolean) : Object.values(ws).filter(Boolean);
}
function slotsOf(ws) {
  if (!ws || Array.isArray(ws)) return { upd: false, new: false, del: false };
  return { upd: !!ws.upd, new: !!ws.new, del: !!ws.del };
}

function validState(s) {
  return (
    s &&
    typeof s === 'object' &&
    typeof s.registros === 'object' &&
    Array.isArray(s.fechados) &&
    typeof s.feriados === 'object'
  );
}

/* ------------------------------------------------------------------ *
 *  AUTH                                                              *
 * ------------------------------------------------------------------ */

app.post('/api/auth/register', wrap(async (req, res) => {
  if (!ALLOW_REGISTER) return res.status(403).json({ error: 'registro desabilitado' });
  const { username, password } = req.body || {};
  const u = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(u)) {
    return res.status(422).json({ error: 'usuario invalido (3-32, letras/numeros/._-)' });
  }
  if (!password || String(password).length < 6) {
    return res.status(422).json({ error: 'senha muito curta (min. 6)' });
  }
  if (await db.getUser(u)) return res.status(409).json({ error: 'usuario ja existe' });

  const { salt, hash } = auth.hashPassword(String(password));
  await db.createUser({
    _id: u,
    salt,
    hash,
    createdAt: new Date(),
    clockify: null,
    data: seed(),
  });
  auth.setSessionCookie(res, auth.signToken({ sub: u }));
  res.json({ username: u });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const u = String(username || '').trim().toLowerCase();
  const user = await db.getUser(u);
  if (!user || !auth.verifyPassword(String(password || ''), user.salt, user.hash)) {
    return res.status(401).json({ error: 'usuario ou senha invalidos' });
  }
  auth.setSessionCookie(res, auth.signToken({ sub: u }));
  res.json({ username: u });
}));

app.post('/api/auth/logout', (_req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', wrap(async (req, res) => {
  const token = auth.parseCookies(req)[auth.COOKIE];
  const payload = auth.verifyToken(token);
  if (!payload || !payload.sub) return res.status(401).json({ error: 'nao autenticado' });
  const user = await db.getUser(payload.sub);
  if (!user) return res.status(401).json({ error: 'nao autenticado' });
  res.json({
    username: user._id,
    clockify: clockifyPublic(user),
    webhookUrl: webhookUrlFor(req),
    allowRegister: ALLOW_REGISTER,
  });
}));

function clockifyPublic(user) {
  const c = user.clockify;
  if (!c || !c.apiKey) return { configured: false };
  return {
    configured: true,
    workspaceId: c.workspaceId,
    name: c.name,
    email: c.email,
    apiKeySaved: !!c.apiKey,
    webhookSlots: slotsOf(c.webhookSecrets),
    webhookSecretsCount: secretList(c.webhookSecrets).length,
    webhookConfigured: secretList(c.webhookSecrets).length > 0,
  };
}

/* ------------------------------------------------------------------ *
 *  ESTADO (protegido)                                                *
 * ------------------------------------------------------------------ */

app.get('/api/state', auth.requireAuth, wrap(async (req, res) => {
  let state = await db.getState(req.username);
  if (!state) {
    state = seed();
    await db.putState(req.username, state);
  } else if (migrate(state)) {
    await db.putState(req.username, state);
  }
  res.json(state);
}));

app.put('/api/state', auth.requireAuth, wrap(async (req, res) => {
  if (!validState(req.body)) return res.status(422).json({ error: 'Estado invalido.' });
  migrate(req.body);
  const saved = await db.putState(req.username, req.body);
  res.json(saved);
}));

app.post('/api/reset', auth.requireAuth, wrap(async (req, res) => {
  const fresh = seed();
  await db.putState(req.username, fresh);
  res.json(fresh);
}));

/* ------------------------------------------------------------------ *
 *  CLOCKIFY — config por usuario                                     *
 * ------------------------------------------------------------------ */

app.get('/api/clockify/config', auth.requireAuth, wrap(async (req, res) => {
  const user = await db.getUser(req.username);
  res.json({ ...clockifyPublic(user), webhookUrl: webhookUrlFor(req) });
}));

app.put('/api/clockify/config', auth.requireAuth, wrap(async (req, res) => {
  const { apiKey, workspaceId, webhookSecrets } = req.body || {};
  const user = await db.getUser(req.username);
  const existing = user && user.clockify ? user.clockify : null;

  let creds;
  if (apiKey && String(apiKey).trim().length >= 10) {
    // testa a conexao (estilo "test connection" do Jira)
    const info = await clockify.verify(String(apiKey).trim(), (workspaceId || '').trim() || undefined);
    creds = {
      apiKey: String(apiKey).trim(),
      workspaceId: info.workspaceId,
      userId: info.userId,
      name: info.name,
      email: info.email,
    };
  } else if (existing) {
    creds = { ...existing }; // atualizando so o webhook, mantem a chave
  } else {
    return res.status(422).json({ error: 'Informe uma chave de API do Clockify valida.' });
  }

  // secrets por slot (upd/new/del). Preencher um slot mantem os outros.
  if (webhookSecrets && typeof webhookSecrets === 'object') {
    const base = (existing && existing.webhookSecrets && !Array.isArray(existing.webhookSecrets))
      ? { ...existing.webhookSecrets } : {};
    for (const k of ['upd', 'new', 'del']) {
      const v = webhookSecrets[k];
      if (v != null && String(v).trim()) base[k] = String(v).trim();
    }
    creds.webhookSecrets = base;
  } else if (existing) {
    creds.webhookSecrets = existing.webhookSecrets; // mantem como estava
  }

  await db.updateUser(req.username, { clockify: creds });
  res.json({
    configured: true,
    workspaceId: creds.workspaceId,
    name: creds.name,
    email: creds.email,
    apiKeySaved: true,
    webhookSlots: slotsOf(creds.webhookSecrets),
    webhookSecretsCount: secretList(creds.webhookSecrets).length,
    webhookConfigured: secretList(creds.webhookSecrets).length > 0,
  });
}));

app.delete('/api/clockify/config', auth.requireAuth, wrap(async (req, res) => {
  await db.updateUser(req.username, { clockify: null });
  res.json({ configured: false });
}));

/* ------------------------------------------------------------------ *
 *  CLOCKIFY — sync (pull) e push (mao dupla)                         *
 * ------------------------------------------------------------------ */

app.post('/api/clockify/sync', auth.requireAuth, wrap(async (req, res) => {
  const user = await db.getUser(req.username);
  if (!user.clockify) return res.status(400).json({ error: 'Clockify nao configurado.' });
  const { start, end } = req.body || {};
  const state = await db.getState(req.username);
  const result = await clockify.syncRange(credsFrom(user), { start, end });
  for (const [day, sec] of Object.entries(result.registros)) state.registros[day] = sec;
  await db.putState(req.username, state);
  res.json({ state, days: result.days, count: result.count, range: result.range });
}));

app.post('/api/clockify/push', auth.requireAuth, wrap(async (req, res) => {
  const user = await db.getUser(req.username);
  if (!user.clockify) return res.status(400).json({ error: 'Clockify nao configurado.' });
  const { date } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(422).json({ error: 'Informe date no formato AAAA-MM-DD.' });
  }
  const state = await db.getState(req.username);
  const seconds = state.registros[date] || 0;
  const result = await clockify.pushDay(credsFrom(user), date, seconds);
  res.json({ date, seconds, result });
}));

/* ------------------------------------------------------------------ *
 *  CLOCKIFY — webhook (Clockify -> banco). Roteia pelo usuario dono. *
 *  Requer URL publica (ngrok/cloudflared em dev — ver WEBHOOK_URL).  *
 * ------------------------------------------------------------------ */

app.post('/api/clockify/webhook', wrap(async (req, res) => {
  const payload = req.body || {};

  // acha o dono pela conta Clockify (workspace + usuario do payload)
  const user = await db.findUserByClockify({
    workspaceId: payload.workspaceId,
    clockifyUserId: payload.userId,
  });
  if (!user) return res.json({ ok: true, skipped: 'sem usuario correspondente' });

  // valida a assinatura: secrets do usuario (+ fallback global do .env).
  // O Clockify gera uma signing secret POR webhook e a manda no header
  // "clockify-signature". Sem nenhuma secret cadastrada = nao valida (dev).
  const userSecrets = secretList(user.clockify && user.clockify.webhookSecrets);
  const globalSecrets = (process.env.CLOCKIFY_WEBHOOK_SECRET || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const allowed = [...userSecrets, ...globalSecrets];
  if (allowed.length) {
    const sig = req.get('clockify-signature');
    if (!sig || !allowed.includes(sig)) {
      return res.status(401).json({ error: 'assinatura invalida' });
    }
  }

  const creds = credsFrom(user);
  const day = clockify.dayFromWebhook(payload, creds.tz);
  if (!day) return res.json({ ok: true, skipped: 'sem data' });

  const { seconds } = await clockify.recomputeDay(creds, day);
  const state = await db.getState(user._id);
  if (seconds > 0) state.registros[day] = seconds;
  else delete state.registros[day];
  await db.putState(user._id, state);

  console.log(`[webhook] ${user._id} · ${day} -> ${seconds}s`);
  res.json({ ok: true, day, seconds });
}));

/* ------------------------------------------------------------------ *
 *  saude + fallback                                                  *
 * ------------------------------------------------------------------ */

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

/* ------------------------------------------------------------------ *
 *  boot                                                              *
 * ------------------------------------------------------------------ */

async function main() {
  await db.connect();
  app.listen(PORT, () => {
    console.log(`[app] Banco de Horas no ar em http://localhost:${PORT}`);
    console.log(`[app] registro de usuarios: ${ALLOW_REGISTER ? 'aberto' : 'fechado'}`);
    if (WEBHOOK_URL) console.log(`[app] webhook publico: ${WEBHOOK_URL.replace(/\/$/, '')}/api/clockify/webhook`);
  });
}

main().catch((err) => {
  console.error('[app] falha ao iniciar:', err.message);
  process.exit(1);
});
