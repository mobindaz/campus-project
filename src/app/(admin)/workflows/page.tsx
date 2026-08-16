import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GitFork } from "lucide-react";

export default async function WorkflowsPage() {
  const session = await requireAuth({ redirectTo: "/workflows" });
  await authorize(session.user, "workflow.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <GitFork className="w-8 h-8 text-indigo-400" />
          Workflow Engine
        </h1>
        <p className="text-slate-400 mt-1">
          Configure multi-step approval chains and sequential workflow conditions.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-8 text-center border-dashed">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <GitFork className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-white">Workflow Configuration</CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Configurable multi-step approval workflow builder and step instance execution engine will be implemented in Phase 7.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
