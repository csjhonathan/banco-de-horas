import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/organisms/LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const allowRegister = process.env.ALLOW_REGISTER !== "false";
  return <LoginForm allowRegister={allowRegister} />;
}
