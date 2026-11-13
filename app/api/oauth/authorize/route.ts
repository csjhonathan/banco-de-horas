import { NextResponse } from "next/server";
import { UNSAFE_TO_REDIRECT, checkAuthorize, isOAuthError, readAuthorizeParams } from "@/lib/oauth/service";
import { publicOrigin } from "@/lib/oauth/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/authorize — confere o pedido (app registrado, redirect exato,
 * PKCE S256) e manda a pessoa pra tela de consentimento (/autorizar), onde ela
 * entra com a própria conta e aprova ou recusa. App desconhecido ou redirect
 * não registrado recebem uma página de erro, nunca um redirect.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = readAuthorizeParams(url.searchParams);
  try {
    await checkAuthorize(params);
  } catch (error) {
    if (isOAuthError(error) && !UNSAFE_TO_REDIRECT.has(error.error)) {
      // App e redirect válidos: avisa o app, como manda a spec.
      const back = new URL(params.redirectUri);
      back.searchParams.set("error", error.error);
      back.searchParams.set("error_description", error.description);
      if (params.state) back.searchParams.set("state", params.state);
      return NextResponse.redirect(back.toString());
    }
    const message = isOAuthError(error) ? error.description : "Pedido de autorização inválido.";
    return new NextResponse(`Autorização recusada: ${message}`, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const consent = new URL(`${publicOrigin(req)}/autorizar`);
  url.searchParams.forEach((value, key) => consent.searchParams.set(key, value));
  return NextResponse.redirect(consent.toString());
}
