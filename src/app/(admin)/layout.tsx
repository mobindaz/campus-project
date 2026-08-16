import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { getAuthorizedNavigation } from "@/server/services/navigation.service";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const nav = await getAuthorizedNavigation(session.user);

  return (
    <AppShell nav={nav} user={session.user}>
      {children}
    </AppShell>
  );
}
