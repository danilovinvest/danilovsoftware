"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { isSettingsItemActive, settingsLabel } from "../lib/navigation";
import { SettingsNav, useSettingsSections } from "./settings-nav";

/**
 * Cadre commun à toutes les pages de réglages, sur le modèle du dialogue de
 * réglages de shadcn : un seul bloc bordé, la liste des sections à gauche,
 * l'en-tête avec son fil d'Ariane en haut, et seul le contenu qui défile.
 *
 * Les réglages restent des pages, pas un dialogue : chacun a son adresse, que
 * les bandeaux d'état et les retours OAuth désignent directement.
 *
 * Sous 768 pixels, la colonne cède la place à une liste déroulante dans
 * l'en-tête — une colonne de deux cents pixels ne laisserait rien au contenu
 * sur un téléphone.
 */
export function SettingsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = useSettingsSections();
  const label = settingsLabel(pathname);
  const items = sections.flatMap((section) => section.items);
  const current = items.find((item) => isSettingsItemActive(item.href, pathname));

  return (
    <div
      data-demo="settings-frame"
      className="bg-background flex min-h-0 flex-1 overflow-hidden rounded-xl border md:max-h-full"
    >
      <SettingsNav className="hidden w-52 shrink-0 overflow-y-auto border-r md:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 items-center border-b px-4">
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                {label ? (
                  <BreadcrumbLink asChild>
                    <Link href="/settings">Paramètres</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>Paramètres</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {label && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          <label className="sr-only" htmlFor="settings-section">
            Section des paramètres
          </label>
          <select
            id="settings-section"
            className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm md:hidden"
            value={current?.href ?? ""}
            onChange={(event) => router.push(event.target.value)}
          >
            {/* Une page hors de la liste (ou pas encore autorisée) n'a pas
                d'entrée : l'option vide évite d'afficher une autre section
                que celle qu'on regarde. */}
            {!current && <option value="">Paramètres</option>}
            {sections.map((section) => (
              <optgroup key={section.label} label={section.label}>
                {section.items.map((item) => (
                  <option key={item.href} value={item.href}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </header>

        <div className="flex min-h-0 flex-1 flex-col p-5 md:overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
