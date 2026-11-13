// Escritas do MCP em DOIS PASSOS (como no Pista Livre): a ferramenta de
// escrita NÃO grava — guarda a mudança como ação pendente e devolve a prévia +
// um token; só `confirmar_acao` com o token grava. Token de uso único, 10 min,
// preso à mesma autorização (app + pessoa); só o hash fica no banco.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { database, patchState } from "@/lib/db";

const TTL_MS = 10 * 60 * 1000;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export interface Quem {
  username: string;
  grantId: string;
  clientId: string;
}

/** Mudança pontual no estado: chaves de `data` (ex.: "registros.2026-11-03"). */
export interface Patch {
  set?: Record<string, unknown>;
  unset?: string[];
}

interface AcaoDoc {
  _id: string;
  tokenHash: string;
  username: string;
  grantId: string;
  tool: string;
  resumo: string;
  patch: Patch;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  createdAt: Date;
  expiresAt: Date;
  doneAt?: Date;
}

const g = globalThis as unknown as { _mcpAcoesIdx?: Promise<void> };

async function coll() {
  const c = (await database()).collection<AcaoDoc>("mcp_acoes");
  g._mcpAcoesIdx ??= Promise.all([
    c.createIndex({ tokenHash: 1 }, { unique: true }),
    c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 24 * 3600 }),
  ])
    .then(() => undefined)
    .catch((e) => {
      g._mcpAcoesIdx = undefined;
      console.error("[mcp] índices das ações", e);
    });
  await g._mcpAcoesIdx;
  return c;
}

/** Guarda a mudança e devolve o token de confirmação (o que vai pro modelo). */
export async function proporAcao(quem: Quem, tool: string, resumo: string, patch: Patch) {
  const token = `bhx_${randomBytes(24).toString("base64url")}`;
  const now = new Date();
  await (await coll()).insertOne({
    _id: randomUUID(),
    tokenHash: sha256(token),
    username: quem.username,
    grantId: quem.grantId,
    tool,
    resumo,
    patch,
    status: "PENDING",
    createdAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
  });
  return {
    token_de_confirmacao: token,
    expira_em: "10 minutos",
    proximo_passo:
      'NADA foi gravado ainda. Mostre esta prévia à pessoa, peça um "sim" explícito e só então chame confirmar_acao com o token_de_confirmacao.',
  };
}

/** Executa a ação pendente (uso único, atômico). Lança Error com a mensagem pro modelo. */
export async function confirmarAcao(token: string, quem: Quem) {
  const c = await coll();
  const acao = await c.findOneAndUpdate(
    {
      tokenHash: sha256(token),
      status: "PENDING",
      username: quem.username,
      grantId: quem.grantId,
      expiresAt: { $gt: new Date() },
    },
    { $set: { status: "RUNNING" } },
    { returnDocument: "after" },
  );
  if (!acao) throw new Error("Token inválido, expirado, já usado ou de outra autorização. Gere a prévia de novo.");
  try {
    await patchState(quem.username, acao.patch);
    await c.updateOne({ _id: acao._id }, { $set: { status: "DONE", doneAt: new Date() } });
    return { tool: acao.tool, resumo: acao.resumo };
  } catch (e) {
    await c.updateOne({ _id: acao._id }, { $set: { status: "FAILED" } });
    throw e;
  }
}
