import { NextResponse } from "next/server";
import { getUser, updateUser } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { clockifyPublic, secretList, slotsOf, webhookUrlFor } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import type { ClockifyConfig, WebhookSecrets } from "@/types";

export async function GET(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const user = await getUser(username);
  return NextResponse.json({
    ...clockifyPublic(user),
    webhookUrl: webhookUrlFor(req),
  });
}

export async function PUT(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { apiKey, workspaceId, webhookSecrets } = body || {};

  const user = await getUser(username);
  const existing = user && user.clockify ? user.clockify : null;

  let creds: ClockifyConfig;
  if (apiKey && String(apiKey).trim().length >= 10) {
    // testa a conexão (estilo "test connection" do Jira)
    const info = await clockify.verify(
      String(apiKey).trim(),
      (workspaceId || "").trim() || undefined,
    );
    creds = {
      apiKey: String(apiKey).trim(),
      workspaceId: info.workspaceId,
      userId: info.userId,
      name: info.name,
      email: info.email,
    };
  } else if (existing) {
    creds = { ...existing }; // atualizando só o webhook, mantém a chave
  } else {
    return NextResponse.json(
      { error: "Informe uma chave de API do Clockify valida." },
      { status: 422 },
    );
  }

  // secrets por slot (upd/new/del). Preencher um slot mantém os outros.
  if (webhookSecrets && typeof webhookSecrets === "object") {
    const base: WebhookSecrets =
      existing && existing.webhookSecrets && !Array.isArray(existing.webhookSecrets)
        ? { ...existing.webhookSecrets }
        : {};
    for (const k of ["upd", "new", "del"] as const) {
      const v = webhookSecrets[k];
      if (v != null && String(v).trim()) base[k] = String(v).trim();
    }
    creds.webhookSecrets = base;
  } else if (existing) {
    creds.webhookSecrets = existing.webhookSecrets; // mantém como estava
  }

  await updateUser(username, { clockify: creds });
  return NextResponse.json({
    configured: true,
    workspaceId: creds.workspaceId,
    name: creds.name,
    email: creds.email,
    apiKeySaved: true,
    webhookSlots: slotsOf(creds.webhookSecrets),
    webhookSecretsCount: secretList(creds.webhookSecrets).length,
    webhookConfigured: secretList(creds.webhookSecrets).length > 0,
  });
}

export async function DELETE() {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  await updateUser(username, { clockify: null });
  return NextResponse.json({ configured: false });
}
