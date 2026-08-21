"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  previewGeneratedPeriodsAction,
  executeSetupWizardTransactionAction,
} from "@/modules/settings/actions";
import { AcademicPeriodPreviewItem } from "@/server/services/academic-period.service";

export interface SetupWizardStatus {
  isConfigured: boolean;
  allowSkipEnv: boolean;
  profile: {
    name: string;
    logoUrl?: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  counts: {
    deptCount: number;
    programCount: number;
    periodCount: number;
    userCount: number;
  };
}

export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  description: string;
}

export interface SetupWizardClientWrapperProps {
  initialStatus: SetupWizardStatus;
  currentUserEmail: string;
}

export function SetupWizardClientWrapper({
  initialStatus,
}: SetupWizardClientWrapperProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Program State
  const [progName, setProgName] = useState("Bachelor of Technology");
  const [progCode, setProgCode] = useState("BTECH");
  const [progShort, setProgShort] = useState("B.Tech");
  const [progType, setProgType] = useState<
    "DEGREE" | "DIPLOMA" | "POST_GRADUATE" | "CERTIFICATE" | "DOCTORAL"
  >("DEGREE");
  const [durationYears, setDurationYears] = useState<number>(4);

  // Step 2: Departments State (Optional)
  const [departments, setDepartments] = useState<DepartmentRow[]>([
    {
      id: "dept-1",
      name: "Computer Science & Engineering",
      code: "CSE",
      description: "Department of Computer Science & Engineering",
    },
    {
      id: "dept-2",
      name: "Mechanical Engineering",
      code: "MECH",
      description: "Department of Mechanical Engineering",
    },
  ]);

  // Step 3: Period Generation State
  const [periodPattern, setPeriodPattern] = useState<"SEMESTER" | "YEAR">(
    "SEMESTER"
  );
  const [periodPreviews, setPeriodPreviews] = useState<
    AcademicPeriodPreviewItem[]
  >([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch live preview when durationYears or periodPattern changes
  useEffect(() => {
    let isMounted = true;
    async function loadPreview() {
      setIsLoadingPreview(true);
      try {
        const res = await previewGeneratedPeriodsAction({
          durationYears,
          pattern: periodPattern,
        });
        if (isMounted && res.success && res.data) {
          setPeriodPreviews(res.data);
        }
      } catch (err) {
        console.error("Failed to load period preview:", err);
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    }
    loadPreview();
    return () => {
      isMounted = false;
    };
  }, [durationYears, periodPattern]);

  const handleAddDepartment = () => {
    setDepartments((prev) => [
      ...prev,
      {
        id: `dept-${Date.now()}`,
        name: "",
        code: "",
        description: "",
      },
    ]);
  };

  const handleRemoveDepartment = (id: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDepartmentChange = (
    id: string,
    field: keyof DepartmentRow,
    value: string
  ) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Validate valid departments
    const validDepts = departments
      .filter((d) => d.name.trim() !== "" && d.code.trim() !== "")
      .map((d) => ({
        name: d.name.trim(),
        code: d.code.trim().toUpperCase(),
        description: d.description.trim() || undefined,
      }));

    try {
      const res = await executeSetupWizardTransactionAction({
        program: {
          name: progName.trim(),
          code: progCode.trim().toUpperCase(),
          shortName: progShort.trim(),
          type: progType,
          durationYears,
        },
        departments: validDepts,
        periodPattern,
      });

      if (res.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to commit academic setup.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred while saving setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-100 sm:text-lg">
                Academic Onboarding & Setup Wizard
              </h1>
              <p className="text-xs text-slate-400">
                Optional configuration for{" "}
                <strong className="text-slate-200">
                  {initialStatus?.profile?.name || "College Deployment"}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            Skip to Dashboard
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 p-6">
        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              step: 1,
              title: "1. Program Definition",
              subtitle: "Degree type & duration",
              icon: BookOpen,
            },
            {
              step: 2,
              title: "2. Departments (Optional)",
              subtitle: "Specialization branches",
              icon: Building2,
            },
            {
              step: 3,
              title: "3. Periods & Preview",
              subtitle: "Continuous terms & commit",
              icon: Calendar,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition-all ${
                  isActive
                    ? "border-indigo-500 bg-indigo-600/15 font-bold text-indigo-300 shadow-lg shadow-indigo-600/10"
                    : isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-800 bg-slate-900/40 text-slate-500 hover:bg-slate-800/40"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-600"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-100">
                    {item.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start space-x-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body Box */}
        <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          {/* STEP 1: Program Definition */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">
                  Step 1: Configure Academic Program
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Define the top-level degree or course category (e.g., B.Tech,
                  Diploma, BCA, MBA).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Program Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Program Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={progName}
                    onChange={(e) => setProgName(e.target.value)}
                    placeholder="e.g. Bachelor of Technology"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Do not include department names in program name (e.g.
                    &quot;B.Tech&quot; NOT &quot;B.Tech Computer Science&quot;).
                  </p>
                </div>

                {/* Program Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={progCode}
                    onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BTECH"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-100 uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
                  />
                </div>

                {/* Short Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Short Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={progShort}
                    onChange={(e) => setProgShort(e.target.value)}
                    placeholder="e.g. B.Tech"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
                  />
                </div>

                {/* Award Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Award Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={progType}
                    onChange={(e) =>
                      setProgType(
                        e.target.value as
                          | "DEGREE"
                          | "DIPLOMA"
                          | "POST_GRADUATE"
                          | "CERTIFICATE"
                          | "DOCTORAL"
                      )
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
                  >
                    <option value="DEGREE">Degree</option>
                    <option value="DIPLOMA">Diploma</option>
                    <option value="POST_GRADUATE">Post Graduate</option>
                    <option value="CERTIFICATE">Certificate</option>
                    <option value="DOCTORAL">Doctoral</option>
                  </select>
                </div>

                {/* Program Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Program Duration (Years){" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={durationYears}
                    onChange={(e) => setDurationYears(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map((yrs) => (
                      <option key={yrs} value={yrs}>
                        {yrs} {yrs === 1 ? "Year" : "Years"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Departments Configuration (Optional) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    Step 2: Add Specialization Departments (Optional)
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Add branches under{" "}
                    <strong className="text-indigo-400">
                      {progName || "Program"}
                    </strong>
                    . Standalone programs (like BCA) can skip adding
                    departments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  className="flex items-center space-x-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Department</span>
                </button>
              </div>

              {departments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="mt-2 text-xs text-slate-400">
                    No departments added. This program will be configured as a
                    standalone program.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddDepartment}
                    className="mt-3 inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add First Department</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {departments.map((dept, index) => (
                    <div
                      key={dept.id}
                      className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-12 sm:items-center"
                    >
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Department Name #{index + 1}
                        </label>
                        <input
                          type="text"
                          value={dept.name}
                          onChange={(e) =>
                            handleDepartmentChange(
                              dept.id,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="e.g. Computer Science & Engineering"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Code
                        </label>
                        <input
                          type="text"
                          value={dept.code}
                          onChange={(e) =>
                            handleDepartmentChange(
                              dept.id,
                              "code",
                              e.target.value.toUpperCase()
                            )
                          }
                          placeholder="e.g. CSE"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 uppercase focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Description
                        </label>
                        <input
                          type="text"
                          value={dept.description}
                          onChange={(e) =>
                            handleDepartmentChange(
                              dept.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Optional notes"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end sm:col-span-1 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartment(dept.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400"
                          title="Remove department"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Period Generation & Live Interactive Preview */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">
                  Step 3: Period Generation & Live Preview
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Select period type. Semesters are numbered continuously across
                  the complete {durationYears}-year program.
                </p>
              </div>

              {/* Period Pattern Selector */}
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs font-semibold text-slate-300">
                  Period Structure:
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setPeriodPattern("SEMESTER")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      periodPattern === "SEMESTER"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Semester Mode ({durationYears * 2} Semesters)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodPattern("YEAR")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      periodPattern === "YEAR"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Year Mode ({durationYears} Years)
                  </button>
                </div>
              </div>

              {/* Live Preview Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Generated Periods Preview ({periodPreviews.length} terms)
                  </h3>
                  {isLoadingPreview && (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  )}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400">
                        <th className="px-4 py-3">Academic Year</th>
                        <th className="px-4 py-3">Period Number</th>
                        <th className="px-4 py-3">Display Name</th>
                        <th className="px-4 py-3">System Code</th>
                        <th className="px-4 py-3 text-right">Order Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {periodPreviews.map((p) => (
                        <tr key={p.code} className="hover:bg-slate-900/40">
                          <td className="px-4 py-2.5 font-semibold text-indigo-400">
                            Year {p.yearNumber}
                          </td>
                          <td className="px-4 py-2.5">
                            {p.pattern === "SEMESTER"
                              ? `Semester ${p.periodNumber}`
                              : `Year ${p.periodNumber}`}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-100">
                            {p.name}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-400">
                            {p.code}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                            #{p.orderIndex}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commitment Summary Box */}
              <div className="space-y-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5">
                <div className="flex items-center space-x-2 text-sm font-bold text-indigo-300">
                  <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                  <span>Onboarding Structure Summary</span>
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-3">
                  <div>
                    <span className="text-slate-400">Program:</span>{" "}
                    <strong className="text-white">
                      {progName} ({progCode})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Departments:</span>{" "}
                    <strong className="text-white">
                      {departments.filter((d) => d.name.trim() !== "").length}{" "}
                      specializations
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Academic Terms:</span>{" "}
                    <strong className="font-bold text-emerald-400">
                      {periodPreviews.length} {periodPattern.toLowerCase()}s
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation & Action Bar */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <button
              type="button"
              disabled={currentStep === 1 || isSubmitting}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="flex items-center space-x-1.5 rounded-xl bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(3, prev + 1))}
                className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
              >
                <span>Next Step</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex items-center space-x-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                )}
                <span>Save & Commit Academic Setup</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
