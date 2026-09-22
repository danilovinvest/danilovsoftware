"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, UsersIcon } from "lucide-react";
import { formatPhone } from "@/shared/lib/format";
import { customerHref } from "@/shared/lib/routes";
import { useDebounced } from "../hooks/use-customers";
import { listCustomers } from "../lib/api";
import { CUSTOMER_STATUS } from "../lib/labels";
import type { CustomerListItem, CustomerStatus } from "../lib/types";

/** Archivées comprises : un client de 2024 qui rappelle est le cas même qu'on cherche. */
const TOUS: CustomerStatus[] = ["prospect", "client", "perdu", "archive"];

/**
 * Les trois questions posées au serveur : le nom, le numéro, l'adresse.
 *
 * Le numéro part en chiffres seuls — la fiche le range « 0662464867 », on le
 * dicte « 06 62 46 48 67 », et la recherche plein texte découperait le second
 * en cinq mots introuvables.
 */
function questions(name: string, phone: string, email: string): string[] {
  const out: string[] = [];
  if (name.trim().length >= 3) out.push(name.trim());
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 6) out.push(digits);
  if (email.includes("@")) out.push(email.trim());
  return out;
}

/**
 * Les fiches qui ressemblent à celle qu'on crée, pendant qu'on la crée.
 *
 * L'assistant ne cherchait rien : on créait « Vidal » au téléphone sans voir
 * que « VIDAL Christine » existait déjà, et le doublon se réparait plus tard
 * par une fusion. Ce bloc ne bloque rien — l'homonyme réel existe — il montre,
 * et ouvre la fiche existante d'un clic.
 */
export function SimilarCustomers({
  name,
  phone,
  email,
}: {
  name: string;
  phone: string;
  email: string;
}) {
  const asked = useDebounced(questions(name, phone, email).join("|"), 350);
  const [found, setFound] = useState<{ for: string; items: CustomerListItem[] } | null>(null);
  // La réponse voyage avec sa question : rien d'une recherche précédente ne
  // s'affiche sous une frappe plus récente.
  const items = asked !== "" && found?.for === asked ? found.items : [];

  useEffect(() => {
    if (asked === "") return;
    const controller = new AbortController();
    Promise.all(
      asked.split("|").map((search) =>
        listCustomers({ search, status: TOUS, sort: "name", page: 1, per_page: 5 }, controller.signal)
          .then((page) => page.items)
          .catch(() => [] as CustomerListItem[]),
      ),
    ).then((lists) => {
      if (controller.signal.aborted) return;
      const seen = new Map<string, CustomerListItem>();
      for (const item of lists.flat()) seen.set(item.id, item);
      setFound({ for: asked, items: [...seen.values()].slice(0, 6) });
    });
    return () => controller.abort();
  }, [asked]);

  if (items.length === 0) return null;

  return (
    <div
      data-demo="similar-customers"
      className="bg-warning-soft/40 border-warning/30 flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 sm:col-span-2"
    >
      <p className="text-warning flex items-center gap-1.5 text-xs font-medium">
        <UsersIcon className="size-3.5" />
        {items.length === 1 ? "Une fiche ressemble à celle-ci" : `${items.length} fiches ressemblent à celle-ci`}
        <span className="text-muted-foreground font-normal">— est-ce la même personne ?</span>
      </p>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={customerHref(item.id)}
              className="hover:bg-background/60 flex items-center gap-2 rounded-md px-1.5 py-1 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{item.display_name}</span>
                <span className="text-muted-foreground text-xs">
                  {" · "}
                  {[
                    CUSTOMER_STATUS[item.status].label,
                    item.city,
                    item.phone && formatPhone(item.phone),
                    item.email,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <ArrowUpRightIcon className="text-muted-foreground size-3.5 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
