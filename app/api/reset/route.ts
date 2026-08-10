import { NextResponse } from "next/server";
import { putState } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { seed } from "@/lib/seed";

export async function POST() {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const fresh = seed();
  await putState(username, fresh);
  return NextResponse.json(fresh);
}
