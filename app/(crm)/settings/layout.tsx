import { SettingsFrame } from "@/modules/settings";

/**
 * Toutes les pages de réglages partagent le même cadre : la liste des
 * sections, l'en-tête et le contenu défilant. Le déclarer ici plutôt que dans
 * chaque page garde la colonne en place d'une section à l'autre.
 */
export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return <SettingsFrame>{children}</SettingsFrame>;
}
