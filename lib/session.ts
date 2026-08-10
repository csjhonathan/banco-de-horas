import { auth } from "@/auth";

/** Username do usuário logado (ou null). Usado pelas API routes protegidas. */
export async function currentUsername(): Promise<string | null> {
  const session = await auth();
  return session?.user?.name ?? null;
}
