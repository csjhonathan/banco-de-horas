// Auditoria do MCP/OAuth (como no Pista Livre): quem, qual app, IP, user
// agent, entrada e saída completas. Segredos (código, tokens, verifier) nunca
// entram — aparecem como "***". Retenção de 90 dias (índice TTL).
import { randomUUID } from "node:crypto";
import { database } from "@/lib/db";

export interface AuditEntry {
  _id: string;
  channel: "mcp" | "oauth";
  method: string;
  tool?: string | null;
  username?: string | null;
  clientId?: string | null;
  grantId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  input?: unknown;
  output?: unknown;
  ok: boolean;
  error?: string | null;
  durationMs: number;
  createdAt: Date;
}

const RETENCAO_S = 90 * 24 * 3600;
/** Saídas enormes (extrato de um ano…) ficam cortadas na auditoria. */
const MAX_TEXT = 20_000;

const globalForAudit = globalThis as unknown as { _mcpAuditIndexes?: Promise<void> };

async function coll() {
  const c = (await database()).collection<AuditEntry>("mcp_audit");
  globalForAudit._mcpAuditIndexes ??= Promise.all([
    c.createIndex({ createdAt: 1 }, { expireAfterSeconds: RETENCAO_S }),
    c.createIndex({ username: 1, createdAt: -1 }),
  ])
    .then(() => undefined)
    .catch((e) => {
      globalForAudit._mcpAuditIndexes = undefined;
      console.error("[mcp] índices da auditoria", e);
    });
  await globalForAudit._mcpAuditIndexes;
  return c;
}

function clip(value: unknown): unknown {
  if (value === undefined) return undefined;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text && text.length > MAX_TEXT) return `${text.slice(0, MAX_TEXT)}… (cortado, ${text.length} caracteres)`;
  return value;
}

/** Grava uma linha de auditoria. Nunca derruba a chamada auditada. */
export async function audit(entry: Omit<AuditEntry, "_id" | "createdAt" | "durationMs"> & { durationMs?: number }) {
  try {
    await (await coll()).insertOne({
      ...entry,
      input: clip(entry.input),
      output: clip(entry.output),
      durationMs: entry.durationMs ?? 0,
      _id: randomUUID(),
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("[mcp] auditoria", e);
  }
}

/** Últimas chamadas da pessoa (pra tela de integrações). */
export async function recentAudit(username: string, limit = 30) {
  return (await coll())
    .find({ username }, { projection: { input: 0, output: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
