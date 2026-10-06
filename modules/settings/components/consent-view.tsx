"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpenIcon, PencilLineIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNotice } from "@/shared/ui/feedback";
import { CardsSkeleton } from "@/shared/ui/loading";
import { errorMessage } from "@/shared/api/errors";
import { BrandText } from "@/shared/ui/logo";
import * as api from "../lib/oauth-api";

/**
 * Accorder l'accès du CRM à un assistant.
 *
 * **Le code n'est émis qu'au clic, jamais au chargement.** C'est le point
 * qu'avait relevé la revue de sécurité sur l'appairage de l'application de
 * bureau, et le serveur ne peut pas le tenir seul : le défi PKCE vient de
 * l'appelant. Une adresse portant le défi d'un tiers, ouverte par une personne
 * connectée, fabriquerait un code lié à **son** compte et au secret **du
 * tiers**. La page nomme donc le compte et le demandeur, et n'offre qu'ensuite
 * le bouton.
 *
 * **Lecture ou écriture se choisit ici, et rien n'est coché d'office**
 * (issue 98). Brancher un assistant en lecture est le cas courant ; confier
 * l'écriture à un modèle est un second consentement, qui doit se voir.
 */
export function ConsentView() {
  const params = useSearchParams();
  const clientID = params.get("client_id") ?? "";
  const redirectURI = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  const challenge = params.get("code_challenge") ?? "";
  const method = params.get("code_challenge_method") ?? "";

  const [demande, setDemande] = useState<api.ConsentRequest | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState<boolean | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Refusée avant tout appel : un défi absent, ou annoncé dans une méthode
  // qu'OAuth 2.1 a retirée, ne protège de rien. Mieux vaut le dire ici que
  // laisser l'échange échouer plus tard, sans rien pour l'expliquer.
  const defiValide = challenge !== "" && method === "S256";

  useEffect(() => {
    if (!clientID || !redirectURI || !defiValide) return;
    const controller = new AbortController();
    api
      .consentRequest(clientID, redirectURI, controller.signal)
      .then(setDemande)
      .catch((cause) => {
        if (!controller.signal.aborted) setErreur(errorMessage(cause));
      });
    return () => controller.abort();
  }, [clientID, redirectURI, defiValide]);

  if (!clientID || !redirectURI) {
    return <Refus titre="Demande incomplète" texte="Cette adresse ne dit pas qui demande l'accès, ni où renvoyer la réponse." />;
  }
  if (!defiValide) {
    return <Refus titre="Demande refusée" texte="Le demandeur n'a pas fourni de preuve valable de son identité (PKCE S256). Recommencez depuis l'assistant." />;
  }
  if (erreur) {
    return <Refus titre="Demande refusée" texte={erreur} />;
  }
  if (!demande) {
    return (
      <Ecran>
        {/* La silhouette a la forme de ce qu'elle précède : une carte. */}
        <div className="w-full max-w-md">
          <CardsSkeleton count={1} />
        </div>
      </Ecran>
    );
  }

  async function accorder() {
    if (canWrite === null) return;
    setEnvoi(true);
    try {
      const { code } = await api.authorizeConsent({
        client_id: clientID,
        redirect_uri: redirectURI,
        code_challenge: challenge,
        can_write: canWrite,
      });
      // Le retour se fait par l'adresse **que le client a enregistrée** et que
      // le serveur vient de revalider, jamais par une adresse libre : c'est ce
      // qui empêche un retour forgé d'emporter le code.
      const url = new URL(redirectURI);
      url.searchParams.set("code", code);
      if (state) url.searchParams.set("state", state);
      window.location.replace(url.toString());
    } catch (cause) {
      setErreur(errorMessage(cause));
      setEnvoi(false);
    }
  }

  return (
    <Ecran>
      <Card className="w-full max-w-md" data-demo="oauth-consent">
        <CardHeader>
          <CardTitle className="text-base">
            {demande.client_name || "Un assistant"} demande l&apos;accès au CRM
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Au nom de <strong className="text-foreground">{demande.account}</strong>. Il verra
            exactement ce que vous voyez, jamais plus — vos permissions et votre société
            s&apos;appliquent.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Ce que vous accordez</legend>
            <Choix
              icon={<BookOpenIcon />}
              titre="Lire seulement"
              texte="Fiches, affaires, devis, tâches et agenda. L'assistant ne peut rien modifier."
              actif={canWrite === false}
              onClick={() => setCanWrite(false)}
            />
            <Choix
              icon={<PencilLineIcon />}
              titre="Lire et écrire"
              texte="Il pourra aussi créer des fiches, noter des échanges et des tâches, changer une étape."
              actif={canWrite === true}
              onClick={() => setCanWrite(true)}
            />
          </fieldset>

          <p className="text-muted-foreground flex gap-2 text-xs">
            <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Ce choix est figé : passer de la lecture à l&apos;écriture demandera un nouvel
              accord. Vous pouvez couper cet accès à tout moment depuis Réglages → Assistant.
            </span>
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => window.history.back()} disabled={envoi}>
              Refuser
            </Button>
            <Button onClick={() => void accorder()} disabled={canWrite === null || envoi}>
              {canWrite === null ? "Choisissez d'abord" : "Autoriser"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Ecran>
  );
}

function Ecran({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <BrandText />
      {children}
    </div>
  );
}

function Refus({ titre, texte }: { titre: string; texte: string }) {
  return (
    <Ecran>
      <div className="w-full max-w-md">
        <ErrorNotice message={`${titre} — ${texte}`} />
      </div>
    </Ecran>
  );
}

/** Un choix de portée : la carte entière est le bouton, pas une case minuscule. */
function Choix({
  icon,
  titre,
  texte,
  actif,
  onClick,
}: {
  icon: React.ReactNode;
  titre: string;
  texte: string;
  actif: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
        actif ? "border-foreground bg-muted" : "hover:bg-muted/50"
      }`}
    >
      <span className="mt-0.5 [&_svg]:size-4">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{titre}</span>
        <span className="text-muted-foreground block text-xs">{texte}</span>
      </span>
    </button>
  );
}
