import { NextResponse } from "next/server";
import { getUser, updateState } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { credsFrom } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import { seed } from "@/lib/seed";

// Sync (pull). O Clockify é a fonte da verdade; o app só LÊ de lá.
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
  const result = await clockify.syncRange(credsFrom(user), { start, end });
  // Sobrescreve só os dias que o Clockify devolveu (NÃO apaga dias sem entrada).
  // A limpeza autoritativa foi revertida por causar perda de dados.
  const state = await updateState(
    username,
    (s) => {
      for (const [day, sec] of Object.entries(result.registros)) s.registros[day] = sec;
    },
    seed,
  );
  return NextResponse.json({
    state,
    days: result.days,
    count: result.count,
    range: result.range,
  });
}
