import { NextResponse } from "next/server";
import { findUserByClockify, getState, putState } from "@/lib/db";
import { credsFrom, secretList } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import { seed } from "@/lib/seed";

// Webhook (Clockify -> banco). Roteia pelo usuário dono da conta Clockify.
// Requer URL pública (ngrok/domínio). Nenhuma sessão — validado por assinatura.
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => ({}))) || {};

  // acha o dono pela conta Clockify (workspace + usuário do payload)
  const user = await findUserByClockify({
    workspaceId: payload.workspaceId,
    clockifyUserId: payload.userId,
  });
  if (!user) {
    return NextResponse.json({ ok: true, skipped: "sem usuario correspondente" });
  }

  // valida a assinatura: secrets do usuário (+ fallback global do .env).
  // O Clockify gera uma signing secret POR webhook e a manda no header
  // "clockify-signature". Sem nenhuma secret cadastrada = não valida (dev).
  const userSecrets = secretList(user.clockify?.webhookSecrets);
  const globalSecrets = (process.env.CLOCKIFY_WEBHOOK_SECRET || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = [...userSecrets, ...globalSecrets];
  if (allowed.length) {
    const sig = req.headers.get("clockify-signature");
    if (!sig || !allowed.includes(sig)) {
      return NextResponse.json({ error: "assinatura invalida" }, { status: 401 });
    }
  }

  const creds = credsFrom(user);
  const day = clockify.dayFromWebhook(payload, creds.tz);
  if (!day) return NextResponse.json({ ok: true, skipped: "sem data" });

  const { seconds } = await clockify.recomputeDay(creds, day);
  const state = (await getState(user._id)) || seed();
  if (seconds > 0) state.registros[day] = seconds;
  else delete state.registros[day];
  await putState(user._id, state);

  console.log(`[webhook] ${user._id} · ${day} -> ${seconds}s`);
  return NextResponse.json({ ok: true, day, seconds });
}
