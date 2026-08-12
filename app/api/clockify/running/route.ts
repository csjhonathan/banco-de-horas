import { NextResponse } from "next/server";
import { getUser } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { credsFrom } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import type { RunningResult } from "@/types";

// Cronômetro em andamento no Clockify (SOMENTE LEITURA). Chamado em polling pelo
// front; falha de leitura vira `running: null` + `error` (status 200) pra não
// derrubar o polling.
export async function GET() {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const user = await getUser(username);
  if (!user?.clockify?.apiKey) {
    const body: RunningResult = { running: null, serverNow: Date.now() };
    return NextResponse.json(body);
  }
  try {
    const running = await clockify.runningEntry(credsFrom(user));
    const body: RunningResult = { running, serverNow: Date.now() };
    return NextResponse.json(body);
  } catch (e) {
    const body: RunningResult = {
      running: null,
      serverNow: Date.now(),
      error: e instanceof Error ? e.message : "erro ao ler o cronômetro",
    };
    return NextResponse.json(body);
  }
}
