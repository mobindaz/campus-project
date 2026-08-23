"use client";

import React from "react";
import {
  Calendar,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  XCircle,
  Tag,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { CustomFieldDefinitionDto } from "@/modules/custom-fields/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export interface StudentCustomFieldsCardProps {
  customFields: Record<string, unknown>;
  definitions: CustomFieldDefinitionDto[];
  onOpenEdit?: () => void;
}

export function StudentCustomFieldsCard({
  customFields,
  definitions,
  onOpenEdit,
}: StudentCustomFieldsCardProps) {
  const activeDefinitions = definitions
    .filter((d) => d.isActive)
    .sort((a, b) => a.order - b.order);

  if (activeDefinitions.length === 0) {
    return (
      <Card className="border-slate-800/80 bg-slate-900/60 p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg text-white">
            No Custom Fields Defined Yet
          </CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            College administrators can configure custom fields (e.g. Parent
            Contact, Hostel Resident, Blood Group, Aadhaar Number) under{" "}
            <strong>Settings &gt; Custom Fields</strong> without database
            migrations.
          </CardDescription>
        </div>
      </Card>
    );
  }

  const renderFieldValue = (def: CustomFieldDefinitionDto, value: unknown) => {
    if (value === undefined || value === null || value === "") {
      return (
        <span className="text-xs text-slate-600 italic">Not provided</span>
      );
    }

    switch (def.type) {
      case "CHECKBOX":
        return value ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Yes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400">
            <XCircle className="h-3.5 w-3.5" /> No
          </span>
        );

      case "DROPDOWN":
      case "RADIO":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300">
            <Tag className="h-3.5 w-3.5 text-indigo-400" />
            {String(value)}
          </span>
        );

      case "MULTI_SELECT": {
        const arr = Array.isArray(value) ? value : [value];
        return (
          <div className="flex flex-wrap gap-1.5">
            {arr.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-300"
              >
                {String(item)}
              </span>
            ))}
          </div>
        );
      }

      case "CURRENCY":
        return (
          <span className="font-mono text-sm font-semibold text-emerald-400">
            ₹{Number(value).toLocaleString("en-IN")}
          </span>
        );

      case "DATE": {
        const d = new Date(value as string);
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-200">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {!isNaN(d.getTime())
              ? d.toLocaleDateString("en-US", { dateStyle: "medium" })
              : String(value)}
          </span>
        );
      }

      case "DATETIME": {
        const d = new Date(value as string);
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-200">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {!isNaN(d.getTime())
              ? d.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : String(value)}
          </span>
        );
      }

      case "EMAIL":
        return (
          <a
            href={`mailto:${value}`}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            <Mail className="h-3.5 w-3.5" />
            {String(value)}
          </a>
        );

      case "PHONE":
        return (
          <a
            href={`tel:${value}`}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            <Phone className="h-3.5 w-3.5" />
            {String(value)}
          </a>
        );

      case "URL":
        return (
          <a
            href={
              String(value).startsWith("http")
                ? String(value)
                : `https://${value}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            <Globe className="h-3.5 w-3.5" />
            {String(value)}
            <ExternalLink className="h-3 w-3" />
          </a>
        );

      case "TEXTAREA":
        return (
          <p className="text-sm whitespace-pre-wrap text-slate-200">
            {String(value)}
          </p>
        );

      default:
        return (
          <span className="text-sm font-medium text-slate-200">
            {String(value)}
          </span>
        );
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
      <CardHeader className="border-b border-slate-800/80 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              College-Specific Custom Fields
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Configured dynamically by administrators without code changes
            </CardDescription>
          </div>
          {onOpenEdit && (
            <button
              onClick={onOpenEdit}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              Edit Custom Fields
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeDefinitions.map((def) => {
            const rawVal = customFields[def.name];

            return (
              <div
                key={def.id}
                className="space-y-1.5 rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 transition-colors hover:border-slate-700/80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    {def.label}
                  </span>
                  <span className="font-mono text-[10px] text-slate-600">
                    {def.type.toLowerCase()}
                  </span>
                </div>
                <div className="pt-1">{renderFieldValue(def, rawVal)}</div>
                {def.helpText && (
                  <p className="pt-1 text-[11px] text-slate-500">
                    {def.helpText}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
