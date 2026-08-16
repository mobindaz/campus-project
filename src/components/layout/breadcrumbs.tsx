"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  admin: "Admin",
  students: "Students",
  placements: "Placement Management",
  tc: "TC Management",
  workflows: "Workflow Engine",
  forms: "Dynamic Forms",
  fields: "Custom Fields",
  reports: "Reports & Analytics",
  settings: "Platform Settings",
  hod: "HOD Dashboard",
  student: "Student Dashboard",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="flex items-center text-sm text-slate-400 font-medium">
        <Home className="w-4 h-4 mr-1.5 text-slate-400" />
        <span>Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-sm font-medium">
      <Link
        href="/dashboard"
        className="flex items-center text-slate-400 hover:text-indigo-400 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label =
          ROUTE_LABELS[segment] ||
          segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

        return (
          <React.Fragment key={url}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            {isLast ? (
              <span className="text-slate-200 font-semibold truncate max-w-[200px]">{label}</span>
            ) : (
              <Link
                href={url}
                className="text-slate-400 hover:text-indigo-400 transition-colors truncate max-w-[150px]"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
