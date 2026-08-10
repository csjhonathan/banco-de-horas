import { NextResponse } from "next/server";
import { createUser, getUser } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { seed } from "@/lib/seed";
import { ALLOW_REGISTER } from "@/lib/user";

export async function POST(req: Request) {
  if (!ALLOW_REGISTER) {
    return NextResponse.json({ error: "registro desabilitado" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const u = String(body?.username || "").trim().toLowerCase();
  const password = body?.password;

  if (!/^[a-z0-9._-]{3,32}$/.test(u)) {
    return NextResponse.json(
      { error: "usuario invalido (3-32, letras/numeros/._-)" },
      { status: 422 },
    );
  }
  if (!password || String(password).length < 6) {
    return NextResponse.json({ error: "senha muito curta (min. 6)" }, { status: 422 });
  }
  if (await getUser(u)) {
    return NextResponse.json({ error: "usuario ja existe" }, { status: 409 });
  }

  const { salt, hash } = hashPassword(String(password));
  await createUser({
    _id: u,
    salt,
    hash,
    createdAt: new Date(),
    clockify: null,
    data: seed(),
  });
  return NextResponse.json({ username: u });
}
