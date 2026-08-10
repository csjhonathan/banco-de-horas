import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Dashboard } from "@/components/organisms/Dashboard";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <Dashboard />;
}
