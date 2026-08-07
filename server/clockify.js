'use strict';

/* ------------------------------------------------------------------ *
 *  Integracao Clockify (mao dupla) — credenciais POR USUARIO.        *
 *  Toda funcao recebe `creds` = { apiKey, workspaceId, userId, tz }. *
 * ------------------------------------------------------------------ */

const BASE = 'https://api.clockify.me/api/v1';
const TAG = '[banco-de-horas]';
const DEFAULT_TZ = process.env.DEFAULT_TZ || 'America/Sao_Paulo';

async function cf(creds, method, pathname, body) {
  if (!creds || !creds.apiKey) {
    throw new Error('Chave do Clockify nao configurada. Cadastre em Integracoes.');
  }
  const res = await fetch(BASE + pathname, {
    method,
    headers: {
      'X-Api-Key': creds.apiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('Chave do Clockify invalida (401).');
    throw new Error(`Clockify ${method} ${pathname} → ${res.status} ${txt}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Valida a chave e resolve user/workspace. Retorna dados para salvar. */
async function verify(apiKey, workspaceId) {
  const user = await cf({ apiKey }, 'GET', '/user');
  const workspace = workspaceId || user.activeWorkspace;
  if (!workspace) {
    throw new Error('Sem workspace. Informe o Workspace ID nas configuracoes.');
  }
  return { userId: user.id, workspaceId: workspace, name: user.name, email: user.email };
}

function ctxOf(creds) {
  if (!creds.userId || !creds.workspaceId) {
    throw new Error('Integracao Clockify incompleta — reconfigure a chave.');
  }
  return { userId: creds.userId, workspace: creds.workspaceId };
}

/* ---- helpers de tempo ---- */
function parseISODur(dur) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(dur || '');
  if (!m) return 0;
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + Math.round(+(m[3] || 0));
}

function entrySeconds(entry) {
  const ti = entry.timeInterval || {};
  if (ti.start && ti.end) {
    return Math.max(0, Math.round((new Date(ti.end) - new Date(ti.start)) / 1000));
  }
  return parseISODur(ti.duration);
}

function localDate(iso, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || DEFAULT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function todayLocal(tz) {
  return localDate(new Date().toISOString(), tz);
}

/* ---- leitura de entradas ---- */
async function fetchEntries(creds, startDate, endDate) {
  const { userId, workspace } = ctxOf(creds);
  const startIso = `${startDate}T00:00:00Z`;
  const endIso = `${endDate}T23:59:59Z`;
  const all = [];
  const pageSize = 200;
  for (let page = 1; page <= 100; page++) {
    const q =
      `?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}` +
      `&page-size=${pageSize}&page=${page}`;
    const batch = await cf(creds, 'GET', `/workspaces/${workspace}/user/${userId}/time-entries${q}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

async function aggregate(creds, startDate, endDate) {
  const entries = await fetchEntries(creds, startDate, endDate);
  const registros = {};
  for (const e of entries) {
    const ti = e.timeInterval || {};
    if (!ti.start || !ti.end) continue;
    const sec = entrySeconds(e);
    if (sec <= 0) continue;
    const day = localDate(ti.start, creds.tz);
    registros[day] = (registros[day] || 0) + sec;
  }
  return { registros, count: entries.length };
}

/* ---- API publica ---- */
async function syncRange(creds, { start, end } = {}) {
  const today = todayLocal(creds.tz);
  const startDate = start || `${today.slice(0, 7)}-01`;
  const endDate = end || today;
  const { registros, count } = await aggregate(creds, startDate, endDate);
  return {
    registros,
    days: Object.keys(registros).length,
    count,
    range: { start: startDate, end: endDate },
  };
}

async function recomputeDay(creds, day) {
  const { registros } = await aggregate(creds, day, day);
  return { day, seconds: registros[day] || 0 };
}

async function pushDay(creds, day, seconds) {
  const { workspace } = ctxOf(creds);
  const entries = await fetchEntries(creds, day, day);

  const managed = entries.find((e) => (e.description || '').startsWith(TAG));
  const othersSec = entries
    .filter((e) => e !== managed)
    .reduce((a, e) => a + entrySeconds(e), 0);

  const target = Math.max(0, Math.round(seconds) - othersSec);

  if (target <= 0) {
    if (managed) {
      await cf(creds, 'DELETE', `/workspaces/${workspace}/time-entries/${managed.id}`);
      return { action: 'deleted', othersSec, target: 0 };
    }
    return { action: 'noop', othersSec, target: 0 };
  }

  const startIso = `${day}T09:00:00Z`;
  const endIso = new Date(new Date(startIso).getTime() + target * 1000).toISOString();
  const body = { start: startIso, end: endIso, description: `${TAG} ajuste manual` };

  if (managed) {
    await cf(creds, 'PUT', `/workspaces/${workspace}/time-entries/${managed.id}`, body);
    return { action: 'updated', id: managed.id, othersSec, target };
  }
  const created = await cf(creds, 'POST', `/workspaces/${workspace}/time-entries`, body);
  return { action: 'created', id: created.id, othersSec, target };
}

function dayFromWebhook(payload, tz) {
  const iso = payload?.timeInterval?.start || payload?.start;
  if (!iso) return null;
  return localDate(iso, tz);
}

module.exports = {
  verify,
  syncRange,
  recomputeDay,
  pushDay,
  dayFromWebhook,
  localDate,
  TAG,
};
