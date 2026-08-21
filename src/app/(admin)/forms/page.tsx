import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { FormInput } from "lucide-react";

export default async function DynamicFormsPage() {
  const session = await requireAuth({ redirectTo: "/forms" });
  await authorize(session.user, "forms.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <FormInput className="h-8 w-8 text-indigo-400" />
          Dynamic Form Engine
        </h1>
        <p className="mt-1 text-slate-400">
          Admin-configurable form definitions and custom field mapping.
        </p>
      </div>

      <Card className="border-dashed border-slate-800 bg-slate-900/60 p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <FormInput className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white">
            Dynamic Form Builder
          </CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Runtime form layout renderer and custom input schema builders will
            be implemented in Phase 3.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
