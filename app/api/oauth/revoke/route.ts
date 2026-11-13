import { revokeToken } from "@/lib/oauth/service";
import { oauthJson, openPreflight, readParams, requestMeta } from "@/lib/oauth/http";
import { audit } from "@/lib/mcp/audit";

export const OPTIONS = openPreflight;

/** POST /api/oauth/revoke — RFC 7009: sempre 200, mesmo com token desconhecido. Auditado. */
export async function POST(req: Request) {
  const params = await readParams(req);
  if (params.token) await revokeToken(params.token);
  await audit({
    channel: "oauth", method: "token.revoke", clientId: params.client_id || null, ...requestMeta(req),
    input: { token_type_hint: params.token_type_hint ?? null }, ok: true,
  });
  return oauthJson({});
}
