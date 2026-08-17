"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "@/config/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Briefcase,
  FileCheck,
  GitFork,
  FormInput,
  Sliders,
  BarChart3,
  Settings,
  Building2,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  GraduationCap,
  Briefcase,
  FileCheck,
  GitFork,
  FormInput,
  Sliders,
  BarChart3,
  Settings,
  Building2,
  BookOpen,
  Calendar,
};

export interface SidebarProps {
  items: NavItem[];
  primaryRoleCode?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  items,
  primaryRoleCode,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between border-r border-slate-800 bg-slate-900 transition-all duration-300",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header / Branding */}
        <div>
          <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 overflow-hidden"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-500/20">
                C
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-base leading-none font-bold tracking-tight text-slate-100">
                    CampusOps
                  </span>
                  <span className="mt-1 text-[10px] font-semibold tracking-wider text-indigo-400 uppercase">
                    College Platform
                  </span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 lg:flex"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="max-h-[calc(100vh-140px)] space-y-1 overflow-y-auto p-3">
            {items.map((item) => {
              const IconComponent = ICON_MAP[item.iconName] || LayoutDashboard;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "group flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "border border-indigo-500/30 bg-indigo-600/15 font-semibold text-indigo-400"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <IconComponent
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-colors",
                      isActive
                        ? "text-indigo-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.title}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Role Badge */}
        {!isCollapsed && (
          <div className="border-t border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Shield className="h-4 w-4 flex-shrink-0 text-indigo-400" />
              <span className="truncate">
                Role:{" "}
                <strong className="font-semibold text-slate-200">
                  {primaryRoleCode || "authenticated"}
                </strong>
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
