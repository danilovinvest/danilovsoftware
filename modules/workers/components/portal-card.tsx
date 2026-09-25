"use client";

import { useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { STABLE, useCached } from "@/shared/api/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askConfirm } from "@/shared/ui/confirm";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import { useAuth } from "@/modules/auth";
import * as api from "../lib/api";

/**
 * Le secret de l'écran de chantier.
 *
 * Un seul mot de passe, partagé par toute l'équipe : dix ouvriers pointent sur
 * une tablette posée au dépôt, et leur donner dix secrets serait dix choses à
 * tenir pour un geste qui dure deux secondes.
 *
 * **Le changer ferme les tablettes restées connectées**, et l'écran le dit
 * avant le clic. Le sceau de session porte la date de mise en vigueur du
 * secret ; le serveur la compare à chaque appel, si bien qu'un changement
 * périme tous les sceaux d'un coup, sans table de session à purger. C'est
 * exactement ce qu'on veut d'une tablette perdue sur un chantier — et c'est
 * aussi pourquoi il faut prévenir, parce que l'équipe devra ressaisir.
 */
export function PortalCard() {
  const { can } = useAuth();
  const canAdmin = can("workers:admin");
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const { data: etat, mutate } = useCached("workers:portal", () => api.getPortalState(), STABLE);

  async function poser() {
    const mot = secret.trim();
    if (mot.length < 10) {
      notifyError("Le mot de passe fait moins de dix caractères.");
      return;
    }
    if (etat?.configured) {
      const ok = await askConfirm({
        title: "Changer le mot de passe de l'écran de pointage ?",
        description:
          "Les tablettes déjà déverrouillées devront le ressaisir, tout de suite. " +
          "C'est ce qu'on veut d'un appareil perdu — pas au milieu d'une matinée.",
        confirmLabel: "Changer",
      });
      if (!ok) return;
    }
    setPending(true);
    try {
      await api.setPortalPassword(mot);
      setSecret("");
      await mutate();
      notifySuccess("Mot de passe posé. Les écrans déjà ouverts devront le ressaisir.");
    } catch (cause) {
      notifyError(cause instanceof Error ? cause.message : "Le mot de passe n'a pas été changé.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border p-4" data-demo="ouvriers-portail">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <KeyRoundIcon className="size-4" /> L&apos;écran de pointage
      </h2>
      <p className="text-muted-foreground mb-3 text-xs">
        L&apos;équipe pointe depuis <span className="font-mono">ouvrier.testbeforeproduction.xyz</span>,
        avec ce seul mot de passe. Il n&apos;ouvre que la liste des ouvriers et la
        journée en cours — aucune fiche, aucun devis.
      </p>

      {etat === undefined ? null : etat.configured ? (
        <p className="text-muted-foreground mb-3 text-xs">
          Posé le{" "}
          {etat.updated_at
            ? new Date(etat.updated_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
          .
        </p>
      ) : (
        <p className="text-warning mb-3 text-xs font-medium">
          Aucun mot de passe : l&apos;écran de pointage est fermé et personne ne peut y entrer.
        </p>
      )}

      {canAdmin ? (
        <div className="flex gap-2">
          <Input type="password" value={secret} autoComplete="new-password"
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Dix caractères au moins"
            aria-label="Nouveau mot de passe de l'écran de pointage" />
          <Button onClick={() => void poser()} disabled={pending || secret.trim().length < 10}>
            {etat?.configured ? "Changer" : "Poser"}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Seul un administrateur peut le changer.
        </p>
      )}
    </div>
  );
}
