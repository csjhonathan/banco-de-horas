// Persistência do OAuth 2.1 do MCP no Mongo: aplicativos (registro dinâmico),
// autorizações (pessoa × app), códigos de uso único e tokens. SÓ HASHES de
// código/token ficam no banco. Índices TTL limpam códigos e tokens vencidos.
import { randomUUID } from "node:crypto";
import { database } from "@/lib/db";

/** Um app registrado para usar o MCP (cliente público: PKCE, sem segredo). */
export interface OAuthClientDoc {
  _id: string;
  name: string;
  redirectUris: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
}

/** A autorização de UMA pessoa para UM app. */
export interface OAuthGrantDoc {
  _id: string;
  clientId: string;
  username: string;
  scope: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

interface OAuthCodeDoc {
  _id: string;
  codeHash: string;
  grantId: string;
  redirectUri: string;
  codeChallenge: string;
  expiresAt: Date;
  usedAt: Date | null;
}

interface OAuthTokenDoc {
  _id: string;
  grantId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

const globalForOAuth = globalThis as unknown as { _oauthIndexes?: Promise<void> };

async function colls() {
  const db = await database();
  const c = {
    clients: db.collection<OAuthClientDoc>("oauth_clients"),
    grants: db.collection<OAuthGrantDoc>("oauth_grants"),
    codes: db.collection<OAuthCodeDoc>("oauth_codes"),
    tokens: db.collection<OAuthTokenDoc>("oauth_tokens"),
  };
  // Índices uma vez por processo (idempotente no Mongo).
  globalForOAuth._oauthIndexes ??= Promise.all([
    c.grants.createIndex({ clientId: 1, username: 1 }),
    c.grants.createIndex({ username: 1 }),
    c.codes.createIndex({ codeHash: 1 }, { unique: true }),
    // Código vale 5 min; o Mongo apaga depois de vencido (+1 dia de folga p/ detectar replay).
    c.codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 24 * 3600 }),
    c.tokens.createIndex({ accessTokenHash: 1 }, { unique: true }),
    c.tokens.createIndex({ refreshTokenHash: 1 }, { unique: true }),
    c.tokens.createIndex({ grantId: 1 }),
    c.tokens.createIndex({ refreshExpiresAt: 1 }, { expireAfterSeconds: 0 }),
  ])
    .then(() => undefined)
    .catch((e) => {
      globalForOAuth._oauthIndexes = undefined;
      console.error("[oauth] índices", e);
    });
  await globalForOAuth._oauthIndexes;
  return c;
}

/* ---- aplicativos ---- */
export async function createClient(data: { name: string; redirectUris: string[] }): Promise<OAuthClientDoc> {
  const doc: OAuthClientDoc = { _id: randomUUID(), ...data, createdAt: new Date(), lastUsedAt: null };
  await (await colls()).clients.insertOne(doc);
  return doc;
}

export async function findClient(id: string): Promise<OAuthClientDoc | null> {
  if (!id) return null;
  return (await colls()).clients.findOne({ _id: id });
}

/* ---- autorizações ---- */
export async function findActiveGrant(clientId: string, username: string): Promise<OAuthGrantDoc | null> {
  return (await colls()).grants.findOne({ clientId, username, revokedAt: null });
}

export async function createGrant(data: { clientId: string; username: string; scope: string }): Promise<OAuthGrantDoc> {
  const doc: OAuthGrantDoc = { _id: randomUUID(), ...data, createdAt: new Date(), lastUsedAt: null, revokedAt: null };
  await (await colls()).grants.insertOne(doc);
  return doc;
}

export async function findGrant(id: string): Promise<OAuthGrantDoc | null> {
  return (await colls()).grants.findOne({ _id: id });
}

/** Autorizações ativas da pessoa, com o nome do app. */
export async function listActiveGrants(username: string) {
  const c = await colls();
  const grants = await c.grants.find({ username, revokedAt: null }).sort({ createdAt: -1 }).toArray();
  const clients = await c.clients.find({ _id: { $in: grants.map((g) => g.clientId) } }).toArray();
  const names = new Map(clients.map((cl) => [cl._id, cl.name]));
  return grants.map((g) => ({ ...g, clientName: names.get(g.clientId) ?? "Aplicativo removido" }));
}

/** Revoga a autorização E todos os tokens dela. */
export async function revokeGrant(id: string): Promise<void> {
  const c = await colls();
  const now = new Date();
  await c.grants.updateOne({ _id: id, revokedAt: null }, { $set: { revokedAt: now } });
  await c.tokens.updateMany({ grantId: id, revokedAt: null }, { $set: { revokedAt: now } });
}

export async function touch(grantId: string, clientId: string): Promise<void> {
  const c = await colls();
  const now = new Date();
  await Promise.all([
    c.grants.updateOne({ _id: grantId }, { $set: { lastUsedAt: now } }),
    c.clients.updateOne({ _id: clientId }, { $set: { lastUsedAt: now } }),
  ]);
}

/* ---- códigos ---- */
export async function createCode(data: Omit<OAuthCodeDoc, "_id" | "usedAt">): Promise<void> {
  await (await colls()).codes.insertOne({ _id: randomUUID(), ...data, usedAt: null });
}

/** Marca o código como usado (atômico) e o devolve; `alreadyUsed` = replay. */
export async function consumeCode(codeHash: string) {
  const before = await (await colls()).codes.findOneAndUpdate(
    { codeHash },
    { $set: { usedAt: new Date() } },
    { returnDocument: "before" },
  );
  if (!before) return null;
  return { ...before, alreadyUsed: before.usedAt !== null };
}

/* ---- tokens ---- */
export async function createTokens(data: Omit<OAuthTokenDoc, "_id" | "revokedAt" | "createdAt">): Promise<void> {
  await (await colls()).tokens.insertOne({ _id: randomUUID(), ...data, revokedAt: null, createdAt: new Date() });
}

export async function findTokenByAccess(hash: string) {
  return (await colls()).tokens.findOne({ accessTokenHash: hash });
}

export async function findTokenByRefresh(hash: string) {
  return (await colls()).tokens.findOne({ refreshTokenHash: hash });
}

/**
 * Revoga o token SÓ se ainda estiver ativo. Devolve false se outro pedido já o
 * revogou — na rotação do refresh isso é reuso (corrida ou roubo).
 */
export async function revokeTokenIfActive(id: string): Promise<boolean> {
  const res = await (await colls()).tokens.updateOne({ _id: id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return res.modifiedCount === 1;
}
