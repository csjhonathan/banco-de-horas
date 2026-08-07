'use strict';

/* ------------------------------------------------------------------ *
 *  Autenticacao — sem dependencias externas (usa o crypto do Node).  *
 *  Senha: scrypt + salt.  Sessao: token estilo JWT assinado (HMAC)   *
 *  entregue num cookie httpOnly.                                     *
 * ------------------------------------------------------------------ */

const crypto = require('crypto');

const COOKIE = 'bdh_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

let SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[auth] SESSION_SECRET nao definido no .env — gerando um efemero (as sessoes caem quando o app reinicia).');
}

/* ---- senha ---- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(test);
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---- token ---- */
function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const body = { ...payload, exp: Date.now() + MAX_AGE_MS };
  const encoded = b64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

/* ---- cookies ---- */
function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return out;
}

function setSessionCookie(res, token) {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  ];
  if (process.env.COOKIE_SECURE === 'true') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/** Middleware: exige sessao valida. Popula req.username. */
function requireAuth(req, res, next) {
  const token = parseCookies(req)[COOKIE];
  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'nao autenticado' });
  }
  req.username = payload.sub;
  next();
}

module.exports = {
  COOKIE,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
};
