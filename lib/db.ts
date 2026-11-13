// Conexão com o MongoDB — com cache de client para sobreviver a hot reloads
// (dev) e reuso entre invocações serverless (Vercel). Acesso por usuário.
import { MongoClient, type Collection, type Db } from "mongodb";
import type { State, UserDoc } from "@/types";

const URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGO_DB || "banco_de_horas";
const COLL = process.env.MONGO_COLLECTION || "usuarios";

// Reaproveita a mesma promise de conexão entre invocações (serverless) e
// entre recompilações do Next em dev.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function clientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });
    globalForMongo._mongoClientPromise = client.connect();
  }
  return globalForMongo._mongoClientPromise;
}

/** O banco do app (outras coleções além de `usuarios`: OAuth/MCP). */
export async function database(): Promise<Db> {
  const client = await clientPromise();
  return client.db(DB_NAME);
}

async function users(): Promise<Collection<UserDoc>> {
  return (await database()).collection<UserDoc>(COLL);
}

/* ---- usuários ---- */
export async function getUser(username: string): Promise<UserDoc | null> {
  return (await users()).findOne({ _id: username });
}

export async function createUser(doc: UserDoc): Promise<UserDoc> {
  await (await users()).insertOne(doc);
  return doc;
}

export async function updateUser(
  username: string,
  set: Partial<UserDoc>,
): Promise<void> {
  await (await users()).updateOne({ _id: username }, { $set: set });
}

/** Acha o usuário dono de uma conta Clockify (para rotear webhooks). */
export async function findUserByClockify({
  workspaceId,
  clockifyUserId,
}: {
  workspaceId?: string;
  clockifyUserId?: string;
}): Promise<UserDoc | null> {
  const query: Record<string, string> = {};
  if (clockifyUserId) query["clockify.userId"] = clockifyUserId;
  if (workspaceId) query["clockify.workspaceId"] = workspaceId;
  if (!Object.keys(query).length) return null;
  return (await users()).findOne(query);
}

/* ---- estado (banco de horas) por usuário ---- */
export async function getState(username: string): Promise<State | null> {
  const u = await getUser(username);
  return u ? u.data : null;
}

/* ---- gravação com controle de versão (`State.rev`) ----
 * Ninguém sobrescreve o estado inteiro às cegas: a gravação só vale se a
 * versão no banco ainda for a que o escritor leu. Quem perde a corrida relê
 * (servidor) ou recebe 409 e reaplica a própria mudança (front, ver
 * `lib/rebase.ts`). Escritas pontuais (MCP) usam `patchState`. */

const revFilter = (rev: number) => (rev === 0 ? { $in: [0, null] } : rev);

/**
 * Grava `data` se a versão no banco ainda for `expectRev`; devolve o estado
 * salvo (com `rev` + 1) ou null em conflito.
 */
export async function putStateIf(username: string, expectRev: number, data: State): Promise<State | null> {
  const saved: State = { ...data, rev: expectRev + 1 };
  const res = await (await users()).updateOne(
    { _id: username, "data.rev": revFilter(expectRev) } as Record<string, unknown>,
    { $set: { data: saved, updatedAt: new Date() } },
  );
  return res.matchedCount === 1 ? saved : null;
}

/**
 * Ler → mudar → gravar com nova tentativa em conflito (sync, import, webhook,
 * migração). `mutate` deve ser pura e rápida (busque o Clockify ANTES). Se a
 * mudança não altera nada, não grava (nem soma versão).
 */
export async function updateState(
  username: string,
  mutate: (s: State) => void,
  init: () => State,
): Promise<State> {
  for (let i = 0; i < 5; i++) {
    const u = await getUser(username);
    if (!u) throw new Error("Usuário não encontrado.");
    const cur = u.data ?? init();
    const rev = cur.rev ?? 0;
    const next = structuredClone(cur);
    mutate(next);
    if (u.data && JSON.stringify(next) === JSON.stringify(cur)) return cur;
    const saved = await putStateIf(username, rev, next);
    if (saved) return saved;
  }
  throw new Error("O estado mudou várias vezes seguidas; tente de novo.");
}

/**
 * Escrita pontual (MCP): `$set`/`$unset` de chaves de `data` + versão + 1,
 * atômica, sem reescrever o resto. Ex.: set {"registros.2026-11-03": 28800}.
 */
export async function patchState(
  username: string,
  patch: { set?: Record<string, unknown>; unset?: string[] },
): Promise<void> {
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch.set ?? {})) $set[`data.${k}`] = v;
  const $unset: Record<string, ""> = {};
  for (const k of patch.unset ?? []) $unset[`data.${k}`] = "";
  await (await users()).updateOne(
    { _id: username },
    { $set, ...(Object.keys($unset).length ? { $unset } : {}), $inc: { "data.rev": 1 } },
  );
}
