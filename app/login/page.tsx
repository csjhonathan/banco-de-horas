import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/organisms/LoginForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Só caminhos internos ("/x", nunca "//host" ou URL absoluta): evita open redirect. */
function safeCallback(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const callbackUrl = safeCallback((await searchParams).callbackUrl);
  const session = await auth();
  if (session?.user) redirect(callbackUrl);
  const allowRegister = process.env.ALLOW_REGISTER !== "false";
  return <LoginForm allowRegister={allowRegister} callbackUrl={callbackUrl} />;
}
