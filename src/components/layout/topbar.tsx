"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { NotificationBell } from "./notification-bell";
import { UserNav, UserNavProps } from "./user-nav";

export interface TopbarProps extends UserNavProps {
  onMobileMenuOpen?: () => void;
}

export function Topbar({ user, roles, departmentScopes, onMobileMenuOpen }: TopbarProps) {
  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Breadcrumbs />
      </div>

      <div className="flex items-center space-x-3 md:space-x-4">
        <NotificationBell />
        <div className="h-5 w-px bg-slate-800 hidden sm:block" />
        <UserNav user={user} roles={roles} departmentScopes={departmentScopes} />
      </div>
    </header>
  );
}
