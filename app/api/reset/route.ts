import { NextResponse } from "next/server";
import { updateState } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { seed } from "@/lib/seed";

export async function POST() {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  // Zera mantendo a sequência de versões (abas abertas recebem 409 e recarregam).
  const fresh = await updateState(
    username,
    (s) => {
      const rev = s.rev;
      for (const k of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[k];
      Object.assign(s, seed(), { rev });
    },
    seed,
  );
  return NextResponse.json(fresh);
}
