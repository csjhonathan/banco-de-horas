'use strict';

const { MongoClient } = require('mongodb');

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGO_DB || 'banco_de_horas';
const COLL = process.env.MONGO_COLLECTION || 'usuarios';

let client = null;
let collection = null;

/**
 * Conecta no Mongo com retry (o container do banco pode subir
 * um pouco depois do app no docker-compose).
 */
async function connect({ retries = 30, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      client = new MongoClient(URI, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      await client.db(DB_NAME).command({ ping: 1 });
      collection = client.db(DB_NAME).collection(COLL);
      const safeUri = URI.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:****@');
      console.log(`[db] conectado em ${safeUri} · ${DB_NAME}.${COLL}`);
      return collection;
    } catch (err) {
      console.warn(`[db] tentativa ${attempt}/${retries} falhou: ${err.message}`);
      if (client) {
        try { await client.close(); } catch (_) { /* ignore */ }
      }
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function users() {
  if (!collection) throw new Error('Banco ainda nao conectado');
  return collection;
}

/* ---- usuarios ---- */
async function getUser(username) {
  return users().findOne({ _id: username });
}

async function createUser(doc) {
  await users().insertOne(doc);
  return doc;
}

async function updateUser(username, set) {
  await users().updateOne({ _id: username }, { $set: set });
}

/** Acha o usuario dono de uma conta Clockify (para rotear webhooks). */
async function findUserByClockify({ workspaceId, clockifyUserId }) {
  const query = {};
  if (clockifyUserId) query['clockify.userId'] = clockifyUserId;
  if (workspaceId) query['clockify.workspaceId'] = workspaceId;
  if (!Object.keys(query).length) return null;
  return users().findOne(query);
}

/* ---- estado (banco de horas) por usuario ---- */
async function getState(username) {
  const u = await getUser(username);
  return u ? u.data : null;
}

async function putState(username, data) {
  await users().updateOne(
    { _id: username },
    { $set: { data, updatedAt: new Date() } }
  );
  return data;
}

async function close() {
  if (client) await client.close();
}

module.exports = {
  connect,
  getUser,
  createUser,
  updateUser,
  findUserByClockify,
  getState,
  putState,
  close,
};
