"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { useAuth } from "@/modules/auth";
import { cn } from "@/lib/utils";
import {
  SETTINGS_NAVIGATION,
  isSettingsItemActive,
  type SettingsSection,
} from "../lib/navigation";
import { lastReturnRoute } from "../lib/return-route";

/** Les sections des réglages que le compte courant peut ouvrir. */
export function useSettingsSections(): SettingsSection[] {
  const { can } = useAuth();
  return SETTINGS_NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((section) => section.items.length > 0);
}

const ITEM_CLASS =
  "flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-foreground/80 " +
  "hover:bg-muted hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 " +
  "[&_svg]:text-muted-foreground";

/**
 * Colonne des réglages, posée dans le cadre des réglages et non plus dans le
 * tiroir de l'application.
 *
 * La forme vient du dialogue de réglages de shadcn : une liste courte à
 * gauche, l'entrée courante sur un fond gris plutôt qu'une pilule pleine — la
 * pilule reste réservée au tiroir principal, qui continue de dire dans quel
 * module on est. Deux pilules pleines sur un même écran ne diraient plus
 * laquelle est la page.
 */
export function SettingsNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = useSettingsSections();

  return (
    <nav aria-label="Paramètres" className={cn("flex flex-col gap-4 p-2", className)}>
      {/* L'adresse du lien est le repli ; la vraie destination, la dernière
          page quittée pour entrer ici, est lue au clic. */}
      <Link
        href="/dashboard"
        data-demo="settings-back"
        className={ITEM_CLASS}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          router.push(lastReturnRoute());
        }}
      >
        <ArrowLeftIcon />
        <span>Retour</span>
      </Link>

      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-0.5">
          <p className="text-brand-text px-2 pb-1 text-[10px] font-semibold tracking-[0.08em] uppercase">
            {section.label}
          </p>
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = isSettingsItemActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  ITEM_CLASS,
                  active && "bg-muted text-foreground font-medium [&_svg]:text-foreground",
                )}
              >
                <Icon />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
