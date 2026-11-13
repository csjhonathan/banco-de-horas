import { NextResponse } from "next/server";
import { approve, checkAuthorize, deny, isOAuthError, readAuthorizeParams } from "@/lib/oauth/service";
import { requestMeta } from "@/lib/oauth/http";
import { audit } from "@/lib/mcp/audit";
import { currentUsername } from "@/lib/session";

/**
 * POST /api/oauth/consent {…a query do /authorize, decision: approve|deny} →
 * {redirectTo}: o redirect do app com o código de uso único (ou a recusa). A
 * tela /autorizar navega pra lá. Exige a sessão do app (cookie SameSite=Lax:
 * outro site não consegue postar aqui em nome da pessoa). Auditado.
 */
export async function POST(req: Request) {
  const username = await currentUsername();
  if (!username) return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const params = readAuthorizeParams(body);
  try {
    const client = await checkAuthorize(params);
    const ok = body.decision === "approve";
    const redirectTo = ok ? await approve(username, params) : await deny(params);
    await audit({
      channel: "oauth", method: ok ? "consent.approve" : "consent.deny", username, clientId: client._id,
      ...requestMeta(req), input: { client: client.name, redirect_uri: params.redirectUri, scope: params.scope }, ok: true,
    });
    return NextResponse.json({ redirectTo });
  } catch (error) {
    const message = isOAuthError(error) ? error.description : "Pedido de autorização inválido.";
    if (!isOAuthError(error)) console.error("[oauth] consent", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
