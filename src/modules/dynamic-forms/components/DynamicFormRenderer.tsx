"use client";

import React, { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDefinitionDto, FormFieldDto } from "../types";
import { generateDynamicZodSchema } from "@/server/services/dynamic-form.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface DynamicFormRendererProps {
  formDefinition: FormDefinitionDto;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValues?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  isLoading?: boolean;
  submitLabel?: string;
  optionsData?: {
    programs?: { id: string; name: string; code: string }[];
    departments?: { id: string; name: string; code: string }[];
    batches?: { id: string; name: string; code: string }[];
    academicPeriods?: { id: string; name: string; code: string }[];
    students?: { id: string; name: string; registerNumber: string }[];
    placementDrives?: { id: string; title: string; companyName?: string }[];
  };
}

export function DynamicFormRenderer({
  formDefinition,
  defaultValues = {},
  onSubmit,
  isLoading = false,
  submitLabel = "Submit",
  optionsData = {},
}: DynamicFormRendererProps) {
  const activeFields = useMemo(
    () =>
      formDefinition.fields
        .filter((f) => f.isActive)
        .sort((a, b) => a.order - b.order),
    [formDefinition.fields]
  );

  const schema = useMemo(
    () => generateDynamicZodSchema(activeFields),
    [activeFields]
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const renderField = (field: FormFieldDto) => {
    switch (field.type) {
      case "TEXTAREA":
        return (
          <textarea
            id={field.fieldKey}
            rows={4}
            {...register(field.fieldKey)}
            placeholder={field.placeholder || ""}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        );

      case "DROPDOWN": {
        const options = Array.isArray(field.options) ? field.options : [];
        return (
          <select
            id={field.fieldKey}
            {...register(field.fieldKey)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select {field.label} --</option>
            {options.map((opt, idx) => {
              const val =
                typeof opt === "string" ? opt : String(opt.value || opt.label);
              const lbl =
                typeof opt === "string" ? opt : String(opt.label || opt.value);
              return (
                <option key={idx} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
        );
      }

      case "RADIO": {
        const options = Array.isArray(field.options) ? field.options : [];
        return (
          <div className="space-y-2 pt-1">
            {options.map((opt, idx) => {
              const val =
                typeof opt === "string" ? opt : String(opt.value || opt.label);
              const lbl =
                typeof opt === "string" ? opt : String(opt.label || opt.value);
              return (
                <label
                  key={idx}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <input
                    type="radio"
                    value={val}
                    {...register(field.fieldKey)}
                    className="h-4 w-4 border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  {lbl}
                </label>
              );
            })}
          </div>
        );
      }

      case "CHECKBOX":
        return (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id={field.fieldKey}
              {...register(field.fieldKey)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-300">
              {field.helpText || field.label}
            </span>
          </div>
        );

      case "MULTI_SELECT": {
        const options = Array.isArray(field.options) ? field.options : [];
        return (
          <Controller
            name={field.fieldKey}
            control={control}
            defaultValue={defaultValues[field.fieldKey] || []}
            render={({ field: controllerField }) => {
              const currentValues: string[] = Array.isArray(
                controllerField.value
              )
                ? controllerField.value
                : [];
              return (
                <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-700 bg-slate-900 p-3">
                  {options.map((opt, idx) => {
                    const val =
                      typeof opt === "string"
                        ? opt
                        : String(opt.value || opt.label);
                    const lbl =
                      typeof opt === "string"
                        ? opt
                        : String(opt.label || opt.value);
                    const isChecked = currentValues.includes(val);

                    return (
                      <label
                        key={idx}
                        className="flex items-center gap-2 text-sm text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              controllerField.onChange([...currentValues, val]);
                            } else {
                              controllerField.onChange(
                                currentValues.filter((v) => v !== val)
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                        />
                        {lbl}
                      </label>
                    );
                  })}
                </div>
              );
            }}
          />
        );
      }

      case "PROGRAM_SELECT":
        return (
          <select
            id={field.fieldKey}
            {...register(field.fieldKey)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Degree Program --</option>
            {optionsData.programs?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        );

      case "DEPARTMENT_SELECT":
        return (
          <select
            id={field.fieldKey}
            {...register(field.fieldKey)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Department --</option>
            {optionsData.departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        );

      case "BATCH_SELECT":
        return (
          <select
            id={field.fieldKey}
            {...register(field.fieldKey)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Admission Batch --</option>
            {optionsData.batches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        );

      case "ACADEMIC_PERIOD_SELECT":
        return (
          <select
            id={field.fieldKey}
            {...register(field.fieldKey)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Academic Period / Semester --</option>
            {optionsData.academicPeriods?.map((ap) => (
              <option key={ap.id} value={ap.id}>
                {ap.name} ({ap.code})
              </option>
            ))}
          </select>
        );

      case "STUDENT_SELECT":
        return (
          <select
            id={field.fieldKey}
            {...register(field.fieldKey)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Student --</option>
            {optionsData.students?.map((s) => (
              <option key={s.id} value={s.registerNumber || s.id}>
                {s.name} ({s.registerNumber})
              </option>
            ))}
          </select>
        );

      case "DRIVE_SELECT":
        return (
          <select
            id={field.fieldKey}
            {...register(field.fieldKey)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Placement Drive --</option>
            {optionsData.placementDrives?.map((pd) => (
              <option key={pd.id} value={pd.id}>
                {pd.title} {pd.companyName ? `(${pd.companyName})` : ""}
              </option>
            ))}
          </select>
        );

      case "NUMBER":
      case "DECIMAL":
      case "CURRENCY":
        return (
          <Input
            id={field.fieldKey}
            type="number"
            step={field.type === "NUMBER" ? "1" : "any"}
            {...register(field.fieldKey)}
            placeholder={field.placeholder || ""}
            className="border-slate-700 bg-slate-900 text-white"
          />
        );

      case "DATE":
        return (
          <Input
            id={field.fieldKey}
            type="date"
            {...register(field.fieldKey)}
            className="border-slate-700 bg-slate-900 text-white"
          />
        );

      case "DATETIME":
        return (
          <Input
            id={field.fieldKey}
            type="datetime-local"
            {...register(field.fieldKey)}
            className="border-slate-700 bg-slate-900 text-white"
          />
        );

      case "EMAIL":
        return (
          <Input
            id={field.fieldKey}
            type="email"
            {...register(field.fieldKey)}
            placeholder={field.placeholder || "email@domain.com"}
            className="border-slate-700 bg-slate-900 text-white"
          />
        );

      case "PHONE":
        return (
          <Input
            id={field.fieldKey}
            type="tel"
            {...register(field.fieldKey)}
            placeholder={field.placeholder || "+91 ..."}
            className="border-slate-700 bg-slate-900 text-white"
          />
        );

      case "TEXT":
      default:
        return (
          <Input
            id={field.fieldKey}
            type="text"
            {...register(field.fieldKey)}
            placeholder={field.placeholder || ""}
            className="border-slate-700 bg-slate-900 text-white"
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {activeFields.map((field) => (
        <div key={field.id || field.fieldKey} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={field.fieldKey}
              className="text-sm font-medium text-slate-200"
            >
              {field.label}
              {field.required && <span className="ml-1 text-red-400">*</span>}
            </Label>
            {field.isCore && (
              <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                Core
              </span>
            )}
          </div>

          {renderField(field)}

          {field.helpText && field.type !== "CHECKBOX" && (
            <p className="text-xs text-slate-400">{field.helpText}</p>
          )}

          {errors[field.fieldKey] && (
            <p className="text-xs font-medium text-red-400">
              {errors[field.fieldKey]?.message as string}
            </p>
          )}
        </div>
      ))}

      <div className="pt-3">
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
        >
          {isLoading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
