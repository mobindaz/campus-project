"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  BookOpen,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Wand2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ProfileForm } from "@/modules/settings/components/profile-form";
import {
  PeriodManager,
  ProgramOption,
} from "@/modules/academic-structure/components/period-manager";
import { DepartmentItem } from "@/modules/departments/components/department-list";
import { createDepartmentAction } from "@/modules/departments/actions";
import { createProgramAction } from "@/modules/programs/actions";
import {
  completeSetupWizardAction,
  getSetupStatusAction,
  seedDemoDataAction,
} from "@/modules/settings/actions";

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

export interface SetupWizardClientWrapperProps {
  initialStatus: SetupWizardStatus;
  initialDepartments: DepartmentItem[];
  initialPrograms: ProgramOption[];
  currentUserEmail: string;
}

export function SetupWizardClientWrapper({
  initialStatus,
  initialDepartments,
  initialPrograms,
  currentUserEmail,
}: SetupWizardClientWrapperProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [status, setStatus] = useState<SetupWizardStatus>(initialStatus);
  const [departments, setDepartments] =
    useState<DepartmentItem[]>(initialDepartments);
  const [programs, setPrograms] = useState<ProgramOption[]>(initialPrograms);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Department creation state inside step 2
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [deptCreating, setDeptCreating] = useState(false);

  // Program creation state inside step 3
  const [newProgName, setNewProgName] = useState("");
  const [newProgCode, setNewProgCode] = useState("");
  const [newProgShort, setNewProgShort] = useState("");
  const [newProgDeptId, setNewProgDeptId] = useState("");
  const [progCreating, setProgCreating] = useState(false);

  const refreshStatus = async () => {
    const res = await getSetupStatusAction();
    if (res.success && res.data) {
      setStatus(res.data);
    }
  };

  const handleQuickCreateDepartment = async () => {
    if (!newDeptName || !newDeptCode) return;
    setDeptCreating(true);
    try {
      const res = await createDepartmentAction({
        name: newDeptName,
        code: newDeptCode,
        type: "ACADEMIC",
        isActive: true,
        description: "Department created during setup wizard",
      });
      if (res.success && res.data) {
        setDepartments((prev) => [...prev, res.data]);
        setNewDeptName("");
        setNewDeptCode("");
        await refreshStatus();
      }
    } catch (err) {
      console.error("Department creation failed", err);
    } finally {
      setDeptCreating(false);
    }
  };

  const handleQuickCreateProgram = async () => {
    const targetDeptId = newProgDeptId || departments[0]?.id;
    if (!newProgName || !newProgCode || !newProgShort || !targetDeptId) return;
    setProgCreating(true);
    try {
      const res = await createProgramAction({
        name: newProgName,
        code: newProgCode,
        shortName: newProgShort,
        type: "DEGREE",
        durationYears: 4,
        departmentId: targetDeptId,
        isActive: true,
      });
      if (res.success && res.data) {
        setPrograms((prev) => [...prev, res.data]);
        setNewProgName("");
        setNewProgCode("");
        setNewProgShort("");
        await refreshStatus();
      }
    } catch (err) {
      console.error("Program creation failed", err);
    } finally {
      setProgCreating(false);
    }
  };

  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDemoDataAction();
      if (res.success) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error("Demo seed failed", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleFinishSetup = async () => {
    setIsCompleting(true);
    try {
      const res = await completeSetupWizardAction();
      if (res.success) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error("Setup completion failed", err);
    } finally {
      setIsCompleting(false);
    }
  };

  const isStep1Unlocked = true;
  const isStep2Unlocked = Boolean(status?.profile?.name);
  const isStep3Unlocked = (status?.counts?.deptCount || departments.length) > 0;
  const isStep4Unlocked = (status?.counts?.programCount || programs.length) > 0;
  const isStep5Unlocked =
    (status?.counts?.periodCount || 0) > 0 || isStep4Unlocked;

  const canGoNext =
    (currentStep === 1 && isStep2Unlocked) ||
    (currentStep === 2 && isStep3Unlocked) ||
    (currentStep === 3 && isStep4Unlocked) ||
    (currentStep === 4 && isStep5Unlocked);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/60 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-100">
                First-Run Setup Wizard
              </h1>
              <p className="text-xs text-slate-400">
                Configure deployment defaults for{" "}
                <strong className="text-slate-200">
                  {status?.profile?.name || "College Deployment"}
                </strong>
              </p>
            </div>
          </div>

          {/* Dev Demo Skip Button */}
          {status?.allowSkipEnv && (
            <button
              type="button"
              disabled={isSeeding}
              onClick={handleSeedDemoData}
              className="flex items-center space-x-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-300 shadow-lg shadow-amber-500/10 transition-all hover:bg-amber-500/25"
            >
              {isSeeding ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <Wand2 className="h-4 w-4 text-amber-400" />
              )}
              <span>Skip & Seed Demo Data</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-6">
        {/* Step Progress Bar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {[
            {
              step: 1,
              title: "1. College Profile",
              icon: Building2,
              unlocked: isStep1Unlocked,
            },
            {
              step: 2,
              title: "2. Department",
              icon: BookOpen,
              unlocked: isStep2Unlocked,
            },
            {
              step: 3,
              title: "3. Program",
              icon: BookOpen,
              unlocked: isStep3Unlocked,
            },
            {
              step: 4,
              title: "4. Structure",
              icon: Layers,
              unlocked: isStep4Unlocked,
            },
            {
              step: 5,
              title: "5. Admin User",
              icon: ShieldCheck,
              unlocked: isStep5Unlocked,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                disabled={!item.unlocked}
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center space-x-3 rounded-2xl border p-3 text-left transition-all ${
                  isActive
                    ? "border-indigo-500 bg-indigo-600/15 font-bold text-indigo-300 shadow-lg shadow-indigo-600/10"
                    : item.unlocked
                      ? "cursor-pointer border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800/60"
                      : "cursor-not-allowed border-slate-900 bg-slate-950/40 text-slate-600 opacity-50"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : item.unlocked
                        ? "bg-slate-800 text-indigo-400"
                        : "bg-slate-950 text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate text-xs font-semibold">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step Content Panes */}
        <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md md:p-8">
          {/* STEP 1: College Profile */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">
                  Step 1: Configure College Profile
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Set the college name, address, contact numbers, and branding
                  palette.
                </p>
              </div>

              <ProfileForm
                initialProfile={
                  status?.profile || {
                    name: "",
                    primaryColor: "#4F46E5",
                    secondaryColor: "#06B6D4",
                  }
                }
                onSuccess={refreshStatus}
              />
            </div>
          )}

          {/* STEP 2: First Department */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">
                  Step 2: Create First Department
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Add your institution&apos;s first academic department (e.g.
                  Computer Science & Engineering).
                </p>
              </div>

              {departments.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center space-x-2 text-sm font-bold text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Department Configured</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Existing Department:{" "}
                    <strong className="text-white">
                      {departments[0].name} ({departments[0].code})
                    </strong>
                  </p>
                </div>
              ) : (
                <div className="max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Add Primary Academic Department
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Department Name (e.g. Computer Science & Engineering)"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Code (e.g. CSE)"
                      value={newDeptCode}
                      onChange={(e) =>
                        setNewDeptCode(e.target.value.toUpperCase())
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 uppercase"
                    />
                    <button
                      type="button"
                      disabled={deptCreating || !newDeptName || !newDeptCode}
                      onClick={handleQuickCreateDepartment}
                      className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {deptCreating && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      <span>Save Department</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: First Program */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">
                  Step 3: Create First Degree Program
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Add a program under your department (e.g. B.Tech Computer
                  Science).
                </p>
              </div>

              {programs.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center space-x-2 text-sm font-bold text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Program Configured</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Existing Program:{" "}
                    <strong className="text-white">
                      {programs[0].name} ({programs[0].code})
                    </strong>
                  </p>
                </div>
              ) : (
                <div className="max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Add Primary Degree Program
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Program Name (e.g. Bachelor of Technology in CSE)"
                      value={newProgName}
                      onChange={(e) => setNewProgName(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Code (BTECH_CSE)"
                        value={newProgCode}
                        onChange={(e) =>
                          setNewProgCode(e.target.value.toUpperCase())
                        }
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 uppercase"
                      />
                      <input
                        type="text"
                        placeholder="Short Name (B.Tech)"
                        value={newProgShort}
                        onChange={(e) => setNewProgShort(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                      />
                    </div>

                    {departments.length > 1 && (
                      <select
                        value={newProgDeptId || departments[0]?.id || ""}
                        onChange={(e) => setNewProgDeptId(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      disabled={
                        progCreating ||
                        !newProgName ||
                        !newProgCode ||
                        !newProgShort
                      }
                      onClick={handleQuickCreateProgram}
                      className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {progCreating && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      <span>Save Program</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: First Academic Structure */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">
                  Step 4: Configure Academic Periods
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Configure academic periods (e.g. 8 Semesters or 4 Years) for
                  your program.
                </p>
              </div>

              {programs.length > 0 ? (
                <PeriodManager
                  programs={programs}
                  initialProgramId={programs[0].id}
                />
              ) : (
                <p className="text-xs text-amber-400">
                  Please create at least 1 Program in Step 3 before configuring
                  academic structure.
                </p>
              )}
            </div>
          )}

          {/* STEP 5: Admin Account & Final Verification */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">
                  Step 5: Verify Administrator & Complete Setup
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Verify administrator account credentials and launch your
                  deployment.
                </p>
              </div>

              <div className="max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex items-center space-x-3 text-sm font-bold text-indigo-400">
                  <ShieldCheck className="h-5 w-5" />
                  <span>College Administrator User Verified</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <p>
                    • Admin Email:{" "}
                    <strong className="font-mono text-white">
                      {currentUserEmail}
                    </strong>
                  </p>
                  <p>
                    • Department Scope:{" "}
                    <strong className="font-semibold text-white">
                      Full Institutional Scope
                    </strong>
                  </p>
                  <p>
                    • System Role:{" "}
                    <strong className="font-semibold text-indigo-400">
                      College Admin
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isCompleting}
                  onClick={handleFinishSetup}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isCompleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Complete Setup & Launch Dashboard</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Step Navigation Bar */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="flex items-center space-x-1.5 rounded-xl bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Step</span>
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
                className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:opacity-40"
              >
                <span>Next Step</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isCompleting}
                onClick={handleFinishSetup}
                className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
              >
                {isCompleting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Finish Setup</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
