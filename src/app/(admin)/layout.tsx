import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { getAuthorizedNavigation } from "@/server/services/navigation.service";
import { getSetupWizardStatusService } from "@/server/services/college-profile.service";
import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  const status = await getSetupWizardStatusService();
  if (!status.isConfigured) {
    redirect("/setup-wizard");
  }

  const nav = await getAuthorizedNavigation(session.user);

  return (
    <AppShell nav={nav} user={session.user}>
      {children}
    </AppShell>
  );
}
