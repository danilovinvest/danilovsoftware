import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { AutomationEditor } from "@/modules/automations";

export const metadata: Metadata = { title: "Automatisation" };

export default async function AutomationPage(props: PageProps<"/automations/[id]">) {
  const { id } = await props.params;

  return (
    // La lecture suffit pour regarder une automatisation et son journal ;
    // l'API refuse l'enregistrement à qui n'a pas `automations:write`.
    <RequireAuth permission="automations:read">
      <AutomationEditor id={id} />
    </RequireAuth>
  );
}
