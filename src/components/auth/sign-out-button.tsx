"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <Button
      onClick={handleSignOut}
      disabled={isPending}
      variant="outline"
      className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
    >
      {isPending ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
