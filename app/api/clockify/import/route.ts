import { NextResponse } from "next/server";
import { getState, getUser, putState } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { credsFrom } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import { seed } from "@/lib/seed";

// Import (substituição). Diferente do /sync (que só sobrescreve os dias
// devolvidos), aqui o banco passa a conter SOMENTE o período importado: os
// registros viram exatamente o que o Clockify tem em [start, end] e tudo fora
// disso é descartado. O Clockify é somente-leitura e a fonte da verdade, então
// reimportar sempre reconstrói. Isolado do auto-refresh/sincronizar-hoje de
// propósito — aqueles usam [hoje, hoje] e NUNCA podem zerar o banco inteiro.
export async function POST(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const user = await getUser(username);
  if (!user?.clockify) {
    return NextResponse.json({ error: "Clockify nao configurado." }, { status: 400 });
  }
  const { start, end } = (await req.json().catch(() => ({}))) || {};
  const state = (await getState(username)) || seed();
  const result = await clockify.syncRange(credsFrom(user), { start, end });
  // Substitui todos os registros pela janela importada (chaves de
  // result.registros são todas dentro de [start, end]).
  state.registros = { ...result.registros };
  await putState(username, state);
  return NextResponse.json({
    state,
    days: result.days,
    count: result.count,
    range: result.range,
  });
}
