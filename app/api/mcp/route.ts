import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { authenticate } from "@/lib/oauth/service";
import { OPEN_CORS, openPreflight, requestMeta, resourceMetadataUrl } from "@/lib/oauth/http";
import { audit } from "@/lib/mcp/audit";
import { INSTRUCOES, TOOLS, ToolInputError, inputParaAuditoria } from "@/lib/mcp/catalog";
import { hitRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = openPreflight;

/** Por autorização: folga pra um agente, parede pra um loop descontrolado. */
const RATE = { limit: 120, windowMs: 60_000 };

/** O token de confirmação de uma prévia nunca vai pra auditoria. */
function semToken(result: unknown): unknown {
  if (result && typeof result === "object" && "token_de_confirmacao" in result) {
    return { ...(result as Record<string, unknown>), token_de_confirmacao: "***" };
  }
  return result;
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(OPEN_CORS)) headers.set(key, value);
  return new Response(res.body, { status: res.status, headers });
}

function unauthorized(req: Request, description: string): Response {
  return withCors(
    new Response(JSON.stringify({ error: "invalid_token", error_description: description }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl(req)}", error="invalid_token"`,
      },
    }),
  );
}

/**
 * POST /api/mcp — servidor MCP (Streamable HTTP, stateless, respostas JSON).
 * Bearer do OAuth 2.1 obrigatório (descoberta: /.well-known/oauth-protected-
 * resource); cada chamada fala por UMA pessoa através de UM app. Tudo é
 * auditado: cada mensagem JSON-RPC e a entrada/saída completas de cada
 * ferramenta (tokens de confirmação mascarados). Escritas só no estado do app,
 * sempre em dois passos (prévia → confirmar_acao); o Clockify nunca é alterado.
 */
export async function POST(req: Request) {
  const meta = requestMeta(req);
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const principal = bearer ? await authenticate(bearer) : null;
  if (!principal) {
    await audit({
      channel: "oauth", method: "auth.rejected", ...meta, ok: false,
      error: bearer ? "invalid_token" : "missing_token",
    });
    return unauthorized(req, bearer ? "Token inválido, expirado ou revogado." : "Autorize o acesso pelo OAuth.");
  }
  const who = { username: principal.username, clientId: principal.clientId, grantId: principal.grantId, ...meta };

  const limit = hitRateLimit(`mcp:${principal.grantId}`, RATE);
  if (!limit.allowed) {
    await audit({ channel: "mcp", method: "rate.limited", ...who, ok: false, error: "rate_limited" });
    return withCors(
      new Response(JSON.stringify({ error: "rate_limited", error_description: "Muitas chamadas: espere um pouco." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
      }),
    );
  }

  // Audita toda mensagem, menos tools/call (essas são auditadas abaixo, completas).
  const body = (await req.clone().json().catch(() => null)) as unknown;
  const messages = (Array.isArray(body) ? body : [body]).filter(
    (m): m is { method?: string } => typeof m === "object" && m !== null,
  );
  for (const message of messages) {
    if (message.method === "tools/call") continue;
    await audit({ channel: "mcp", method: message.method ?? "response", ...who, input: message, ok: true });
  }

  const server = new Server(
    { name: "banco-de-horas", title: "Banco de Horas", version: "1.0.0" },
    { capabilities: { tools: {} }, instructions: INSTRUCOES },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: {
        title: t.title,
        readOnlyHint: t.kind === "read",
        // escritas só preparam (prévia + token); quem grava é confirmar_acao, depois do "sim"
        destructiveHint: t.name === "confirmar_acao",
        idempotentHint: t.kind === "read",
        openWorldHint: false,
      },
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const started = Date.now();
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const input = inputParaAuditoria(name, args);
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) {
      const text = `Ferramenta desconhecida: ${name}`;
      await audit({ channel: "mcp", method: "tools/call", tool: name, ...who, input, ok: false, error: text });
      return { content: [{ type: "text" as const, text }], isError: true };
    }
    try {
      const result = await tool.run(args, { username: principal.username, grantId: principal.grantId, clientId: principal.clientId });
      await audit({
        channel: "mcp", method: "tools/call", tool: name, ...who, input, output: semToken(result), ok: true,
        durationMs: Date.now() - started,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 1) }], isError: false };
    } catch (error) {
      const known = error instanceof ToolInputError;
      const text = known ? error.message : `Falha ao executar ${name}: ${error instanceof Error ? error.message : error}`;
      if (!known) console.error(`[mcp] ${name}`, error);
      await audit({
        channel: "mcp", method: "tools/call", tool: name, ...who, input, ok: false, error: text,
        durationMs: Date.now() - started,
      });
      return { content: [{ type: "text" as const, text }], isError: true };
    }
  });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return withCors(await transport.handleRequest(req));
  } finally {
    void server.close();
  }
}

/** Servidor stateless: sem stream iniciado pelo servidor, sem sessão pra encerrar. */
function methodNotAllowed(): Response {
  return withCors(
    new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Método não suportado." }, id: null }), {
      status: 405,
      headers: { "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    }),
  );
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
