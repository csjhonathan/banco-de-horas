// Servidor de autorização OAuth 2.1 do MCP (portado do Pista Livre): registro
// dinâmico (RFC 7591), authorization code + PKCE S256 obrigatório, código de
// uso único (5 min), access token de 1 h e refresh de 30 dias ROTATIVO. Só
// hashes no banco; reuso de código ou de refresh revoga a autorização inteira.
import { createHash, randomBytes } from "node:crypto";
import * as store from "./store";

export const MCP_SCOPE = "mcp:tools";

const CODE_TTL_MS = 5 * 60 * 1000;
const ACCESS_TTL_S = 60 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = (prefix: string) => `${prefix}${randomBytes(32).toString("base64url")}`;

/** Erro OAuth como a spec descreve (error + description), pras rotas renderizarem. */
export class OAuthError extends Error {
  readonly isOAuthError = true;
  constructor(
    readonly error: string,
    readonly description: string,
    readonly status = 400,
  ) {
    super(description);
  }
}

/** Pelo formato, não `instanceof`: o Next separa os grafos de módulo. */
export function isOAuthError(error: unknown): error is OAuthError {
  return typeof error === "object" && error !== null && (error as { isOAuthError?: unknown }).isOAuthError === true;
}

/** Os dois erros que NÃO podem redirecionar (app desconhecido / redirect não registrado). */
export const UNSAFE_TO_REDIRECT = new Set(["invalid_client", "invalid_redirect"]);

export interface AuthorizeParams {
  responseType: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string | null;
  scope: string | null;
}

export interface TokenPair {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/** Em nome de quem um access token fala. */
export interface Principal {
  username: string;
  clientId: string;
  grantId: string;
}

/** A query do /authorize (e o que a tela de consentimento devolve). */
export function readAuthorizeParams(source: URLSearchParams | Record<string, unknown>): AuthorizeParams {
  const get = (key: string) => {
    const value = source instanceof URLSearchParams ? source.get(key) : source[key];
    return typeof value === "string" ? value : "";
  };
  return {
    responseType: get("response_type"),
    clientId: get("client_id"),
    redirectUri: get("redirect_uri"),
    codeChallenge: get("code_challenge"),
    codeChallengeMethod: get("code_challenge_method"),
    state: get("state") || null,
    scope: get("scope") || null,
  };
}

const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];

/**
 * https em qualquer lugar; http só no loopback (clientes de desktop/CLI abrem
 * uma porta local pra receber o código — RFC 8252). Nada de curinga nem
 * esquema customizado.
 */
function isAllowedRedirect(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && LOOPBACK.includes(url.hostname);
  } catch {
    return false;
  }
}

/** RFC 8252 §7.3: redirect de loopback pode voltar em qualquer porta. */
function sameRedirect(registered: string, asked: string): boolean {
  if (registered === asked) return true;
  try {
    const a = new URL(registered);
    const b = new URL(asked);
    return (
      a.protocol === "http:" &&
      b.protocol === "http:" &&
      LOOPBACK.includes(a.hostname) &&
      a.hostname === b.hostname &&
      a.pathname === b.pathname
    );
  } catch {
    return false;
  }
}

/** RFC 7591 (subconjunto): nome + redirect URIs → cliente público. */
export async function registerClient(input: { client_name?: unknown; redirect_uris?: unknown }) {
  const uris = Array.isArray(input.redirect_uris)
    ? input.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (uris.length === 0 || uris.length > 10) {
    throw new OAuthError("invalid_redirect_uri", "Informe de 1 a 10 redirect_uris.");
  }
  const bad = uris.find((u) => !isAllowedRedirect(u));
  if (bad) throw new OAuthError("invalid_redirect_uri", `redirect_uri não permitido: ${bad}`);
  const name =
    typeof input.client_name === "string" && input.client_name.trim()
      ? input.client_name.trim().slice(0, 120)
      : "Aplicativo MCP";
  return store.createClient({ name, redirectUris: uris });
}

/**
 * Confere o pedido ANTES da tela de consentimento. App desconhecido ou
 * redirect não registrado não podem redirecionar pra lugar nenhum (open
 * redirect) — lançam; o resto é reportado ao app.
 */
export async function checkAuthorize(params: AuthorizeParams) {
  const client = await store.findClient(params.clientId);
  if (!client) throw new OAuthError("invalid_client", "Aplicativo não registrado.");
  if (!client.redirectUris.some((u) => sameRedirect(u, params.redirectUri))) {
    throw new OAuthError("invalid_redirect", "redirect_uri não registrado para este aplicativo.");
  }
  if (params.responseType !== "code") throw new OAuthError("unsupported_response_type", "Só response_type=code.");
  if (!params.codeChallenge || params.codeChallengeMethod !== "S256") {
    throw new OAuthError("invalid_request", "PKCE obrigatório (code_challenge com S256).");
  }
  if (params.scope && params.scope.split(" ").some((s) => s && s !== MCP_SCOPE)) {
    throw new OAuthError("invalid_scope", `Escopo suportado: ${MCP_SCOPE}.`);
  }
  return client;
}

