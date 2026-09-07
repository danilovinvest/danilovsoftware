"use client";

import { CheckIcon, PanelRightIcon, SquareIcon } from "lucide-react";
import { SelectField } from "@/shared/ui/form";
import { cn } from "@/lib/utils";
import { SCALE_OPTIONS, type ThemeChoice } from "../lib/preferences";
import { PALETTES, type Palette } from "../lib/palettes";
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
      <PaletteSection />
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
  const { theme, palette } = usePreferences();
  const active = activePalette(palette);

  return (
    <SettingsSection
      title="Apparence"
      description="Clair, sombre, ou ce que dit le poste."
    >
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
                  ? "border-brand-text"
                  : "border-border group-hover:border-neutral",
              )}
            >
              {/* Les vignettes montrent la palette active : le mode et la
                  couleur se choisissent l'un après l'autre, autant que le
                  premier écran annonce déjà le second. */}
              <span className="flex h-16 w-full">
                {option.value === "system" ? (
                  <>
                    <PalettePreview palette={active} mode="light" half />
                    <PalettePreview palette={active} mode="dark" half />
                  </>
                ) : (
                  <PalettePreview palette={active} mode={option.value} />
                )}
              </span>
              {theme === option.value && (
                <span className="bg-brand absolute right-1.5 bottom-1.5 flex size-4 items-center justify-center rounded-full text-brand-ink">
                  <CheckIcon className="size-3" />
                </span>
              )}
            </span>
            <span
              className={cn(
                "text-xs",
                theme === option.value
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

function activePalette(id: string): Palette {
  return PALETTES.find((entry) => entry.id === id) ?? PALETTES[0];
}

/**
 * Galerie des palettes.
 *
 * Chaque vignette est coupée en deux — clair à gauche, sombre à droite —
 * parce qu'une palette existe dans les deux modes : la montrer dans un seul
 * obligerait à basculer le thème pour juger. Les couleurs sont posées en style
 * en ligne, prises du registre : une vignette doit peindre SA palette, pas
 * celle qui est active.
 */
function PaletteSection() {
  const { palette } = usePreferences();

  return (
    <SettingsSection
      title="Palette"
      description="La teinte d'accent et la température des surfaces. Les couleurs de statut — vert pour accepté, rouge pour refusé — ne bougent pas d'une palette à l'autre."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PALETTES.map((option) => {
          const selected = palette === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setPreferences({ palette: option.id })}
              className="group flex flex-col gap-1.5 text-left"
            >
              <span
                className={cn(
                  "relative block overflow-hidden rounded-lg border-2 transition-colors",
                  selected
                    ? "border-brand-text"
                    : "border-border group-hover:border-neutral",
                )}
              >
                <span className="flex h-14 w-full">
                  <PalettePreview palette={option} mode="light" half />
                  <PalettePreview palette={option} mode="dark" half />
                </span>
                {selected && (
                  <span className="bg-brand absolute right-1 bottom-1 flex size-4 items-center justify-center rounded-full text-brand-ink">
                    <CheckIcon className="size-3" />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-xs",
                  selected ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}

/**
 * Aperçu d'une palette dans un mode : le liseré de la barre latérale, un trait
 * d'accent, deux lignes de contenu. Assez pour reconnaître une palette au
 * premier coup d'œil, et strictement peint avec ses propres couleurs — jamais
 * avec celles du thème actif.
 */
function PalettePreview({
  palette,
  mode,
  half = false,
}: {
  palette: Palette;
  mode: "light" | "dark";
  half?: boolean;
}) {
  const surface = palette.surface[mode];
  const accent = palette.accent[mode];

  return (
    <span
      className={cn("flex h-full items-center gap-1.5 px-2", half ? "w-1/2" : "w-full")}
      style={{ backgroundColor: surface.base }}
    >
      <span
        className="h-full w-1.5 shrink-0"
        style={{
          backgroundColor: surface.raised,
          // Les deux gris de Twenty sont volontairement très proches : sans ce
          // filet, la barre latérale disparaîtrait dans la vignette sombre.
          borderRight: "1px solid rgb(128 128 128 / 0.25)",
        }}
      />
      <span className="flex flex-1 flex-col gap-1">
        <span
          className="block h-1.5 w-full rounded-full"
          style={{ backgroundColor: accent }}
        />
        <span
          className="block h-1.5 w-3/4 rounded-full"
          style={{ backgroundColor: surface.raised }}
        />
        <span
          className="block h-1.5 w-1/2 rounded-full"
          style={{ backgroundColor: surface.raised }}
        />
      </span>
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
                mode.available ? "border-brand-text border-4" : "border-border",
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
