import { NextResponse } from "next/server";
import { getUser } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { credsFrom } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import type { BreakdownResult } from "@/types";

// Relatório por projeto/cliente/tarefa no período (SOMENTE LEITURA).
// Query: ?start=AAAA-MM-DD&end=AAAA-MM-DD (ambos opcionais → mês atual).
export async function GET(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const user = await getUser(username);
  if (!user?.clockify?.apiKey) {
    const body: BreakdownResult = { breakdown: null, error: "Clockify nao configurado." };
    return NextResponse.json(body, { status: 400 });
  }
  const url = new URL(req.url);
  const start = url.searchParams.get("start") || undefined;
  const end = url.searchParams.get("end") || undefined;
  try {
    const breakdown = await clockify.breakdown(credsFrom(user), { start, end });
    const body: BreakdownResult = { breakdown };
    return NextResponse.json(body);
  } catch (e) {
    const body: BreakdownResult = {
      breakdown: null,
      error: e instanceof Error ? e.message : "erro ao gerar o relatório",
    };
    return NextResponse.json(body);
  }
}
