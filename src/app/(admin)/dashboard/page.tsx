import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { getAuthorizedNavigation } from "@/server/services/navigation.service";
import { RoleDashboardDispatcher } from "@/components/dashboard/role-dashboards";

export default async function DashboardPage() {
  const session = await requireAuth({ redirectTo: "/dashboard" });
  const nav = await getAuthorizedNavigation(session.user);

  return (
    <RoleDashboardDispatcher
      userRoles={nav.userRoles}
      user={session.user}
      departmentScopes={nav.departmentScopes}
    />
  );
}
