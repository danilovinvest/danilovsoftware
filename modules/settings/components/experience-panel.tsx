"use client";

import { CheckIcon, PanelRightIcon, SquareIcon } from "lucide-react";
import { SelectField } from "@/shared/ui/form";
import { cn } from "@/lib/utils";
import { SCALE_OPTIONS, type ThemeChoice } from "../lib/preferences";
import { setPreferences, usePreferences } from "./preferences-provider";
import {
  SettingsPage,
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "./settings-page";

export function ExperiencePanel() {
  return (
    <SettingsPage
      title="Expérience"
      description="L'apparence et les formats, réglés poste par poste."
    >
      <AppearanceSection />
      <InterfaceSection />
      <NavigationSection />
      <FormatsSection />
    </SettingsPage>
  );
}

const THEMES: Array<{ value: ThemeChoice; label: string }> = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Réglage du système" },
];

function AppearanceSection() {
  const { theme } = usePreferences();

  return (
    <SettingsSection title="Apparence">
      <div className="grid gap-3 sm:grid-cols-3">
        {THEMES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={theme === option.value}
            onClick={() => setPreferences({ theme: option.value })}
            className="group flex flex-col gap-1.5 text-left"
          >
            <span
              className={cn(
                "relative block overflow-hidden rounded-lg border-2 transition-colors",
                theme === option.value
                  ? "border-brand"
                  : "border-border group-hover:border-neutral",
              )}
            >
              <ThemePreview value={option.value} />
              {theme === option.value && (
                <span className="bg-brand absolute right-1.5 bottom-1.5 flex size-4 items-center justify-center rounded-full text-white">
                  <CheckIcon className="size-3" />
                </span>
              )}
            </span>
            <span className="text-muted-foreground text-xs">{option.label}</span>
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

/**
 * Vignette d'aperçu : une barre latérale et un panneau, comme la vraie
 * fenêtre. Les couleurs sont écrites en dur — l'aperçu doit montrer le thème
 * qu'il propose, pas celui qui est actif.
 */
function ThemePreview({ value }: { value: ThemeChoice }) {
  const light = (
    <span className="flex h-full w-full">
      <span className="h-full w-1/4 bg-[#f1f1f1]" />
      <span className="flex h-full flex-1 items-center justify-center bg-white text-[#333]">
        Aa
      </span>
    </span>
  );

  const dark = (
    <span className="flex h-full w-full">
      <span className="h-full w-1/4 bg-[#1b1b1b]" />
      <span className="flex h-full flex-1 items-center justify-center bg-[#171717] text-[#ebebeb]">
        Aa
      </span>
    </span>
  );

  return (
    <span className="flex h-16 w-full text-xs">
      {value === "system" ? (
        <>
          <span className="h-full w-1/2 overflow-hidden">{light}</span>
          <span className="h-full w-1/2 overflow-hidden">{dark}</span>
        </>
      ) : value === "dark" ? (
        dark
      ) : (
        light
      )}
    </span>
  );
}

function InterfaceSection() {
  const { scale } = usePreferences();

  return (
    <SettingsSection
      title="Interface"
      description="Langue et taille d'affichage."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Langue"
          value="fr"
          onValueChange={() => {}}
          disabled
          options={[{ value: "fr", label: "Français" }]}
          hint="Le domaine du CRM est en français ; aucune autre langue n'est traduite."
        />
        <SelectField
          label="Échelle"
          value={String(scale)}
          onValueChange={(next) => setPreferences({ scale: Number(next) })}
          options={SCALE_OPTIONS.map((option) => ({
            value: String(option),
            label: option === 100 ? "Par défaut · 100 %" : `${option} %`,
          }))}
        />
      </div>
    </SettingsSection>
  );
}

/**
 * Le choix de Twenty entre panneau latéral et page pleine suppose une vue
 * « fiche en panneau », que le CRM n'a pas : ouvrir une fiche ouvre une page.
 * Le bloc est montré, verrouillé sur ce qui existe réellement.
 */
function NavigationSection() {
  const modes = [
    {
      value: "side",
      label: "Panneau latéral",
      hint: "Ouvrir les fiches à côté de la page courante",
      Icon: PanelRightIcon,
      available: false,
    },
    {
      value: "page",
      label: "Page entière",
      hint: "Ouvrir les fiches sur leur propre page",
      Icon: SquareIcon,
      available: true,
    },
  ];

  return (
    <SettingsSection
      title="Navigation"
      description="Où s'ouvre une fiche quand on la sélectionne."
    >
      <div className="divide-y overflow-hidden rounded-lg border">
        {modes.map((mode) => (
          <div
            key={mode.value}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5",
              !mode.available && "opacity-60",
            )}
          >
            <mode.Icon className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{mode.label}</p>
              <p className="text-muted-foreground text-xs">
                {mode.available
                  ? mode.hint
                  : "À construire : le CRM n'a pas encore de fiche en panneau."}
              </p>
            </div>
            <span
              aria-hidden
              className={cn(
                "size-4 shrink-0 rounded-full border",
                mode.available ? "border-brand border-4" : "border-border",
              )}
            />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

/**
 * Les formats sont ceux de `shared/lib/format` : fr-FR, fuseau du poste. Ils
 * sont affichés résolus plutôt que réglables — les rendre configurables
 * demanderait de faire passer la préférence dans chaque formateur, ce qui
 * touche tout le CRM.
 */
function FormatsSection() {
  const resolved = Intl.DateTimeFormat().resolvedOptions();
  const sample = new Date(2026, 2, 12, 10, 30);

  return (
    <SettingsSection
      title="Formats"
      description="Dates, heures et montants, tels qu'ils sont rendus."
    >
      <SettingsRows>
        <SettingsRow label="Fuseau horaire" hint="Repris du poste">
          {resolved.timeZone}
        </SettingsRow>
        <SettingsRow label="Format de date">
          {new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(sample)}
        </SettingsRow>
        <SettingsRow label="Format d'heure">
          {new Intl.DateTimeFormat("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(sample)}
        </SettingsRow>
        <SettingsRow label="Devise" hint="Montants au centime près">
          Euro (€)
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}
