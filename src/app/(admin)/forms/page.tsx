import React from "react";
import Link from "next/link";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { listFormDefinitionsService } from "@/server/services/dynamic-form.service";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FormInput,
  Settings,
  FileText,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

export default async function DynamicFormsPage() {
  const session = await requireAuth({ redirectTo: "/forms" });
  await authorize(session.user, "forms.manage");

  const formDefs = await listFormDefinitionsService(session.user);

  const getIconForCode = (code: string) => {
    switch (code) {
      case "STUDENT_FORM":
        return <UserCheck className="h-6 w-6 text-indigo-400" />;
      case "TC_REQUEST_FORM":
        return <FileText className="h-6 w-6 text-emerald-400" />;
      case "PLACEMENT_REGISTRATION_FORM":
        return <ShieldCheck className="h-6 w-6 text-cyan-400" />;
      default:
        return <FormInput className="h-6 w-6 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <FormInput className="h-8 w-8 text-indigo-400" />
          Dynamic Form Engine
        </h1>
        <p className="mt-1 text-slate-400">
          Configure runtime form layouts, add custom fields, set validation
          rules, and reorder controls for system forms.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {formDefs.map((form) => {
          const coreCount = form.fields.filter((f) => f.isCore).length;
          const customCount = form.fields.filter((f) => !f.isCore).length;

          return (
            <Card
              key={form.id}
              className="flex flex-col justify-between border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-slate-700"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
                    {getIconForCode(form.code)}
                  </div>
                  <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                    {form.code}
                  </span>
                </div>

                <div>
                  <CardTitle className="text-xl text-white">
                    {form.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-400">
                    {form.description}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-4 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-200">
                      {form.fields.length}
                    </span>{" "}
                    Total Fields
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-300">
                      {coreCount}
                    </span>{" "}
                    Core
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-300">
                      {customCount}
                    </span>{" "}
                    Custom
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  asChild
                  className="w-full bg-indigo-600 font-medium text-white hover:bg-indigo-500"
                >
                  <Link href={`/forms/${form.code}`}>
                    <Settings className="mr-2 h-4 w-4" /> Edit Form Layout
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
