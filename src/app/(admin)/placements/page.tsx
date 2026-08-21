import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default async function PlacementsPage() {
  const session = await requireAuth({ redirectTo: "/placements" });
  await authorize(session.user, "placement.read");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <Briefcase className="h-8 w-8 text-indigo-400" />
          Placement Management
        </h1>
        <p className="mt-1 text-slate-400">
          Campus recruitment drives, company profiles, and student
          registrations.
        </p>
      </div>

      <Card className="border-dashed border-slate-800 bg-slate-900/60 p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white">
            Placement Drive Engine
          </CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Placement drives, eligibility criteria evaluation, company
            registrations, and result publication will be implemented in Phase
            6.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
