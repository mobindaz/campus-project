"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Shield, ChevronDown } from "lucide-react";
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

export function UserNav({ user, roles = [], departmentScopes = [] }: UserNavProps) {
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
        className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
          {initials}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-sm font-semibold text-slate-200 leading-tight">
            {user.name || "User"}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {primaryRole} {primaryDept ? `(${primaryDept})` : ""}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-40 text-slate-100">
            <div className="px-3 py-2 border-b border-slate-800 mb-1">
              <p className="text-sm font-semibold text-white truncate">{user.name || "User"}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>

              <div className="mt-2 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    <Shield className="w-2.5 h-2.5 mr-1" />
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
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
