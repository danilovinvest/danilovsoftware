import { RequireAuth } from "@/modules/auth";
import { AppShell } from "@/modules/shell";

/**
 * Toutes les pages authentifiées passent par ce groupe de routes : la garde et
 * la chrome de l'application ne sont déclarées qu'une fois.
 */
export default function CrmLayout({ children }: LayoutProps<"/">) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
