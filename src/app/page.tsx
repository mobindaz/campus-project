import { redirect } from "next/navigation";
import { getSession } from "@/server/services/auth.service";

export default async function Home() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
