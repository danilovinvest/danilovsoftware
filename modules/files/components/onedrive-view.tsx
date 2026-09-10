"use client";

import Link from "next/link";
import { CloudIcon, ExternalLinkIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSetPageTitle } from "@/modules/shell";
import { EmptyState } from "@/shared/ui/feedback";
import { useDrive } from "../hooks/use-drive";
import { ListSkeleton } from "@/shared/ui/loading";
import { DriveExplorer } from "./drive-explorer";

/**
 * OneDrive : l'arborescence de l'entreprise, telle qu'elle est.
 *
 * Elle s'appelait « Développeur », ce qui décrivait qui l'avait écrite et non
 * ce qu'on y trouve. On y regarde les dossiers d'affaires avant de décider ce
 * qu'on en tire — et c'est aussi la meilleure liste de clients dont dispose
 * l'entreprise, vingt-sept dossiers pour la seule année 2026.
 *
 * Rien n'y écrit dans le CRM. C'est délibéré : on regarde d'abord, on décide
 * ensuite, et une reprise qui crée trente fiches d'un clic sans qu'on ait vu ce
 * qu'elle allait créer se répare à la main pendant deux jours.
 */
export function OneDriveView() {
  useSetPageTitle("OneDrive");
  const { accounts, configured, loading } = useDrive();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">OneDrive</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            L&apos;arborescence de l&apos;entreprise, telle qu&apos;elle est. Le CRM
            la lit, il n&apos;y écrit jamais.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/fichiers">Réglages des fichiers</Link>
        </Button>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Arborescence OneDrive
          </h2>
          <span className="text-muted-foreground/70 inline-flex items-center gap-1.5 text-xs">
            <ShieldCheckIcon className="text-success size-3.5" />
            Lecture seule · aucun fichier ne descend dans la base
          </span>
        </div>

        {/* L'écran n'affichait rien pendant l'interrogation du compte : une
            page vide qu'on prend pour une panne. */}
        {loading ? (
          <Card className="overflow-hidden py-0">
            <ListSkeleton rows={7} hue="slate" />
          </Card>
        ) : !configured ? (
          <EntraGuide />
        ) : accounts.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucun compte OneDrive raccordé"
              description="L'application Entra est déclarée. Il reste à autoriser le compte que l'entreprise partage."
              action={
                <Button size="sm" asChild>
                  <Link href="/settings/fichiers">
                    <CloudIcon />
                    Raccorder OneDrive
                  </Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <DriveExplorer roots={accounts[0].sync_roots} />
        )}
      </section>
    </div>
  );
}

/**
 * La marche à suivre dans Entra.
 *
 * Elle est à l'écran plutôt que dans un fichier : c'est ici qu'on la cherche,
 * au moment où le raccordement ne marche pas. Les codes d'erreur `AADSTS…` que
 * renvoie Microsoft désignent presque toujours une de ces cases mal remplie.
 */
function EntraGuide() {
  const redirect =
    typeof window === "undefined"
      ? "https://votre-domaine/v1/files/callback"
      : `${window.location.origin}/v1/files/callback`;

  const steps: Array<{ title: string; body: React.ReactNode }> = [
    {
      title: "Créer l'application",
      body: (
        <>
          Sur{" "}
          <a
            className="text-primary underline"
            href="https://entra.microsoft.com"
            target="_blank"
            rel="noreferrer"
          >
            entra.microsoft.com
          </a>{" "}
          → Applications → Inscriptions d&apos;applications → Nouvelle inscription. Nom :
          « OMPT CRM ».
        </>
      ),
    },
    {
      title: "Types de comptes pris en charge",
      body: (
        <>
          Choisir <strong>« Comptes dans un annuaire organisationnel quelconque et
          comptes Microsoft personnels »</strong>. C&apos;est le seul choix qui accepte
          un compte Microsoft personnel — celui que l&apos;entreprise partage — tout en
          restant valable si le compte devient un compte 365 plus tard.
        </>
      ),
    },
    {
      title: "URI de redirection",
      body: (
        <>
          Plateforme <strong>Web</strong>, et cette adresse à l&apos;identique :
          <code className="bg-muted mt-1 block rounded px-2 py-1 font-mono text-xs break-all">
            {redirect}
          </code>
          Une différence d&apos;un caractère donne l&apos;erreur AADSTS50011.
        </>
      ),
    },
    {
      title: "Secret client",
      body: (
        <>
          Certificats et secrets → Nouveau secret client. Copier la{" "}
          <strong>valeur</strong>, pas l&apos;identifiant : elle ne s&apos;affiche
          qu&apos;une fois. Choisir la durée la plus longue, sinon le raccordement
          tombera en panne au bout de six mois.
        </>
      ),
    },
    {
      title: "Permissions",
      body: (
        <>
          API autorisées → Microsoft Graph → Permissions <strong>déléguées</strong> :{" "}
          <code className="font-mono text-xs">Files.Read.All</code>,{" "}
          <code className="font-mono text-xs">offline_access</code>,{" "}
          <code className="font-mono text-xs">User.Read</code>.
          <span className="mt-1 block">
            Sur un compte personnel, le bouton « Accorder le consentement
            administrateur » ne sert à rien : il n&apos;y a pas d&apos;administrateur
            de locataire. C&apos;est vous qui consentirez sur l&apos;écran Microsoft, au
            moment du raccordement.
          </span>
          <span className="text-warning mt-1 block">
            Aucune permission en écriture. Pas de <code className="font-mono">
            Files.ReadWrite</code>, jamais.
          </span>
        </>
      ),
    },
    {
      title: "Renseigner le serveur",
      body: (
        <>
          Dans <code className="font-mono text-xs">deploy/.env</code> sur le VPS :
          <code className="bg-muted mt-1 block rounded px-2 py-1 font-mono text-xs">
            CRM_MS_CLIENT_ID=…
            <br />
            CRM_MS_CLIENT_SECRET=…
          </code>
          puis redéployer. L&apos;identifiant client est l&apos;« ID d&apos;application
          (client) » de la page Vue d&apos;ensemble.
        </>
      ),
    },
  ];

  return (
    <Card className="gap-0 py-0">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-medium">Déclarer l&apos;application dans Entra</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Six étapes, une seule fois. La procédure est la même pour un compte
          Microsoft personnel et pour un compte 365 ; seule l&apos;étape 5 diffère, et
          elle est plus courte. Contrairement à Gmail, la lecture de fichiers
          n&apos;impose ni audit annuel ni cabinet agréé.
        </p>
      </div>

      <ol className="divide-y">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3 px-4 py-3">
            <span className="bg-muted text-muted-foreground grid size-5 shrink-0 place-items-center rounded-full text-xs font-medium">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{step.title}</div>
              <div className="text-muted-foreground mt-0.5 text-xs">{step.body}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t px-4 py-3">
        <Button variant="outline" size="sm" asChild>
          <a href="https://entra.microsoft.com" target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
            Ouvrir le portail Entra
          </a>
        </Button>
      </div>
    </Card>
  );
}
