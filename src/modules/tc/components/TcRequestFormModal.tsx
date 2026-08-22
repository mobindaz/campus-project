"use client";

import React, { useState, useEffect } from "react";
import { FormDefinitionDto } from "@/modules/dynamic-forms/types";
import { getFormDefinitionAction } from "@/modules/dynamic-forms/actions";
import { DynamicFormRenderer } from "@/modules/dynamic-forms/components/DynamicFormRenderer";
import { Button } from "@/components/ui/button";
import { FilePlus, X, CheckCircle2, AlertCircle } from "lucide-react";

export function TcRequestFormModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [formDef, setFormDef] = useState<FormDefinitionDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setSubmittedData(null);
      try {
        const def = await getFormDefinitionAction("TC_REQUEST_FORM");
        if (!cancelled) {
          setFormDef(def as unknown as FormDefinitionDto);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(
            (err as Error).message ||
              "Failed to load TC Request Form definition."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      setSubmittedData(data);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to submit TC request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
      >
        <FilePlus className="mr-2 h-4 w-4" /> Apply for Transfer Certificate
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">
                  TC Issuance Application
                </h3>
                <p className="text-xs text-slate-400">
                  Rendered dynamically via{" "}
                  <code className="text-indigo-400">TC_REQUEST_FORM</code>{" "}
                  definition
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {submittedData ? (
              <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-300">
                <div className="flex items-center gap-3 text-lg font-bold text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" /> TC Request Submitted
                  Successfully!
                </div>
                <p className="text-xs text-slate-300">
                  Runtime captured field values:
                </p>
                <pre className="overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-300">
                  {JSON.stringify(submittedData, null, 2)}
                </pre>
                <Button
                  onClick={() => setSubmittedData(null)}
                  variant="outline"
                  className="mt-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                >
                  Submit Another Request
                </Button>
              </div>
            ) : isLoading ? (
              <div className="py-12 text-center text-slate-400">
                Loading runtime form definition...
              </div>
            ) : formDef ? (
              <DynamicFormRenderer
                formDefinition={formDef}
                onSubmit={handleSubmit}
                isLoading={isSubmitting}
                submitLabel="Submit TC Request"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
