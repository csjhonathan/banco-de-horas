// Helpers HTTP do OAuth/MCP: origem pública (issuer), CORS aberto, respostas
// JSON no formato da spec e o metadata de descoberta (RFC 8414 / RFC 9728).
import { NextResponse } from "next/server";
import { MCP_SCOPE, isOAuthError } from "./service";

/**
 * Origem pública do app = issuer do OAuth e host do recurso MCP. `APP_URL`
 * tem prioridade; senão deriva do request (Vercel/proxy mandam
 * x-forwarded-*), como a URL do webhook.
 */
export function publicOrigin(req: Request): string {
  const envUrl = process.env.APP_URL || "";
  if (envUrl) return envUrl.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host") || new URL(req.url).host;
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export const mcpUrl = (req: Request) => `${publicOrigin(req)}/api/mcp`;
export const resourceMetadataUrl = (req: Request) =>
  `${publicOrigin(req)}/.well-known/oauth-protected-resource/api/mcp`;

/**
 * Endpoints de OAuth/MCP são chamados por apps de fora (servidores, desktop,
 * ferramentas no navegador como o MCP Inspector): CORS aberto, sem cookie —
 * cada chamada leva o próprio token.
 */
export const OPEN_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

export function openPreflight(): Response {
  return new Response(null, { status: 204, headers: OPEN_CORS });
}

export function oauthJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...OPEN_CORS, "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

/** OAuthError → `{error, error_description}` da spec; qualquer outro → server_error. */
export function oauthErrorResponse(error: unknown): NextResponse {
  if (isOAuthError(error)) {
    return oauthJson({ error: error.error, error_description: error.description }, error.status);
  }
  console.error("[oauth]", error);
  return oauthJson({ error: "server_error", error_description: "Erro interno." }, 500);
}

/** Quem está chamando, pra auditoria. */
export function requestMeta(req: Request) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
    userAgent: req.headers.get("user-agent"),
  };
}

/** Corpo form-urlencoded (o da spec) ou JSON → strings planas. */
export async function readParams(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === "string" ? v : String(v ?? "")]));
  }
  const text = await req.text().catch(() => "");
  return Object.fromEntries(new URLSearchParams(text));
}

/** Metadata RFC 8414 (o que os clientes MCP descobrem). */
export function authorizationServerMetadata(req: Request) {
  const issuer = publicOrigin(req);
  return {
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [MCP_SCOPE],
  };
}

/** Metadata RFC 9728 do recurso protegido (o servidor MCP). */
export function protectedResourceMetadata(req: Request) {
  return {
    resource: mcpUrl(req),
    authorization_servers: [publicOrigin(req)],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Banco de Horas",
  };
}
