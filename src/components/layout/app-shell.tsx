"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AuthorizedNavigation } from "@/server/services/navigation.service";

export interface AppShellProps {
  nav: AuthorizedNavigation;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  children: React.ReactNode;
}

export function AppShell({ nav, user, children }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Sidebar */}
      <Sidebar
        items={nav.items}
        primaryRoleCode={nav.primaryRoleCode}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 transition-all duration-300">
        <Topbar
          user={user}
          roles={nav.userRoles}
          departmentScopes={nav.departmentScopes}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
        />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
        <footer className="py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-900">
          Campus Operations Platform &copy; {new Date().getFullYear()} &bull; Independent College Deployment
        </footer>
      </div>
    </div>
  );
}
