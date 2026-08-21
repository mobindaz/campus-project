"use client";

import React from "react";
import {
  UseFormRegister,
  FieldErrors,
  UseFormSetValue,
  UseFormWatch,
  FieldValues,
} from "react-hook-form";
import {
  CustomFieldDefinitionDto,
  CustomFieldType,
} from "@/modules/custom-fields/types";
import { HelpCircle, FileText, Image as ImageIcon, Check } from "lucide-react";

export interface CustomFieldRendererProps {
  fields: CustomFieldDefinitionDto[];
  register?: UseFormRegister<FieldValues>;
  errors?: FieldErrors<FieldValues>;
  setValue?: UseFormSetValue<FieldValues>;
  watch?: UseFormWatch<FieldValues>;
  disabled?: boolean;
  values?: Record<string, unknown>;
  onChange?: (name: string, value: unknown) => void;
  className?: string;
}

export function CustomFieldRenderer({
  fields,
  register,
  errors = {},
  setValue,
  watch,
  disabled = false,
  values = {},
  onChange,
  className = "space-y-4",
}: CustomFieldRendererProps) {
  const activeFields = fields
    .filter((f) => f.isActive !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (activeFields.length === 0) {
    return null;
  }

  const handleFieldChange = (name: string, val: unknown) => {
    if (setValue) {
      setValue(name, val, { shouldValidate: true, shouldDirty: true });
    }
    if (onChange) {
      onChange(name, val);
    }
  };

  const parseOptions = (options: unknown) => {
    if (!options || !Array.isArray(options)) return [];
    return options.map((opt) => {
      if (typeof opt === "string") return { label: opt, value: opt };
      if (typeof opt === "object" && opt !== null) {
        const obj = opt as Record<string, unknown>;
        return {
          label: String(obj.label || obj.value || opt),
          value: String(obj.value || obj.label || opt),
        };
      }
      return { label: String(opt), value: String(opt) };
    });
  };

  return (
    <div className={className}>
      {activeFields.map((field) => {
        const fieldName = field.name;
        const formKey = `customFields.${fieldName}`;
        const error =
          (errors?.customFields as Record<string, { message?: string }>)?.[
            fieldName
          ] || (errors as Record<string, { message?: string }>)?.[fieldName];
        const errorMessage = error?.message ? String(error.message) : null;
        const fieldValue = watch
          ? watch(formKey)
          : (values[fieldName] ??
            (values?.customFields as Record<string, unknown>)?.[fieldName] ??
            field.defaultValue ??
            "");

        const options = parseOptions(field.options);

        return (
          <div key={field.id || field.name} className="space-y-1.5">
            {/* Label & Required Star */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1 text-xs font-semibold text-slate-300">
                <span>{field.label}</span>
                {field.required && (
                  <span className="font-bold text-red-400">*</span>
                )}
              </label>
              {field.helpText && (
                <div className="group relative flex items-center">
                  <HelpCircle className="h-3.5 w-3.5 cursor-help text-slate-500 hover:text-slate-400" />
                  <div className="absolute right-0 bottom-full z-20 mb-1 hidden w-48 rounded-lg border border-slate-700 bg-slate-900 p-2 text-[11px] text-slate-300 shadow-xl group-hover:block">
                    {field.helpText}
                  </div>
                </div>
              )}
            </div>

            {/* Input Component based on Type */}
            {(() => {
              switch (field.type as CustomFieldType) {
                case "TEXT":
                  return (
                    <input
                      type="text"
                      disabled={disabled}
                      placeholder={
                        field.helpText || `Enter ${field.label.toLowerCase()}`
                      }
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "TEXTAREA":
                  return (
                    <textarea
                      disabled={disabled}
                      rows={3}
                      placeholder={
                        field.helpText || `Enter ${field.label.toLowerCase()}`
                      }
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "NUMBER":
                  return (
                    <input
                      type="number"
                      step={1}
                      disabled={disabled}
                      placeholder="0"
                      {...(register
                        ? register(formKey, { valueAsNumber: true })
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(
                                fieldName,
                                e.target.value === ""
                                  ? ""
                                  : parseInt(e.target.value, 10)
                              ),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "DECIMAL":
                  return (
                    <input
                      type="number"
                      step="any"
                      disabled={disabled}
                      placeholder="0.00"
                      {...(register
                        ? register(formKey, { valueAsNumber: true })
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(
                                fieldName,
                                e.target.value === ""
                                  ? ""
                                  : parseFloat(e.target.value)
                              ),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "CURRENCY":
                  return (
                    <div className="relative">
                      <span className="absolute top-2.5 left-3 text-sm font-semibold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        disabled={disabled}
                        placeholder="0.00"
                        {...(register
                          ? register(formKey, { valueAsNumber: true })
                          : {
                              value: fieldValue,
                              onChange: (e) =>
                                handleFieldChange(
                                  fieldName,
                                  e.target.value === ""
                                    ? ""
                                    : parseFloat(e.target.value)
                                ),
                            })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pr-3 pl-7 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  );

                case "EMAIL":
                  return (
                    <input
                      type="email"
                      disabled={disabled}
                      placeholder="name@example.com"
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "PHONE":
                  return (
                    <input
                      type="tel"
                      disabled={disabled}
                      placeholder="+91 98765 43210"
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "URL":
                  return (
                    <input
                      type="url"
                      disabled={disabled}
                      placeholder="https://example.com"
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "DATE":
                  return (
                    <input
                      type="date"
                      disabled={disabled}
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "DATETIME":
                  return (
                    <input
                      type="datetime-local"
                      disabled={disabled}
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    />
                  );

                case "DROPDOWN":
                  return (
                    <select
                      disabled={disabled}
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Select an option...</option>
                      {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  );

                case "RADIO":
                  return (
                    <div className="flex flex-wrap gap-4 pt-1">
                      {options.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center space-x-2 text-sm text-slate-300"
                        >
                          <input
                            type="radio"
                            disabled={disabled}
                            value={opt.value}
                            checked={fieldValue === opt.value}
                            {...(register
                              ? register(formKey)
                              : {
                                  onChange: (e) =>
                                    handleFieldChange(
                                      fieldName,
                                      e.target.value
                                    ),
                                })}
                            className="h-4 w-4 border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  );

                case "CHECKBOX":
                  return (
                    <div className="flex items-center space-x-3 pt-1">
                      <input
                        type="checkbox"
                        id={`cb-${field.id || fieldName}`}
                        disabled={disabled}
                        checked={Boolean(fieldValue)}
                        {...(register
                          ? register(formKey)
                          : {
                              onChange: (e) =>
                                handleFieldChange(fieldName, e.target.checked),
                            })}
                        className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor={`cb-${field.id || fieldName}`}
                        className="cursor-pointer text-sm font-medium text-slate-300"
                      >
                        {field.helpText || field.label}
                      </label>
                    </div>
                  );

                case "MULTI_SELECT": {
                  const currentList: string[] = Array.isArray(fieldValue)
                    ? fieldValue
                    : [];
                  const toggleOption = (optVal: string) => {
                    const newList = currentList.includes(optVal)
                      ? currentList.filter((v) => v !== optVal)
                      : [...currentList, optVal];
                    handleFieldChange(fieldName, newList);
                  };

                  return (
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 pt-1">
                      {options.map((opt) => {
                        const isChecked = currentList.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleOption(opt.value)}
                            className={`flex items-center space-x-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                              isChecked
                                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <div
                              className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                                isChecked
                                  ? "border-indigo-500 bg-indigo-600 text-white"
                                  : "border-slate-700 bg-slate-950"
                              }`}
                            >
                              {isChecked && (
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              )}
                            </div>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                case "FILE":
                  return (
                    <div className="flex items-center space-x-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <FileText className="h-5 w-5 flex-shrink-0 text-indigo-400" />
                      <input
                        type="text"
                        disabled={disabled}
                        placeholder="File URL or upload key"
                        {...(register
                          ? register(formKey)
                          : {
                              value: fieldValue,
                              onChange: (e) =>
                                handleFieldChange(fieldName, e.target.value),
                            })}
                        className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  );

                case "IMAGE":
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <ImageIcon className="h-5 w-5 flex-shrink-0 text-indigo-400" />
                        <input
                          type="text"
                          disabled={disabled}
                          placeholder="Image URL or upload key"
                          {...(register
                            ? register(formKey)
                            : {
                                value: fieldValue,
                                onChange: (e) =>
                                  handleFieldChange(fieldName, e.target.value),
                              })}
                          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>
                      {fieldValue &&
                        typeof fieldValue === "string" &&
                        fieldValue.startsWith("http") && (
                          <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fieldValue as string}
                              alt={field.label}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                    </div>
                  );

                default:
                  return (
                    <input
                      type="text"
                      disabled={disabled}
                      {...(register
                        ? register(formKey)
                        : {
                            value: fieldValue,
                            onChange: (e) =>
                              handleFieldChange(fieldName, e.target.value),
                          })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  );
              }
            })()}

            {/* Error Message */}
            {errorMessage && (
              <p className="text-[11px] font-medium text-red-400">
                {errorMessage}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
