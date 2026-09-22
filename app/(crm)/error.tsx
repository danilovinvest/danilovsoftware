"use client";

import { ErrorScreen } from "@/shared/ui/error-screen";

/** Une erreur dans un écran du CRM : l'en-tête et la colonne restent en place. */
export default function CrmError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}
