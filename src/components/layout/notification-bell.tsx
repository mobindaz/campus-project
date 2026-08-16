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
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-900" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-40 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-sm text-slate-200">Notifications</h3>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                Phase 8 Wireframe
              </span>
            </div>
            <div className="py-6 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mb-1" />
              <p className="text-sm font-medium text-slate-300">You're all caught up!</p>
              <p className="text-xs text-slate-500 max-w-[220px]">
                Realtime in-app & email notification events will appear here when active.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
