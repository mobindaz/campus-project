"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export interface UserNavProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  roles?: { id: string; name: string; code: string }[];
  departmentScopes?: { id: string; name: string; code: string }[];
}

export function UserNav({
  user,
  roles = [],
  departmentScopes = [],
}: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const primaryRole = roles[0]?.name || "User";
  const primaryDept = departmentScopes[0]?.code;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 rounded-lg p-1.5 transition-colors hover:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-xs font-bold text-white shadow-md">
          {initials}
        </div>
        <div className="hidden flex-col text-left md:flex">
          <span className="text-sm leading-tight font-semibold text-slate-200">
            {user.name || "User"}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {primaryRole} {primaryDept ? `(${primaryDept})` : ""}
          </span>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 shadow-2xl">
            <div className="mb-1 border-b border-slate-800 px-3 py-2">
              <p className="truncate text-sm font-semibold text-white">
                {user.name || "User"}
              </p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>

              <div className="mt-2 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300"
                  >
                    <Shield className="mr-1 h-2.5 w-2.5" />
                    {r.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="py-1">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
