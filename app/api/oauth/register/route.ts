import { registerClient } from "@/lib/oauth/service";
import { oauthErrorResponse, oauthJson, openPreflight, requestMeta } from "@/lib/oauth/http";
import { audit } from "@/lib/mcp/audit";

export const OPTIONS = openPreflight;

/**
 * POST /api/oauth/register — registro dinâmico RFC 7591 (o que Claude, ChatGPT
 * e outros clientes MCP fazem sozinhos). Cliente público: sem segredo, PKCE
 * obrigatório. Auditado.
 */
export async function POST(req: Request) {
  const started = Date.now();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const client = await registerClient(body);
    const response = {
      client_id: client._id,
      client_name: client.name,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    };
    await audit({
      channel: "oauth", method: "register", clientId: client._id, ...requestMeta(req),
      input: body, output: response, ok: true, durationMs: Date.now() - started,
    });
    return oauthJson(response, 201);
  } catch (error) {
    await audit({
      channel: "oauth", method: "register", ...requestMeta(req),
      input: body, ok: false, error: String((error as Error).message), durationMs: Date.now() - started,
    });
    return oauthErrorResponse(error);
  }
}
