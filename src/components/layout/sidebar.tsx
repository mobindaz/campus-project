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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header / Branding */}
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
            <Link href="/dashboard" className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20 flex-shrink-0">
                C
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-slate-100 text-base tracking-tight leading-none">
                    CampusOps
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase mt-1">
                    College Platform
                  </span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {items.map((item) => {
              const IconComponent = ICON_MAP[item.iconName] || LayoutDashboard;
              const isActive =
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 group",
                    isActive
                      ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <IconComponent
                    className={cn(
                      "w-5 h-5 flex-shrink-0 transition-colors",
                      isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.title}</span>}
                  {!isCollapsed && item.badge && (
                    <span className="ml-auto text-[10px] bg-slate-800 text-indigo-300 font-bold px-1.5 py-0.5 rounded">
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
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="truncate">
                Role: <strong className="text-slate-200 font-semibold">{primaryRoleCode || "authenticated"}</strong>
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
