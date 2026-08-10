// Conexão com o MongoDB — com cache de client para sobreviver a hot reloads
// (dev) e reuso entre invocações serverless (Vercel). Acesso por usuário.
import { MongoClient, type Collection } from "mongodb";
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

async function users(): Promise<Collection<UserDoc>> {
  const client = await clientPromise();
  return client.db(DB_NAME).collection<UserDoc>(COLL);
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

export async function putState(username: string, data: State): Promise<State> {
  await (await users()).updateOne(
    { _id: username },
    { $set: { data, updatedAt: new Date() } },
  );
  return data;
}
