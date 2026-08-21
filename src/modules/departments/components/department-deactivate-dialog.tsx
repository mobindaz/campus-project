"use client";

import React, { useState } from "react";
import { deleteDepartmentAction } from "../actions";
import { AlertTriangle, Loader2, X } from "lucide-react";

export interface DepartmentDeactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  department?: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  } | null;
}

export function DepartmentDeactivateDialog({
  isOpen,
  onClose,
  onSuccess,
  department,
}: DepartmentDeactivateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultNotice, setResultNotice] = useState<string | null>(null);

  if (!isOpen || !department) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setResultNotice(null);

    try {
      const res = await deleteDepartmentAction(department.id);
      if (res.success && res.data) {
        setResultNotice(res.data.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || "Failed to remove department.");
      }
    } catch {
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-3 text-amber-400">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Deactivate / Delete Department
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm text-slate-300">
            Are you sure you want to remove or deactivate department{" "}
            <strong className="font-semibold text-white">
              {department.name} ({department.code})
            </strong>
            ?
          </p>

          <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
            <p className="font-semibold text-slate-300">
              Deletion Safety Policy (Correction #8):
            </p>
            <p>
              • If zero references exist, the department will be permanently
              deleted.
            </p>
            <p>
              • If active student, faculty, or scope references exist, it will
              be automatically soft-deactivated instead.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {errorMessage}
            </div>
          )}

          {resultNotice && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-400">
              {resultNotice}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || Boolean(resultNotice)}
              onClick={handleConfirm}
              className="flex items-center space-x-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Confirm Removal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
