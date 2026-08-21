import React from "react";
import { getSetupWizardStatusService } from "@/server/services/college-profile.service";
import { getSession } from "@/server/services/auth.service";
import { SetupWizardClientWrapper } from "./client-wrapper";

export default async function SetupWizardPage() {
  const session = await getSession();
  const status = await getSetupWizardStatusService();

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <SetupWizardClientWrapper
        initialStatus={status}
        currentUserEmail={session?.user?.email || "admin@college.edu"}
      />
    </div>
  );
}
