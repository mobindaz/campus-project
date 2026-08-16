import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type AuthSession } from "@/lib/auth";

export async function getSession(): Promise<AuthSession | null> {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });
    return session;
  } catch (error) {
    console.error("Failed to retrieve auth session:", error);
    return null;
  }
}

export async function requireAuth(options?: { redirectTo?: string }): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    const loginUrl = options?.redirectTo
      ? `/login?redirectTo=${encodeURIComponent(options.redirectTo)}`
      : "/login";
    redirect(loginUrl);
  }

  return session;
}
