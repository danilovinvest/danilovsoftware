"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/modules/auth";
import { AutomationEditor } from "@/modules/automations";

/*
Une seule page pour toutes les automatisations, comme la fiche client : voir
`shared/lib/routes.ts`.

La lecture suffit pour regarder une automatisation et son journal ; l'API refuse
l'enregistrement à qui n'a pas `automations:write`.
*/
export default function AutomationPage() {
  return (
    <RequireAuth permission="automations:read">
      <Suspense>
        <AutomationFromQuery />
      </Suspense>
    </RequireAuth>
  );
}

function AutomationFromQuery() {
  const id = useSearchParams().get("id") ?? "";
  return <AutomationEditor key={id} id={id} />;
}
