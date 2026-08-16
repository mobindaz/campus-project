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
    } catch (err: any) {
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 text-amber-400">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Deactivate / Delete Department
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to remove or deactivate department{" "}
            <strong className="text-white font-semibold">{department.name} ({department.code})</strong>?
          </p>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Deletion Safety Policy (Correction #8):</p>
            <p>
              • If zero references exist, the department will be permanently deleted.
            </p>
            <p>
              • If active student, faculty, or scope references exist, it will be automatically soft-deactivated instead.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {errorMessage}
            </div>
          )}

          {resultNotice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium">
              {resultNotice}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || Boolean(resultNotice)}
              onClick={handleConfirm}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl transition-colors shadow-lg shadow-amber-600/20 flex items-center space-x-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Removal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
