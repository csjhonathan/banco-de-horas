import { NextResponse } from "next/server";
import { getUser } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { ALLOW_REGISTER, clockifyPublic, webhookUrlFor } from "@/lib/user";

export async function GET(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const user = await getUser(username);
  if (!user) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  return NextResponse.json({
    username: user._id,
    clockify: clockifyPublic(user),
    webhookUrl: webhookUrlFor(req),
    allowRegister: ALLOW_REGISTER,
  });
}