function redirect(uri: string, params: Record<string, string | null>): string {
  const url = new URL(uri);
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.toString();
}

/** A pessoa aprovou: autorização (reaproveitada se existir) + código de uso único. */
export async function approve(username: string, params: AuthorizeParams): Promise<string> {
  await checkAuthorize(params);
  const grant =
    (await store.findActiveGrant(params.clientId, username)) ??
    (await store.createGrant({ clientId: params.clientId, username, scope: MCP_SCOPE }));
  const code = secret("bhc_");
  await store.createCode({
    codeHash: sha256(code),
    grantId: grant._id,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return redirect(params.redirectUri, { code, state: params.state });
}

/** A pessoa recusou: avisa o app, como manda a spec. */
export async function deny(params: AuthorizeParams): Promise<string> {
  await checkAuthorize(params);
  return redirect(params.redirectUri, { error: "access_denied", state: params.state });
}

async function issue(grantId: string, scope: string): Promise<TokenPair> {
  const access = secret("bha_");
  const refresh = secret("bhr_");
  await store.createTokens({
    grantId,
    accessTokenHash: sha256(access),
    refreshTokenHash: sha256(refresh),
    accessExpiresAt: new Date(Date.now() + ACCESS_TTL_S * 1000),
    refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_S, refresh_token: refresh, scope };
}

/** grant_type=authorization_code: código + verifier do PKCE → par de tokens. */
export async function exchangeCode(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
}): Promise<TokenPair> {
  const code = await store.consumeCode(sha256(input.code));
  if (!code) throw new OAuthError("invalid_grant", "Código inválido.");
  const grant = await store.findGrant(code.grantId);
  if (!grant || grant.revokedAt) throw new OAuthError("invalid_grant", "Autorização revogada.");
  if (code.alreadyUsed) {
    // Código repetido = vazou: a spec manda revogar o que ele emitiu.
    await store.revokeGrant(grant._id);
    throw new OAuthError("invalid_grant", "Código já usado: a autorização foi revogada por segurança.");
  }
  if (code.expiresAt.getTime() < Date.now()) throw new OAuthError("invalid_grant", "Código expirado.");
  if (grant.clientId !== input.clientId) throw new OAuthError("invalid_grant", "Código de outro aplicativo.");
  if (code.redirectUri !== input.redirectUri) throw new OAuthError("invalid_grant", "redirect_uri diferente do autorizado.");
  const challenge = createHash("sha256").update(input.codeVerifier || "").digest("base64url");
  if (!input.codeVerifier || challenge !== code.codeChallenge) {
    throw new OAuthError("invalid_grant", "code_verifier não confere (PKCE).");
  }
  return issue(grant._id, grant.scope);
}

/** grant_type=refresh_token: ROTATIVO — o par antigo morre, sai um novo. */
export async function refresh(input: { refreshToken: string; clientId: string }): Promise<TokenPair> {
  const token = await store.findTokenByRefresh(sha256(input.refreshToken));
  if (!token) throw new OAuthError("invalid_grant", "Token de renovação inválido.");
  const grant = await store.findGrant(token.grantId);
  if (!grant || grant.revokedAt) throw new OAuthError("invalid_grant", "Autorização revogada.");
  if (token.refreshExpiresAt.getTime() < Date.now()) throw new OAuthError("invalid_grant", "Token de renovação expirado.");
  if (grant.clientId !== input.clientId) throw new OAuthError("invalid_grant", "Token de outro aplicativo.");
  // Revogação atômica: se já estava revogado, é um refresh antigo voltando = roubo.
  if (token.revokedAt || !(await store.revokeTokenIfActive(token._id))) {
    await store.revokeGrant(grant._id);
    throw new OAuthError("invalid_grant", "Token de renovação já usado: autorização revogada por segurança.");
  }
  return issue(grant._id, grant.scope);
}

/** RFC 7009: revoga um access ou refresh token (sempre 200, mesmo desconhecido). */
export async function revokeToken(token: string): Promise<void> {
  const hash = sha256(token);
  const found = (await store.findTokenByAccess(hash)) ?? (await store.findTokenByRefresh(hash));
  if (found) await store.revokeTokenIfActive(found._id);
}

/** O Bearer de uma chamada MCP → em nome de quem ela fala (null = sem acesso). */
export async function authenticate(accessToken: string): Promise<Principal | null> {
  const token = await store.findTokenByAccess(sha256(accessToken));
  if (!token || token.revokedAt || token.accessExpiresAt.getTime() < Date.now()) return null;
  const grant = await store.findGrant(token.grantId);
  if (!grant || grant.revokedAt) return null;
  await store.touch(grant._id, grant.clientId);
  return { username: grant.username, clientId: grant.clientId, grantId: grant._id };
}

/** A pessoa revoga uma autorização dela (só as próprias). */
export async function revokeMyGrant(id: string, username: string): Promise<boolean> {
  const grant = await store.findGrant(id);
  if (!grant || grant.username !== username) return false;
  if (!grant.revokedAt) await store.revokeGrant(id);
  return true;
}
