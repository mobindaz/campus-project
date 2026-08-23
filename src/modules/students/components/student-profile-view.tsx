"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Building2,
  Calendar,
  Mail,
  Phone,
  ArrowLeft,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Hash,
  Clock,
  Sparkles,
  Briefcase,
  FileCheck,
  ShieldAlert,
  UserCheck,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { StudentCustomFieldsCard } from "./student-custom-fields-card";
import { StudentFormDialog } from "./student-form-dialog";
import { deleteStudentAction, toggleStudentStatusAction } from "../actions";
import type { StudentWithRelationsDto, StudentFormOptionsData } from "../types";
import type { CustomFieldDefinitionDto } from "@/modules/custom-fields/types";

export interface StudentProfileViewProps {
  student: StudentWithRelationsDto;
  customFieldDefinitions: CustomFieldDefinitionDto[];
  options: StudentFormOptionsData;
  auditLogs: {
    id: string;
    action: string;
    userEmail: string | null;
    createdAt: Date | string;
    details?: Record<string, unknown> | null;
  }[];
  permissions: string[];
}

function getCalculatedAge(
  dob: Date | string | null | undefined
): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const birthYear = birthDate.getFullYear();
  const currentYear = new Date().getFullYear();
  const calculated = currentYear - birthYear;
  return calculated >= 0 ? calculated : null;
}

