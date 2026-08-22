import React from "react";
import Link from "next/link";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { TcRequestFormModal } from "@/modules/tc/components/TcRequestFormModal";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Settings } from "lucide-react";

export default async function TCPage() {
  const session = await requireAuth({ redirectTo: "/tc" });
  await authorize(session.user, "tc.read");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
            <FileCheck className="h-8 w-8 text-indigo-400" />
            Transfer Certificate (TC) Management
          </h1>
          <p className="mt-1 text-slate-400">
            TC requests, clearance tracking, and certificate generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Link href="/forms/TC_REQUEST_FORM">
              <Settings className="mr-2 h-4 w-4" /> Configure Form Fields
            </Link>
          </Button>

          <TcRequestFormModal />
        </div>
      </div>

      <Card className="border-dashed border-slate-800 bg-slate-900/60 p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <FileCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white">
            Dynamic TC Request Form Active
          </CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Click <strong>Apply for Transfer Certificate</strong> to test the
            live runtime renderer. Admins can click{" "}
            <strong>Configure Form Fields</strong> to add new fields in the
            builder UI and immediately see them appear on the live form.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
