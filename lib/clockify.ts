// Integração Clockify (SOMENTE LEITURA) — credenciais por usuário.
// O app LÊ as horas do Clockify; nunca escreve de volta.
// Portado de server/clockify.js sem mudar o comportamento.
import type { RunningEntry } from "@/types";

const BASE = "https://api.clockify.me/api/v1";
const DEFAULT_TZ = process.env.DEFAULT_TZ || "America/Sao_Paulo";

export interface Creds {
  apiKey: string;
  workspaceId?: string;
  userId?: string;
  tz?: string;
}

async function cf(
  creds: { apiKey?: string },
  method: string,
  pathname: string,
  body?: unknown,
): Promise<any> {
  if (!creds || !creds.apiKey) {
    throw new Error("Chave do Clockify nao configurada. Cadastre em Integracoes.");
  }
  const res = await fetch(BASE + pathname, {
    method,
    headers: {
      "X-Api-Key": creds.apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("Chave do Clockify invalida (401).");
    throw new Error(`Clockify ${method} ${pathname} → ${res.status} ${txt}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Valida a chave e resolve user/workspace. Retorna dados para salvar. */
export async function verify(apiKey: string, workspaceId?: string) {
  const user = await cf({ apiKey }, "GET", "/user");
  const workspace = workspaceId || user.activeWorkspace;
  if (!workspace) {
    throw new Error("Sem workspace. Informe o Workspace ID nas configuracoes.");
  }
  return {
    userId: user.id as string,
    workspaceId: workspace as string,
    name: user.name as string,
    email: user.email as string,
  };
}

function ctxOf(creds: Creds) {
  if (!creds.userId || !creds.workspaceId) {
    throw new Error("Integracao Clockify incompleta — reconfigure a chave.");
  }
  return { userId: creds.userId, workspace: creds.workspaceId };
}

/* ---- helpers de tempo ---- */
function parseISODur(dur?: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(dur || "");
  if (!m) return 0;
  return +(m[1] || 0) * 3600 + +(m[2] || 0) * 60 + Math.round(+(m[3] || 0));
}

function entrySeconds(entry: any): number {
  const ti = entry.timeInterval || {};
  if (ti.start && ti.end) {
    return Math.max(0, Math.round((+new Date(ti.end) - +new Date(ti.start)) / 1000));
  }
  return parseISODur(ti.duration);
}

export function localDate(iso: string, tz?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || DEFAULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function todayLocal(tz?: string): string {
  return localDate(new Date().toISOString(), tz);
}

/* ---- leitura de entradas ---- */
async function fetchEntries(creds: Creds, startDate: string, endDate: string) {
  const { userId, workspace } = ctxOf(creds);
  const startIso = `${startDate}T00:00:00Z`;
  const endIso = `${endDate}T23:59:59Z`;
  const all: any[] = [];
  const pageSize = 200;
  for (let page = 1; page <= 100; page++) {
    const q =
      `?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}` +
      `&page-size=${pageSize}&page=${page}`;
    const batch = await cf(
      creds,
      "GET",
      `/workspaces/${workspace}/user/${userId}/time-entries${q}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

async function aggregate(creds: Creds, startDate: string, endDate: string) {
  const entries = await fetchEntries(creds, startDate, endDate);
  const registros: Record<string, number> = {};
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

/* ---- API pública ---- */
export async function syncRange(
  creds: Creds,
  { start, end }: { start?: string; end?: string } = {},
) {
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

export async function recomputeDay(creds: Creds, day: string) {
  const { registros } = await aggregate(creds, day, day);
  return { day, seconds: registros[day] || 0 };
}

/**
 * Cronômetro em andamento do usuário (time entry sem `end`). SOMENTE LEITURA.
 * Usa `in-progress=true` (só timers rodando) + `hydrated=true` (expande
 * project/task em objetos). Retorna null se não houver nada rodando.
 */
export async function runningEntry(creds: Creds): Promise<RunningEntry | null> {
  const { userId, workspace } = ctxOf(creds);
  const q = "?in-progress=true&hydrated=true&page-size=1";
  const batch = await cf(
    creds,
    "GET",
    `/workspaces/${workspace}/user/${userId}/time-entries${q}`,
  );
  const e = Array.isArray(batch) ? batch[0] : null;
  const ti = e?.timeInterval;
  // Só conta como "rodando" se tem início e NÃO tem fim.
  if (!e || !ti?.start || ti?.end) return null;
  const elapsedSec = Math.max(0, Math.round((Date.now() - +new Date(ti.start)) / 1000));
  return {
    id: String(e.id),
    description: e.description || "",
    projectName: e.project?.name ?? null,
    projectColor: e.project?.color ?? null,
    taskName: e.task?.name ?? null,
    billable: !!e.billable,
    start: ti.start,
    elapsedSec,
  };
}

export function dayFromWebhook(payload: any, tz?: string): string | null {
  const iso = payload?.timeInterval?.start || payload?.start;
  if (!iso) return null;
  return localDate(iso, tz);
}
