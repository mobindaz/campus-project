"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  Save,
  User,
  GraduationCap,
  Building2,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudentAction, updateStudentAction } from "../actions";
import type { StudentWithRelationsDto, StudentFormOptionsData } from "../types";
import type { CustomFieldDefinitionDto } from "@/modules/custom-fields/types";

export interface StudentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: StudentWithRelationsDto) => void;
  student?: StudentWithRelationsDto | null;
  options: StudentFormOptionsData;
  customFields?: CustomFieldDefinitionDto[];
}

function StudentFormModalContent({
  onClose,
  onSuccess,
  student,
  options,
  customFields = [],
}: Omit<StudentFormDialogProps, "isOpen">) {
  const isEdit = Boolean(student?.id);

  // Initial custom fields calculation
  const initialCustomFields = useMemo<Record<string, unknown>>(() => {
    if (student) {
      return typeof student.customFields === "object" &&
        student.customFields !== null
        ? { ...(student.customFields as Record<string, unknown>) }
        : {};
    }
    const defaults: Record<string, unknown> = {};
    customFields.forEach((cf) => {
      if (cf.defaultValue !== undefined && cf.defaultValue !== null) {
        defaults[cf.name] = cf.defaultValue;
      }
    });
    return defaults;
  }, [student, customFields]);

  // Core form state
  const [registerNumber, setRegisterNumber] = useState(
    student?.registerNumber || ""
  );
  const [name, setName] = useState(student?.name || "");
  const [email, setEmail] = useState(student?.email || "");
  const [phone, setPhone] = useState(student?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(() => {
    if (!student?.dateOfBirth) return "";
    const d = new Date(student.dateOfBirth);
    return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
  });
  const [programId, setProgramId] = useState(
    student?.programId || options.programs[0]?.id || ""
  );
  const [departmentId, setDepartmentId] = useState(
    student?.departmentId || options.departments[0]?.id || ""
  );
  const [batchId, setBatchId] = useState(
    student?.batchId || options.batches[0]?.id || ""
  );
  const [academicPeriodId, setAcademicPeriodId] = useState(
    student?.academicPeriodId || options.academicPeriods[0]?.id || ""
  );
  const [isActive, setIsActive] = useState(
    student?.isActive !== undefined ? student.isActive : true
  );

  // Custom fields state
  const [customFieldValues, setCustomFieldValues] =
    useState<Record<string, unknown>>(initialCustomFields);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cascading filters for departments, batches, and academic periods based on selected program
  const filteredDepartments = useMemo(() => {
    if (!programId) return options.departments;
    return options.departments.filter(
      (d) => !d.programId || d.programId === programId
    );
  }, [options.departments, programId]);

  const filteredBatches = useMemo(() => {
    if (!programId) return options.batches;
    return options.batches.filter((b) => b.programId === programId);
  }, [options.batches, programId]);

  const filteredAcademicPeriods = useMemo(() => {
    if (!programId) return options.academicPeriods;
    return options.academicPeriods
      .filter((p) => p.programId === programId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [options.academicPeriods, programId]);

  // If program changes, auto-select valid defaults if current selection is invalid
  const handleProgramChange = (newProgramId: string) => {
    setProgramId(newProgramId);

    const depts = options.departments.filter(
      (d) => !d.programId || d.programId === newProgramId
    );
    if (!depts.some((d) => d.id === departmentId)) {
      setDepartmentId(depts[0]?.id || "");
    }

    const bts = options.batches.filter((b) => b.programId === newProgramId);
    if (!bts.some((b) => b.id === batchId)) {
      setBatchId(bts[0]?.id || "");
    }

    const periods = options.academicPeriods.filter(
      (p) => p.programId === newProgramId
    );
    if (!periods.some((p) => p.id === academicPeriodId)) {
      setAcademicPeriodId(periods[0]?.id || "");
    }
  };

  const handleCustomFieldChange = (fieldName: string, value: unknown) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (!registerNumber.trim()) {
        throw new Error("Register Number is required.");
      }
      if (!name.trim()) {
        throw new Error("Full Name is required.");
      }
      if (!programId) {
        throw new Error("Degree Program is required.");
      }
      if (!batchId) {
        throw new Error("Admission Batch is required.");
      }
      if (!academicPeriodId) {
        throw new Error("Academic Period is required.");
      }

      const payload = {
        registerNumber: registerNumber.trim(),
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        programId,
        departmentId: departmentId || null,
        batchId,
        academicPeriodId,
        isActive,
        customFields: customFieldValues,
      };

      if (isEdit && student) {
        const res = await updateStudentAction(student.id, payload);
        if (res.success && res.data) {
          onSuccess(res.data as unknown as StudentWithRelationsDto);
          onClose();
        } else {
          setErrorMsg(res.error || "Failed to update student.");
        }
      } else {
        const res = await createStudentAction(payload);
        if (res.success && res.data) {
          onSuccess(res.data as unknown as StudentWithRelationsDto);
          onClose();
        } else {
          setErrorMsg(res.error || "Failed to create student.");
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm duration-200">
      <div className="max-h-[92vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEdit ? "Edit Student Profile" : "Register New Student"}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit
                  ? `Updating record for ${student?.name} (${student?.registerNumber})`
                  : "Create a new first-class student record with academic linkages"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Core Personal Details */}
          <div className="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
              <User className="h-4 w-4" /> Personal & Identity Details
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="registerNumber"
                  className="text-xs font-medium text-slate-300"
                >
                  Register Number / Roll No{" "}
                  <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Hash className="absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="registerNumber"
                    value={registerNumber}
                    onChange={(e) =>
                      setRegisterNumber(e.target.value.toUpperCase())
                    }
                    placeholder="e.g. 2026CSE001"
                    className="border-slate-800 bg-slate-900 pl-9 font-mono text-white placeholder-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="name"
                  className="text-xs font-medium text-slate-300"
                >
                  Full Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alexander Pierce"
                  className="border-slate-800 bg-slate-900 text-white placeholder-slate-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-medium text-slate-300"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alexander@college.edu"
                  className="border-slate-800 bg-slate-900 text-white placeholder-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="phone"
                  className="text-xs font-medium text-slate-300"
                >
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="border-slate-800 bg-slate-900 text-white placeholder-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="dateOfBirth"
                  className="text-xs font-medium text-slate-300"
                >
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="border-slate-800 bg-slate-900 text-white"
                />
              </div>

              <div className="flex items-center space-x-3 pt-6">
                <label className="flex cursor-pointer items-center space-x-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Active Student Status</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Academic Linkages */}
          <div className="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
              <GraduationCap className="h-4 w-4" /> Academic Structure Linkage
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="programId"
                  className="text-xs font-medium text-slate-300"
                >
                  Degree Program <span className="text-red-400">*</span>
                </Label>
                <select
                  id="programId"
                  value={programId}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Select Program --</option>
                  {options.programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="departmentId"
                  className="text-xs font-medium text-slate-300"
                >
                  Academic Department
                </Label>
                <select
                  id="departmentId"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Department --</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="batchId"
                  className="text-xs font-medium text-slate-300"
                >
                  Admission Batch <span className="text-red-400">*</span>
                </Label>
                <select
                  id="batchId"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Select Batch --</option>
                  {filteredBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="academicPeriodId"
                  className="text-xs font-medium text-slate-300"
                >
                  Academic Period / Semester{" "}
                  <span className="text-red-400">*</span>
                </Label>
                <select
                  id="academicPeriodId"
                  value={academicPeriodId}
                  onChange={(e) => setAcademicPeriodId(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Select Period / Semester --</option>
                  {filteredAcademicPeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic Custom Fields (Phase 3 Engine) */}
          {customFields.length > 0 && (
            <div className="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
                  <Building2 className="h-4 w-4" /> College-Specific Custom
                  Fields
                </h3>
                <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  Phase 3 Engine
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {customFields
                  .filter((cf) => cf.isActive)
                  .sort((a, b) => a.order - b.order)
                  .map((field) => {
                    const value = customFieldValues[field.name];

                    return (
                      <div key={field.id} className="space-y-1.5">
                        <Label
                          htmlFor={`custom_${field.name}`}
                          className="text-xs font-medium text-slate-300"
                        >
                          {field.label}
                          {field.required && (
                            <span className="ml-1 text-red-400">*</span>
                          )}
                        </Label>

                        {field.type === "TEXTAREA" ? (
                          <textarea
                            id={`custom_${field.name}`}
                            value={typeof value === "string" ? value : ""}
                            onChange={(e) =>
                              handleCustomFieldChange(
                                field.name,
                                e.target.value
                              )
                            }
                            rows={3}
                            placeholder={field.helpText || ""}
                            className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                            required={field.required}
                          />
                        ) : field.type === "DROPDOWN" ||
                          field.type === "RADIO" ? (
                          <select
                            id={`custom_${field.name}`}
                            value={typeof value === "string" ? value : ""}
                            onChange={(e) =>
                              handleCustomFieldChange(
                                field.name,
                                e.target.value
                              )
                            }
                            className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                            required={field.required}
                          >
                            <option value="">-- Select {field.label} --</option>
                            {Array.isArray(field.options) &&
                              field.options.map((opt, idx) => {
                                const val =
                                  typeof opt === "string"
                                    ? opt
                                    : String(
                                        (
                                          opt as {
                                            value?: unknown;
                                            label?: unknown;
                                          }
                                        ).value ||
                                          (
                                            opt as {
                                              value?: unknown;
                                              label?: unknown;
                                            }
                                          ).label
                                      );
                                const lbl =
                                  typeof opt === "string"
                                    ? opt
                                    : String(
                                        (
                                          opt as {
                                            value?: unknown;
                                            label?: unknown;
                                          }
                                        ).label ||
                                          (
                                            opt as {
                                              value?: unknown;
                                              label?: unknown;
                                            }
                                          ).value
                                      );
                                return (
                                  <option key={idx} value={val}>
                                    {lbl}
                                  </option>
                                );
                              })}
                          </select>
                        ) : field.type === "CHECKBOX" ? (
                          <div className="pt-2">
                            <label className="flex items-center space-x-2 text-sm text-slate-300">
                              <input
                                type="checkbox"
                                checked={Boolean(value)}
                                onChange={(e) =>
                                  handleCustomFieldChange(
                                    field.name,
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{field.helpText || field.label}</span>
                            </label>
                          </div>
                        ) : field.type === "NUMBER" ||
                          field.type === "DECIMAL" ||
                          field.type === "CURRENCY" ? (
                          <Input
                            id={`custom_${field.name}`}
                            type="number"
                            step={field.type === "NUMBER" ? "1" : "any"}
                            value={
                              value !== undefined && value !== null
                                ? String(value)
                                : ""
                            }
                            onChange={(e) =>
                              handleCustomFieldChange(
                                field.name,
                                e.target.value ? Number(e.target.value) : ""
                              )
                            }
                            placeholder={field.helpText || ""}
                            className="border-slate-800 bg-slate-900 text-white placeholder-slate-500"
                            required={field.required}
                          />
                        ) : field.type === "DATE" ? (
                          <Input
                            id={`custom_${field.name}`}
                            type="date"
                            value={
                              value
                                ? typeof value === "string"
                                  ? value.split("T")[0]
                                  : ""
                                : ""
                            }
                            onChange={(e) =>
                              handleCustomFieldChange(
                                field.name,
                                e.target.value
                              )
                            }
                            className="border-slate-800 bg-slate-900 text-white"
                            required={field.required}
                          />
                        ) : (
                          <Input
                            id={`custom_${field.name}`}
                            type="text"
                            value={typeof value === "string" ? value : ""}
                            onChange={(e) =>
                              handleCustomFieldChange(
                                field.name,
                                e.target.value
                              )
                            }
                            placeholder={field.helpText || ""}
                            className="border-slate-800 bg-slate-900 text-white placeholder-slate-500"
                            required={field.required}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />{" "}
                  {isEdit ? "Update Student Record" : "Create Student Record"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StudentFormDialog(props: StudentFormDialogProps) {
  if (!props.isOpen) return null;

  return (
    <StudentFormModalContent
      key={props.student?.id || "create-new-student"}
      {...props}
    />
  );
}
