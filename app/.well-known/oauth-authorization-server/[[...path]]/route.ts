import { authorizationServerMetadata, oauthJson, openPreflight } from "@/lib/oauth/http";

export const dynamic = "force-dynamic";
export const OPTIONS = openPreflight;

/**
 * GET /.well-known/oauth-authorization-server[/…] — RFC 8414. Alguns clientes
 * perguntam com o caminho do recurso no fim (/api/mcp); a resposta é a mesma.
 */
export function GET(req: Request) {
  return oauthJson(authorizationServerMetadata(req));
}
