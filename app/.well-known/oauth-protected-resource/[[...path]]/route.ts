import { oauthJson, openPreflight, protectedResourceMetadata } from "@/lib/oauth/http";

export const dynamic = "force-dynamic";
export const OPTIONS = openPreflight;

/**
 * GET /.well-known/oauth-protected-resource[/api/mcp] — RFC 9728: de onde vêm
 * os tokens do servidor MCP. Clientes perguntam na raiz ou no caminho do recurso.
 */
export function GET(req: Request) {
  return oauthJson(protectedResourceMetadata(req));
}
