import { NextResponse } from "next/server";
import { getState, putStateIf, updateState } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { migrate, seed, validState } from "@/lib/seed";

export async function GET() {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  // Migra (e cria o estado inicial) com controle de versão; sem mudança, não grava.
  const state = await updateState(username, (s) => void migrate(s), seed);
  return NextResponse.json(state);
}

/**
 * PUT {…estado, rev} — grava só se `rev` ainda for a do servidor. Se outra
 * escrita veio antes (MCP, sync, outra aba), responde 409 com o estado atual
 * pra o front reaplicar a própria mudança por cima (`lib/rebase.ts`).
 */
export async function PUT(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!validState(body)) {
    return NextResponse.json({ error: "Estado invalido." }, { status: 422 });
  }
  migrate(body);
  const saved = await putStateIf(username, body.rev ?? 0, body);
  if (!saved) {
    return NextResponse.json(
      { error: "O banco mudou em outro lugar.", state: await getState(username) },
      { status: 409 },
    );
  }
  return NextResponse.json(saved);
}
