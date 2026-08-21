"use client";

import React, { useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount] = useState(0); // Wire up with polling/Inngest in Phase 8

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-900" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Notifications
              </h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                Phase 8 Wireframe
              </span>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 py-6 text-center text-slate-400">
              <CheckCircle2 className="mb-1 h-8 w-8 text-emerald-500/80" />
              <p className="text-sm font-medium text-slate-300">
                You&apos;re all caught up!
              </p>
              <p className="max-w-[220px] text-xs text-slate-500">
                Realtime in-app & email notification events will appear here
                when active.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