export function StudentProfileView({
  student: initialStudent,
  customFieldDefinitions,
  options,
  auditLogs,
  permissions,
}: StudentProfileViewProps) {
  const router = useRouter();
  const [student, setStudent] =
    useState<StudentWithRelationsDto>(initialStudent);
  const [activeTab, setActiveTab] = useState<
    "overview" | "academic" | "custom_fields" | "modules" | "audit"
  >("overview");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [copiedRegNo, setCopiedRegNo] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = permissions.includes("students.update");
  const canDelete = permissions.includes("students.delete");

  const handleCopyRegisterNumber = () => {
    navigator.clipboard.writeText(student.registerNumber);
    setCopiedRegNo(true);
    setTimeout(() => setCopiedRegNo(false), 2000);
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      const res = await toggleStudentStatusAction(
        student.id,
        !student.isActive
      );
      if (res.success && res.data) {
        setStudent((prev) => ({
          ...prev,
          isActive: !prev.isActive,
        }));
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteStudentAction(student.id);
      if (res.success) {
        router.push("/students");
      } else {
        setDeleteError(res.error || "Failed to delete student.");
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const age = getCalculatedAge(student.dateOfBirth);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Return Nav */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="outline"
          className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Link href="/students">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students Directory
          </Link>
        </Button>

        <div className="flex items-center space-x-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={handleToggleStatus}
                disabled={isToggling}
                className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {student.isActive ? (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4 text-emerald-400" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4 text-slate-500" />
                    <span>Inactive</span>
                  </>
                )}
              </Button>

              <Button
                onClick={() => setIsEditOpen(true)}
                className="bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
              >
                <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            </>
          )}

          {canDelete && (
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(true)}
              className="border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <Card className="relative overflow-hidden border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 shadow-2xl">
        <div className="pointer-events-none absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent" />

        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-5">
              {/* Avatar Initial Circle */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-600 to-indigo-800 text-2xl font-bold text-white shadow-xl shadow-indigo-600/20">
                {student.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {student.name}
                  </h1>

                  <button
                    onClick={handleCopyRegisterNumber}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-400 transition-colors hover:border-indigo-500/50 hover:bg-slate-900"
                    title="Click to copy register number"
                  >
                    <Hash className="h-3 w-3" />
                    <span>{student.registerNumber}</span>
                    {copiedRegNo ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-500" />
                    )}
                  </button>

                  {student.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Active Student
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                      <XCircle className="h-3 w-3" /> Inactive Record
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  {student.program && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                      {student.program.name} ({student.program.code})
                    </span>
                  )}

                  {student.department && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                      {student.department.name}
                    </span>
                  )}

                  {student.batch && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      Batch {student.batch.name} ({student.batch.academicYear})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 border-t border-slate-800/80 pt-4 sm:border-t-0 sm:pt-0">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
                <span className="text-[11px] font-medium text-slate-400">
                  Current Period
                </span>
                <p className="font-mono text-sm font-bold text-white">
                  {student.academicPeriod?.name || "Semester 1"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
                <span className="text-[11px] font-medium text-slate-400">
                  Graduation
                </span>
                <p className="font-mono text-sm font-bold text-indigo-400">
                  {student.batch?.graduationYear || "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "overview"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserCheck className="h-4 w-4" /> Personal Overview
        </button>

        <button
          onClick={() => setActiveTab("academic")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "academic"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <GraduationCap className="h-4 w-4" /> Academic Structure
        </button>

        <button
          onClick={() => setActiveTab("custom_fields")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "custom_fields"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4" /> Custom Fields (
          {customFieldDefinitions.length})
        </button>

        <button
          onClick={() => setActiveTab("modules")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "modules"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Briefcase className="h-4 w-4" /> Placements & Clearances
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "audit"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="h-4 w-4" /> Audit History ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Identity Details Card */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-base text-white">
                Personal Identity & Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span className="text-xs text-slate-400">Full Name</span>
                <span className="text-sm font-semibold text-white">
                  {student.name}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span className="text-xs text-slate-400">Register Number</span>
                <span className="font-mono text-sm font-semibold text-indigo-400">
                  {student.registerNumber}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span className="text-xs text-slate-400">Date of Birth</span>
                <span className="text-sm text-slate-200">
                  {student.dateOfBirth
                    ? new Date(student.dateOfBirth).toLocaleDateString(
                        "en-US",
                        {
                          dateStyle: "long",
                        }
                      )
                    : "Not provided"}
                  {age !== null && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({age} years old)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span className="text-xs text-slate-400">
                  Enrollment Status
                </span>
                <span className="text-sm font-semibold text-white">
                  {student.isActive ? (
                    <span className="text-emerald-400">Enrolled & Active</span>
                  ) : (
                    <span className="text-slate-400">Inactive / Suspended</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Created On</span>
                <span className="text-xs text-slate-400">
                  {new Date(student.createdAt).toLocaleDateString("en-US", {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details Card */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-base text-white">
                Contact & Communication Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <Mail className="h-4 w-4 text-slate-500" /> Email Address
                </span>
                {student.email ? (
                  <a
                    href={`mailto:${student.email}`}
                    className="text-sm font-medium text-indigo-400 hover:underline"
                  >
                    {student.email}
                  </a>
                ) : (
                  <span className="text-xs text-slate-600 italic">
                    None recorded
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <Phone className="h-4 w-4 text-slate-500" /> Phone Number
                </span>
                {student.phone ? (
                  <a
                    href={`tel:${student.phone}`}
                    className="font-mono text-sm text-slate-200 hover:text-indigo-300"
                  >
                    {student.phone}
                  </a>
                ) : (
                  <span className="text-xs text-slate-600 italic">
                    None recorded
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span className="text-xs text-slate-400">Department Scope</span>
                <span className="text-sm text-slate-200">
                  {student.department?.name || "College-wide (No Dept)"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Last Profile Update
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(student.updatedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Academic Details */}
      {activeTab === "academic" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Program Card */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2 text-indigo-400">
                <GraduationCap className="h-5 w-5" />
                <CardTitle className="text-sm">Degree Program</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-bold text-white">
                {student.program?.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-xs font-bold text-indigo-400">
                  {student.program?.code}
                </span>
                <span className="text-xs text-slate-400">
                  {student.program?.durationYears} Years Duration
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Department Card */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-sm">Department</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-bold text-white">
                {student.department?.name || "Not Assigned"}
              </p>
              {student.department && (
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                    {student.department.code}
                  </span>
                  <span className="text-xs text-slate-400">
                    {student.department.type || "Academic"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Card */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Calendar className="h-5 w-5" />
                <CardTitle className="text-sm">Admission Batch</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-bold text-white">
                {student.batch?.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{student.batch?.academicYear}</span>
                <span>•</span>
                <span>
                  {student.batch?.admissionYear} –{" "}
                  {student.batch?.graduationYear}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Academic Period Card */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Clock className="h-5 w-5" />
                <CardTitle className="text-sm">Academic Period</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-bold text-white">
                {student.academicPeriod?.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                  {student.academicPeriod?.code}
                </span>
                <span className="text-xs text-slate-400">
                  {student.academicPeriod?.pattern || "Semester"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Custom Fields */}
      {activeTab === "custom_fields" && (
        <StudentCustomFieldsCard
          customFields={
            typeof student.customFields === "object" &&
            student.customFields !== null
              ? (student.customFields as Record<string, unknown>)
              : {}
          }
          definitions={customFieldDefinitions}
          onOpenEdit={canEdit ? () => setIsEditOpen(true) : undefined}
        />
      )}

      {/* Tab 4: Modules Integration Status */}
      {activeTab === "modules" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Placements Module Card */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Briefcase className="h-5 w-5 text-indigo-400" />
                  Placement Module Status
                </CardTitle>
                <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                  Phase 6 Ready
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs font-medium text-slate-400">
                  Placement Eligibility & Readiness
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {student.isActive
                      ? "Eligible for Campus Drives"
                      : "Ineligible (Inactive)"}
                  </span>
                  <span className="font-mono text-xs text-emerald-400">
                    0 Active Drives
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Phase 6 Placement Management module will link campus recruitment
                drives, company registrations, attendance tracking, and offer
                result records directly to this student profile.
              </p>
            </CardContent>
          </Card>

          {/* Transfer Certificate (TC) Module Card */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <FileCheck className="h-5 w-5 text-indigo-400" />
                  Transfer Certificate (TC) Status
                </CardTitle>
                <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                  Phase 7 Ready
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs font-medium text-slate-400">
                  Clearance & Certificate Status
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    No Pending TC Requests
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    CLEARED
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Phase 7 Workflow engine will orchestrate multi-department
                approvals (Library, Hostel, Accounts, HOD) and generate
                cryptographically verified PDF certificates.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: Audit History */}
      {activeTab === "audit" && (
        <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Clock className="h-5 w-5 text-indigo-400" />
              Audit Trail & Mutation Log
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Complete history of modifications recorded per
              docs/ARCHITECTURE.md §8
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No recent audit log entries for this student.
              </p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-xs font-bold text-indigo-400">
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-400">
                          by{" "}
                          <strong className="text-slate-200">
                            {log.userEmail || "System"}
                          </strong>
                        </span>
                      </div>
                      {log.details && (
                        <pre className="max-w-xl overflow-x-auto rounded bg-slate-900 p-2 font-mono text-[11px] text-slate-300">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Student Dialog */}
      {isEditOpen && (
        <StudentFormDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={(updated) => setStudent(updated)}
          student={student}
          options={options}
          customFields={customFieldDefinitions}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">
                Delete Student Record?
              </h3>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to delete student{" "}
              <strong>{student.name}</strong> ({student.registerNumber})? If
              foreign references exist, the student will be safely deactivated
              instead of deleted per platform architecture.
            </p>

            {deleteError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 font-semibold text-white hover:bg-red-500"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
