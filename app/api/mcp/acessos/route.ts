import { NextResponse } from "next/server";
import { listActiveGrants } from "@/lib/oauth/store";
import { revokeMyGrant } from "@/lib/oauth/service";
import { mcpUrl, requestMeta } from "@/lib/oauth/http";
import { audit, recentAudit } from "@/lib/mcp/audit";
import { currentUsername } from "@/lib/session";
import type { McpAccess } from "@/types";

/** GET /api/mcp/acessos — endereço do MCP, apps autorizados e as últimas chamadas da pessoa. */
export async function GET(req: Request) {
  const username = await currentUsername();
  if (!username) return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  const [grants, calls] = await Promise.all([listActiveGrants(username), recentAudit(username)]);
  const names = new Map(grants.map((g) => [g.clientId, g.clientName]));
  const body: McpAccess = {
    mcpUrl: mcpUrl(req),
    grants: grants.map((g) => ({
      id: g._id,
      clientName: g.clientName,
      createdAt: g.createdAt.toISOString(),
      lastUsedAt: g.lastUsedAt?.toISOString() ?? null,
    })),
    calls: calls.map((c) => ({
      id: c._id,
      method: c.method,
      tool: c.tool ?? null,
      clientName: (c.clientId && names.get(c.clientId)) || null,
      ok: c.ok,
      error: c.error ?? null,
      durationMs: c.durationMs,
      createdAt: c.createdAt.toISOString(),
    })),
  };
  return NextResponse.json(body);
}

/** DELETE /api/mcp/acessos?id=<autorização> — revoga uma autorização da própria pessoa (e os tokens dela). */
export async function DELETE(req: Request) {
  const username = await currentUsername();
  if (!username) return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const ok = await revokeMyGrant(id, username);
  if (!ok) return NextResponse.json({ error: "Autorização não encontrada." }, { status: 404 });
  await audit({ channel: "oauth", method: "grant.revoke", username, grantId: id, ...requestMeta(req), ok: true });
  return NextResponse.json({ ok: true });
}
