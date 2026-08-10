import { NextResponse } from "next/server";
import { getState, putState } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { migrate, seed, validState } from "@/lib/seed";

export async function GET() {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  let state = await getState(username);
  if (!state) {
    state = seed();
    await putState(username, state);
  } else if (migrate(state)) {
    await putState(username, state);
  }
  return NextResponse.json(state);
}

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
  const saved = await putState(username, body);
  return NextResponse.json(saved);
}
