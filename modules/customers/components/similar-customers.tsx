"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/shared/lib/format";
import { useDebounced } from "../hooks/use-customers";
import { findSimilarCustomers, similarReason, type SimilarCustomer } from "../lib/similar";
import { appHref } from "@/shared/lib/routes";

/**
 * Les fiches qui ressemblent à celle qu'on crée, pendant qu'on la crée.
 *
 * L'assistant ne cherchait rien : on créait « Vidal » au téléphone sans voir
 * que « VIDAL Christine » existait déjà, et le doublon se réparait plus tard
 * par une fusion. Depuis le 29/09 la question part à `/v1/customers/similar`
 * (trigramme, seuil de Réglages → Doublons) et non plus à la recherche plein
 * texte, qui ne voyait ni « Theussien » dans « Theuwissen » ni « Coppens » sous
 * « Coppens-Charbonnier ».
 *
 * Le bloc ne bloque rien à lui seul — l'homonyme réel existe. C'est au clic sur
 * « Créer la fiche » que l'écran demande (`confirming`) : « Ouvrir » la fiche
 * proche, ou « Créer quand même ».
 */
export function SimilarCustomers({
  name,
  phone,
  email,
  confirming,
  onFound,
  onForce,
}: {
  name: string;
  phone: string;
  email: string;
  /** Vrai quand « Créer la fiche » attend qu'on tranche. */
  confirming: boolean;
  /** Les fiches proches de la dernière question, pour que le formulaire sache s'il doit demander. */
  onFound: (items: SimilarCustomer[]) => void;
  onForce: () => void;
}) {
  const asked = useDebounced(JSON.stringify({ name: name.trim(), email: email.trim(), phone }), 350);
  const [found, setFound] = useState<{ for: string; items: SimilarCustomer[] } | null>(null);
  // La réponse voyage avec sa question : rien d'une recherche précédente ne
  // s'affiche sous une frappe plus récente.
  const items = found?.for === asked ? found.items : [];

  useEffect(() => {
    const question = JSON.parse(asked) as { name: string; email: string; phone: string };
    if (question.name.length < 3) return;
    const controller = new AbortController();
    findSimilarCustomers(question, controller.signal)
      .catch(() => [] as SimilarCustomer[])
      .then((result) => {
        if (controller.signal.aborted) return;
        setFound({ for: asked, items: result });
        onFound(result);
      });
    return () => controller.abort();
  }, [asked, onFound]);

  if (items.length === 0) return null;

  return (
    <div
      data-demo="similar-customers"
      className="bg-warning-soft/40 border-warning/30 flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 sm:col-span-2"
    >
      <p className="text-warning flex items-center gap-1.5 text-xs font-medium">
        <UsersIcon className="size-3.5" />
        {items.length === 1 ? "Fiche proche" : `${items.length} fiches proches`}
        <span className="text-muted-foreground font-normal">— est-ce la même personne ?</span>
      </p>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={appHref(`/customers/${item.id}`)}
              className="hover:bg-background/60 flex items-center gap-2 rounded-md px-1.5 py-1 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground text-xs">
                  {" · "}
                  {[similarReason(item), item.phone && formatPhone(item.phone), item.email]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="text-muted-foreground flex shrink-0 items-center gap-0.5 text-xs">
                Ouvrir
                <ArrowUpRightIcon className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {confirming && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <p className="text-xs">
            Ouvrez la fiche existante si c&apos;est la même, ou créez-en une nouvelle en connaissance de cause.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onForce}>
            Créer quand même
          </Button>
        </div>
      )}
    </div>
  );
}
