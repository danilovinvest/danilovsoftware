"use client";

import { useRouter } from "next/navigation";
import { ArchiveIcon, EllipsisIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_ITEM, MENU_ITEM_DANGER, MENU_LABEL, MenuAction } from "@/shared/ui/menu-action";
import { askConfirm } from "@/shared/ui/confirm";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import { lastListHref } from "../lib/list-query";
import type { Customer } from "../lib/types";

/**
 * Le « … » de la fiche : ce qu'on ne fait pas tous les jours.
 *
 * Il y avait cinq boutons de même poids, puis trois et un menu ; il en reste
 * deux — « Modifier » et Claude — et ce menu. « Chercher dans les courriels »
 * y descend : c'est une reprise ponctuelle, pas un geste quotidien, et son
 * libellé long poussait la rangée à la ligne sur un portable. Chaque entrée
 * garde sa propre permission : la recherche demande `customers:write` et
 * `mail:read` — faire lire vingt-cinq courriels par un modèle est aussi
 * intrusif que les lire soi-même —, archiver et supprimer `customers:delete`.
 * Le menu entier disparaît quand aucune entrée n'est permise.
 *
 * « Archiver » n'est pas rouge : archiver ne retire rien. La suppression
 * définitive vit seule, en rouge, sous un filet. Les échecs passent par le
 * toast de `useAction` : le menu se referme au clic, un encadré posé dedans ne
 * se lirait pas.
 */
export function CustomerMoreMenu({
  customer,
  canEnrich,
  canDelete,
  onEnrich,
}: {
  customer: Customer;
  canEnrich: boolean;
  canDelete: boolean;
  onEnrich: () => void;
}) {
  const router = useRouter();
  const remove = useAction(() => api.deleteCustomer(customer.id));
  const purge = useAction(() => api.purgeCustomer(customer.id));
  if (!canEnrich && !canDelete) return null;

  async function archiver() {
    const ok = await askConfirm({
      title: `Archiver « ${customer.display_name} »`,
      description:
        "La fiche sort de la liste par défaut. Elle reste trouvable par la recherche et en cochant « Archivé ».",
      confirmLabel: "Archiver",
      destructive: false,
    });
    if (!ok) return;
    /*
      `!== null` et non une vérité : `useAction.run` rend `null` en cas d'échec,
      et l'API rend **204 sans corps** en cas de succès — donc `undefined`, qui
      est faux. Tester la vérité faisait échouer silencieusement toute suite
      d'une suppression réussie, et l'écran restait sur une fiche qui n'existait
      plus.
    */
    if ((await remove.run()) !== null) router.push(lastListHref());
  }

  async function supprimer() {
    const ok = await askConfirm({
      title: `Supprimer définitivement « ${customer.display_name} »`,
      description:
        "Ses projets, devis, interlocuteurs et échanges partent avec elle. " +
        "Les courriels et les rendez-vous sont conservés, simplement détachés. " +
        "Cette suppression ne se rattrape pas.",
      confirmLabel: "Supprimer définitivement",
    });
    if (!ok) return;
    if ((await purge.run()) !== null) router.push(lastListHref());
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Autres actions sur la fiche"
          disabled={remove.pending || purge.pending}
          data-demo="customer-more"
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-1.5">
        <DropdownMenuLabel className={MENU_LABEL}>Fiche</DropdownMenuLabel>
        {canEnrich && (
          <DropdownMenuItem
            className={MENU_ITEM}
            data-demo="bouton-chercher-courriels"
            onSelect={onEnrich}
          >
            <MenuAction
              icon={<SparklesIcon />}
              label="Chercher dans les courriels…"
              hint="Lire les courriels de la fiche et proposer ce qui manque"
            />
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            {/*
              Archiver range, ça n'efface pas : la fiche sort de la liste par
              défaut et se retrouve par la recherche. C'est le geste courant,
              donc il vient avant le filet rouge.
            */}
            <DropdownMenuItem
              className={MENU_ITEM}
              data-demo="customer-archive"
              onSelect={() => void archiver()}
            >
              <MenuAction
                icon={<ArchiveIcon />}
                label="Archiver la fiche…"
                hint="Sort des listes, reste trouvable par la recherche"
              />
            </DropdownMenuItem>
            {/*
              Effacer pour de bon, et le dire avant. Ce geste existe parce
              qu'une fiche née d'une faute de frappe continuait de remonter dans
              la recherche sans qu'aucun écran ne sache s'en débarrasser.
            */}
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem
              variant="destructive"
              className={MENU_ITEM_DANGER}
              data-demo="customer-purge"
              onSelect={() => void supprimer()}
            >
              <MenuAction
                icon={<Trash2Icon />}
                label="Supprimer définitivement…"
                hint="Affaires, devis, interlocuteurs et échanges compris"
                danger
              />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
