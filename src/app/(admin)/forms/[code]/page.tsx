import React from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { getFormDefinitionByCodeService } from "@/server/services/dynamic-form.service";
import { FormBuilder } from "@/modules/dynamic-forms/components/FormBuilder";

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function FormBuilderPage({ params }: PageProps) {
  const { code } = await params;
  const session = await requireAuth({ redirectTo: "/forms" });
  await authorize(session.user, "forms.manage");

  let formDef;
  try {
    formDef = await getFormDefinitionByCodeService(session.user, code, true);
  } catch {
    notFound();
  }

  if (!formDef) {
    notFound();
  }

  return <FormBuilder initialFormDefinition={formDef} />;
}
