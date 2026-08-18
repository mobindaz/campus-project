import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { getCollegeProfileService } from "@/server/services/college-profile.service";
import { ProfileForm } from "@/modules/settings/components/profile-form";
import { Settings } from "lucide-react";

export default async function SettingsProfilePage() {
  const session = await requireAuth({ redirectTo: "/settings/profile" });
  const profile = await getCollegeProfileService(session.user);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-400">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">
            College Profile Settings
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Manage institutional identity, logo assets, address, and primary
            branding colors
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
