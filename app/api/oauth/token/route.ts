import { OAuthError, exchangeCode, refresh } from "@/lib/oauth/service";
import { oauthErrorResponse, oauthJson, openPreflight, readParams, requestMeta } from "@/lib/oauth/http";
import { audit } from "@/lib/mcp/audit";

export const OPTIONS = openPreflight;

/**
 * POST /api/oauth/token — authorization_code (+ verifier do PKCE) ou
 * refresh_token (rotativo). Auditado (os tokens em si nunca: só que saíram).
 */
export async function POST(req: Request) {
  const started = Date.now();
  const params = await readParams(req);
  const method = params.grant_type === "refresh_token" ? "token.refresh" : "token.issue";
  const safeInput = {
    ...params,
    code: params.code ? "***" : undefined,
    refresh_token: params.refresh_token ? "***" : undefined,
    code_verifier: params.code_verifier ? "***" : undefined,
  };
  try {
    let pair;
    if (params.grant_type === "authorization_code") {
      pair = await exchangeCode({
        code: params.code ?? "",
        redirectUri: params.redirect_uri ?? "",
        clientId: params.client_id ?? "",
        codeVerifier: params.code_verifier ?? "",
      });
    } else if (params.grant_type === "refresh_token") {
      pair = await refresh({ refreshToken: params.refresh_token ?? "", clientId: params.client_id ?? "" });
    } else {
      throw new OAuthError("unsupported_grant_type", "Use authorization_code ou refresh_token.");
    }
    await audit({
      channel: "oauth", method, clientId: params.client_id || null, ...requestMeta(req),
      input: safeInput, output: { token_type: pair.token_type, expires_in: pair.expires_in, scope: pair.scope },
      ok: true, durationMs: Date.now() - started,
    });
    return oauthJson(pair);
  } catch (error) {
    await audit({
      channel: "oauth", method, clientId: params.client_id || null, ...requestMeta(req),
      input: safeInput, ok: false, error: String((error as Error).message), durationMs: Date.now() - started,
    });
    return oauthErrorResponse(error);
  }
}
