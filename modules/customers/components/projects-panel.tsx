"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRightIcon,
  FilePlusIcon,
  FileTextIcon,
  HardHatIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import { PreviewLink } from "@/modules/files";
import { ClaudeButton, projectContext, quoteContext } from "@/modules/assistant";
import { createTask } from "@/modules/tasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { TONE_SOFT } from "@/shared/ui/panel";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { deadlineOf, deliveredAt, missionOf, projectReference } from "../lib/mission";
import { autoProofsOf, describeBatch } from "../lib/proofs";
import {
  PAYMENT_STATUS,
  PROJECT_MISSION,
  PROJECT_STAGE,
  QUOTE_ISSUER,
  QUOTE_KIND,
  QUOTE_STATUS,
} from "../lib/labels";
import {
  hasSurvey,
  leadQuote,
  projectMetier,
  nextAction,
  readCycle,
  revisions,
  stepMarkedAt,
  stepWrite,
  type ActionKey,
  type CyclePoint,
  type CycleStep,
} from "../lib/cycle";
import {
  EMPTY_JALONS,
  EMPTY_MARKS,
  readJalons,
  readMarks,
  type Jalons,
  type StepMarks,
} from "../lib/jalons";
import { useAction } from "../hooks/use-customers";
import { EnumBadge } from "./enum-badge";
import { InteractionDialog } from "./interaction-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ProjectNextAssignment } from "./next-assignment";
import { SubcontractingPanel } from "./subcontracting-panel";
import { DepositDialog, depositTotalOf } from "./deposit-field";
import { ProjectIssuerDialog } from "./project-issuer-dialog";
import { MaterialsDialog } from "./materials-field";
import {
  ProjectOnboardingButton,
  ProjectOnboardingDrawer,
  projetIncomplet,
} from "./project-onboarding";
import { OutcomeDialog } from "./outcome-dialog";
import { ProjectCycle } from "./project-cycle";
import { ProjectJalons } from "./project-jalons";
import { ProjectNextAction } from "./project-next-action";
import { ProjectTimeline } from "./project-timeline";
import { ProjectDialog, QuoteDialog } from "./project-dialogs";
import { QuotePayments } from "./quote-payments";
import { RelanceDialog } from "./relance-dialog";
import type {
  CustomerDetail,
  ProofBatch,
  QuotePayment,
  StepProofInput,
  Interaction,
  InteractionKind,
  Project,
  Quote,
} from "../lib/types";

/**
 * Onglet « Affaires ».
 *
 * Chaque affaire est un accordéon. Replié, il répond à « où en est-on » sans
 * qu'on l'ouvre : la frise et le temps d'attente suffisent. Déplié, il dit quoi
 * faire, puis montre l'histoire, les devis et l'après-signature.
 *
 * L'ancien écran posait une liste déroulante d'étape et un bouton « Signaler un
 * blocage ». Les deux demandaient à l'utilisateur de traduire lui-même son
 * métier en vocabulaire de base de données. Ici c'est l'inverse : l'écran lit
 * la base et propose le geste suivant.
 */
export function ProjectsPanel({
  customer,
  projects,
  quotes,
  interactions,
  onChanged,
}: {
  customer: CustomerDetail;
  projects: Project[];
  quotes: Quote[];
  interactions: Interaction[];
  onChanged: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const canWriteQuotes = usePermission("quotes:write");

  const [projectOpen, setProjectOpen] = useState(false);
  /** L'affaire qu'on modifie. Le même formulaire que la création. */
  const [editing, setEditing] = useState<Project | null>(null);
  const [quoteFor, setQuoteFor] = useState<Project | null>(null);

  // L'instant est figé au montage : sinon « 12 jours sans réponse » se
  // recalculerait à chaque rendu, sur une horloge qui a bougé.
  const [now] = useState(() => Date.now());

  /**
   * Ce que l'utilisateur coche sur les jalons simulés, le temps de la session.
   * Ce n'est pas de l'état d'affichage : c'est la seule mémoire dont disposent
   * les quatre jalons que l'API ne stocke pas encore.
   */
  /*
    Les jalons s'affichent tout de suite, puis s'enregistrent.

    Ils vivaient en mémoire et mouraient au rechargement ; ils vivent
    maintenant en base, mais attendre l'aller-retour pour voir une case se
    cocher donne une interface qui semble ne pas répondre. Le geste est donc
    appliqué localement d'abord — `optimiste` — et le serveur confirme.

    En cas d'échec, la surcouche est retirée : la case revient où elle était, et
    l'erreur s'affiche. C'est le seul moment où l'écran ment brièvement, et il
    se dédit.
  */
  const [optimiste, setOptimiste] = useState<Record<string, Partial<Jalons & StepMarks>>>(
    {},
  );

  /*
    L'état complet d'une affaire : ses jalons, ses marques, et le geste en
    cours.

    Les deux se lisent ensemble parce qu'ils s'écrivent ensemble — une même
    ligne en base, une même requête — et parce que la frise a besoin des deux
    pour dire d'un cran s'il est franchi. Leurs clés sont disjointes : les
    jalons datent des faits, les marques n'existent que pour les crans que rien
    ne date.
  */
  const etatDe = (project: Project) => ({
    ...readJalons(
      project.id,
      quotes.filter((quote) => quote.project_id === project.id),
      customer.milestones,
      project,
    ),
    ...readMarks(project.id, customer.milestones),
    ...optimiste[project.id],
  });

  const saveJalons = useAction(
    async (project: Project, patch: Partial<Jalons & StepMarks>) => {
      // La date de chantier est `started_at` de l'affaire, pas un jalon à
      // part : c'est la colonne que l'écran Chantiers lit déjà.
      if ("worksite_date" in patch) {
        const date = patch.worksite_date;
        await api.updateProject(project.id, {
          label: project.label,
          stage: project.stage,
          // Renvoyé tel quel : réserver une date ne doit pas effacer le type
          // d'intervention, que cet appel n'affiche pas.
          scope: project.scope,
          // Renvoyés tels quels : réserver une date ne doit pas dénommer
          // l'ingénieur qui suit le dossier.
          manager_id: project.manager_id,
          engineer_id: project.engineer_id,
          drafter_id: project.drafter_id,
          outcome: project.outcome,
          outcome_note: project.outcome_note,
          site_address: project.site_address,
          site_postal_code: project.site_postal_code,
          site_city: project.site_city,
          notes: project.notes,
          started_at: date ? date.slice(0, 10) : null,
          // Renvoyée telle quelle : réserver un démarrage ne doit pas effacer
          // une fin de chantier déjà saisie.
          finished_at: project.finished_at,
          closed_at: project.closed_at,
          mission: project.mission,
          promised_at: project.promised_at,
          internal_deadline_at: project.internal_deadline_at,
        });
        return;
      }

      const suivant = { ...etatDe(project), ...patch };
      await api.setMilestones(project.id, {
        rib_sent_at: suivant.rib_sent_at,
        insurance_sent_at: suivant.insurance_sent_at,
        materials_ordered_at: suivant.materials_ordered_at,
        materials: suivant.materials,
        resume_at: suivant.resume_at,
        plans_sent_at: suivant.plans_sent_at,
        review_requested_at: suivant.review_requested_at,
        review_received_at: suivant.review_received_at,
        pv_sent_at: suivant.pv_sent_at,
        pv_signed_at: suivant.pv_signed_at,
        visit_report_sent_at: suivant.visit_report_sent_at,
        survey_report_sent_at: suivant.survey_report_sent_at,
        calc_started_at: suivant.calc_started_at,
        calc_done_at: suivant.calc_done_at,
        plans_started_at: suivant.plans_started_at,
        plans_review_at: suivant.plans_review_at,
        corrections_at: suivant.corrections_at,
        final_ready_at: suivant.final_ready_at,
        report_written_at: suivant.report_written_at,
        report_validated_at: suivant.report_validated_at,
        report_sent_at: suivant.report_sent_at,
        survey_done_at: suivant.survey_done_at,
        contact_at: suivant.contact_at,
        rdv_at: suivant.rdv_at,
        quote_sent_at: suivant.quote_sent_at,
        negotiation_at: suivant.negotiation_at,
        signed_at: suivant.signed_at,
      });
      // `useAction` rend ce que l'action renvoie, et l'appelant s'en sert pour
      // décider s'il recharge. Sans ce `true`, l'écriture réussissait et la
      // fiche ne se rafraîchissait jamais.
      return true;
    },
  );

  /**
   * Applique le geste tout de suite, l'enregistre, et se dédit s'il échoue.
   *
   * Rend la réussite : un panneau de saisie ne doit se refermer que sur un
   * succès, sans quoi le brouillon disparaît au moment où l'on en a besoin.
   */
  async function poserJalon(
    project: Project,
    patch: Partial<Jalons & StepMarks>,
  ): Promise<boolean> {
    setOptimiste((current) => ({
      ...current,
      [project.id]: { ...current[project.id], ...patch },
    }));
    if (await saveJalons.run(project, patch)) {
      onChanged();
      return true;
    }
    setOptimiste((current) => {
      const suivant = { ...current };
      const propre = { ...suivant[project.id] };
      for (const cle of Object.keys(patch)) delete propre[cle as keyof (Jalons & StepMarks)];
      suivant[project.id] = propre;
      return suivant;
    });
    return false;
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {canWrite && <NewProjectButton onClick={() => setProjectOpen(true)} />}
        <Card className="gap-0 py-4">
          {/*
            Le cycle se montre même vide.

            Une fiche sans projet affichait un cadre blanc, et rien ne disait ce
            qu'on allait y suivre. La frise grise le dit d'un coup d'œil : dix
            crans, du premier contact à l'avis client. C'est la **même** frise
            que partout ailleurs, lue sur un projet qui n'existe pas encore, et
            non un dessin refait pour l'occasion — sans quoi elle aurait divergé
            de la vraie au premier changement de règle.
          */}
          <div className="px-4">
            <ProjectCycle points={cycleVide(now)} />
          </div>
          <EmptyState
            title="Aucun projet"
            description="Créez un projet pour y suivre ce cycle, du premier appel à la commande des matériaux."
          />
        </Card>
        <ProjectDialog
          key={projectOpen ? "project-open" : "project-closed"}
          customerId={customer.id}
          open={projectOpen}
          onOpenChange={setProjectOpen}
          onSaved={onChanged}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canWrite && (
        <div className="flex justify-end">
          <NewProjectButton onClick={() => setProjectOpen(true)} />
        </div>
      )}

      {/*
        L'échec d'une écriture de jalon se lisait nulle part : la surcouche
        optimiste se défaisait, la case revenait où elle était, et rien ne
        disait pourquoi. Tant qu'un jalon n'était qu'une date, l'écriture ne
        pouvait guère échouer ; une liste de matériaux, elle, peut être refusée.
      */}
      {saveJalons.error && <ErrorNotice message={saveJalons.error} />}

      {projects.map((project, index) => {
        const etat = etatDe(project);
        return (
          <ProjectBlock
            key={project.id}
            customer={customer}
            project={project}
            quotes={quotes.filter((quote) => quote.project_id === project.id)}
            interactions={interactions.filter((entry) => entry.project_id === project.id)}
            jalons={etat}
            marks={etat}
            /*
              Une écriture en vol verrouille les crans.

              La route remplace la ligne entière : deux clics rapides sur deux
              crans différents envoient deux instantanés, et si le premier
              arrive en dernier — le réseau ne garantit pas l'ordre — il écrase
              le cran que le second venait d'inscrire, sans un mot. Un cran
              coché qui redevient gris au rechargement est exactement ce qu'on
              cherchait à éviter.
            */
            saving={saveJalons.pending}
            now={now}
            canWrite={canWrite}
            canWriteQuotes={canWriteQuotes}
            // La première affaire s'ouvre : sur la majorité des fiches il n'y en
            // a qu'une, et la refermer d'office ferait un clic pour rien.
            defaultOpen={index === 0}
            onOverride={(patch) => poserJalon(project, patch)}
            onAddQuote={() => setQuoteFor(project)}
            onEdit={() => setEditing(project)}
            onChanged={onChanged}
          />
        );
      })}

      <ProjectDialog
        key={projectOpen ? "project-open" : "project-closed"}
        customerId={customer.id}
        open={projectOpen}
        onOpenChange={setProjectOpen}
        onSaved={onChanged}
      />
      <ProjectDialog
        // Remontée à chaque affaire : le formulaire part de celle-ci.
        key={editing?.id ?? "project-edit-closed"}
        customerId={customer.id}
        project={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
      <QuoteDialog
        key={quoteFor?.id ?? "quote-closed"}
        project={quoteFor}
        onOpenChange={(open) => !open && setQuoteFor(null)}
        onSaved={onChanged}
      />
    </div>
  );
}

/**
 * La frise d'un projet qui n'existe pas encore.
 *
 * Elle passe par `readCycle` comme toutes les autres : un projet vide, aucun
 * devis, aucun échange, aucun jalon. Dessiner dix ronds gris à la main aurait
 * été plus court et faux au premier cran ajouté.
 */
function cycleVide(now: number): CyclePoint[] {
  return readCycle(
    {
      id: "",
      label: "",
      stage: "demande_recue",
      outcome: null,
      started_at: null,
      closed_at: null,
    } as Project,
    [],
    [],
    EMPTY_JALONS,
    now,
    undefined,
    EMPTY_MARKS,
  );
}

function NewProjectButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <PlusIcon />
      Nouveau projet
    </Button>
  );
}

/**
 * Les deux bornes du chantier, dites en une phrase.
 *
 * Trois cas, et aucun ne se confond : « du 3 au 17 juin » quand tout est connu,
 * « depuis le 3 juin » quand il a commencé sans finir, « terminé le 17 juin »
 * quand seule la fin est saisie — ce qui arrive sur une affaire reprise. Vide
 * quand aucune date n'existe : une mention « — · — » n'apprendrait rien et
 * pousserait le nom du responsable hors de la ligne.
 */
function periodeChantier(started: string | null, finished: string | null): string {
  if (started && finished) return `du ${formatDate(started)} au ${formatDate(finished)}`;
  if (started) return `depuis le ${formatDate(started)}`;
  if (finished) return `terminé le ${formatDate(finished)}`;
  return "";
}

// ---------------------------------------------------------------------------
// Une affaire
// ---------------------------------------------------------------------------

function ProjectBlock({
  customer,
  project,
  quotes,
  interactions,
  jalons,
  marks,
  saving,
  now,
  canWrite,
  canWriteQuotes,
  defaultOpen,
  onOverride,
  onAddQuote,
  onEdit,
  onChanged,
}: {
  customer: CustomerDetail;
  project: Project;
  quotes: Quote[];
  interactions: Interaction[];
  jalons: Jalons;
  /** Les crans cochés à la main, ceux que rien ne date. */
  marks: StepMarks;
  /** Une écriture de jalons est en vol : plus un cran ne se coche. */
  saving: boolean;
  now: number;
  canWrite: boolean;
  canWriteQuotes: boolean;
  defaultOpen: boolean;
  onOverride: (patch: Partial<Jalons & StepMarks>) => Promise<boolean>;
  onAddQuote: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState("chronologie");
  const [relance, setRelance] = useState(false);
  const [outcome, setOutcome] = useState<"refuse" | "postpone" | null>(null);
  const [logging, setLogging] = useState<InteractionKind | null>(null);
  /** La saisie des matériaux, ouverte depuis « à faire maintenant ». */
  const [materiaux, setMateriaux] = useState(false);
  /** Le montant de l'acompte, demandé depuis « à faire maintenant ». */
  const [acompte, setAcompte] = useState(false);
  /** Le tiroir qui complète l'affaire, ouvert depuis l'alerte du dessus. */
  const [completer, setCompleter] = useState(false);

  const points = readCycle(project, quotes, interactions, jalons, now, undefined, marks);
  const action = nextAction(points, project, quotes, jalons, now);

  /*
    Deux sociétés sur une même affaire : deux frises.

    Le même chantier peut porter l'étude de STRUCTURE et les travaux de GROUPE —
    mesuré le 17/09 : **neuf affaires**. Une seule frise devait alors choisir un
    métier, et l'autre moitié du travail n'apparaissait nulle part : un parcours
    d'étude affiché sur une affaire qui attend un chantier, ou l'inverse.

    La seconde frise se **lit seulement**, et c'est délibéré. Cocher un cran
    écrit sur le devis porteur — l'acompte, le solde — et ce devis appartient à
    l'une des deux sociétés : rendre les deux frises cliquables ferait écrire
    l'acompte de GROUPE sur un devis de STRUCTURE, sans que rien ne le dise. On
    montre, on ne laisse pas écrire au mauvais endroit.

    Les neuf affaires concernées sont toutes au devis ou à la proposition : les
    deux frises y sont donc presque identiques aujourd'hui, et ne divergeront
    qu'après la signature. C'est normal, et c'est justement le moment où la
    distinction comptera.
  */
  const devisStructure = quotes.filter((quote) => quote.issuer === "ompt-structure");
  const devisGroupe = quotes.filter((quote) => quote.issuer === "ompt-groupe");
  const melangee = devisStructure.length > 0 && devisGroupe.length > 0;
  const metierPrincipal = projectMetier(project, quotes);
  const pointsSecond = melangee
    ? readCycle(
        project,
        metierPrincipal === "etudes" ? devisGroupe : devisStructure,
        interactions,
        jalons,
        now,
        metierPrincipal === "etudes" ? "travaux" : "etudes",
        marks,
      )
    : null;
  const titreFrise = (metier: "etudes" | "travaux") =>
    metier === "etudes" ? "OMPT STRUCTURE · étude" : "OMPT GROUPE · travaux";
  const lead = leadQuote(quotes);
  /** Les preuves jointes aux crans de cette affaire. */
  const preuves = (customer.step_proofs ?? []).filter((proof) => proof.project_id === project.id);
  /*
    Trois chemins pour une preuve, une seule réponse : un fichier part dans
    OneDrive, un courriel y copie ses pièces jointes, une note ou un lien reste
    en base. L'écran lit la même forme dans les trois cas.
  */
  const ajouterPreuve = useAction(
    async (step: CycleStep, input: StepProofInput, file: File | null): Promise<ProofBatch> => {
      if (file) return api.uploadStepProof(project.id, step, input, file);
      if (input.mail_message_id) return api.createMailStepProof(project.id, { step, ...input });
      const proof = await api.createStepProof(project.id, { step, ...input });
      return { proofs: [proof], folder_path: "", folder_url: "", folder_created: false, skipped: [], warning: "" };
    },
  );
  const retirerPreuve = useAction((id: string) => api.deleteStepProof(id));
  /*
    Le métier, la mission et le délai, lus une fois pour l'en-tête et les jalons.

    Une affaire livrée ne dit plus son délai : un retard rattrapé n'est plus une
    alerte. Pour un chantier, « livré » veut dire réalisé.
  */
  const metier = projectMetier(project, quotes);
  const mission = missionOf(project, quotes);
  const echeance = deadlineOf(
    project,
    metier === "etudes" ? deliveredAt(jalons, mission) !== null : project.stage === "realise",
    now,
  );

  const reopen = useAction(() =>
    api.setProjectStage(project.id, { stage: project.stage, outcome: null, outcome_note: "" }),
  );

  /*
    L'acompte vit sur le devis signé, et sa route ne touche que lui : statut et
    montant. Un montant omis reste celui que porte déjà le devis — marquer
    « facturé » ne doit pas effacer ce qu'on a saisi.
  */
  const porteur = quotes.find((q) => q.status === "accepte" || q.status === "realise") ?? lead;
  const setDeposit = useAction((status: "en_attente" | "recu", amount?: string | null) => {
    if (!porteur) throw new Error("Aucun devis à mettre à jour sur cette affaire.");
    return api.setQuoteDeposit(porteur.id, {
      status,
      amount: amount === undefined ? porteur.deposit_amount : amount,
    });
  });

  /** Encaisse l'acompte avec son montant, ou corrige le montant. */
  async function encaisser(amount: string | null): Promise<boolean> {
    const ok = (await setDeposit.run("recu", amount)) !== null;
    if (ok) onChanged();
    return ok;
  }

  /** Retire l'encaissement. Le montant reste sur le devis, le statut repart en attente. */
  async function retirerAcompte(): Promise<boolean> {
    const ok = (await setDeposit.run("en_attente")) !== null;
    if (ok) onChanged();
    return ok;
  }

  /*
    Le solde suit exactement l'acompte : sa propre route, qui ne touche que lui.

    Il passait par le devis entier — le défaut même que la route d'acompte
    ferme — et cet écran-ci le connaissait assez pour ne rien perdre, mais
    `updateQuote` efface la provenance du montant lu dans le PDF dès que les
    montants diffèrent : solder un devis remettait sa lecture en file.

    Deux actions distinctes parce qu'un solde encaissé n'implique pas un
    acompte, ni l'inverse — on peut solder une prestation payée en une fois.
  */
  const setBalance = useAction((status: "en_attente" | "recu", amount?: string | null) => {
    if (!porteur) throw new Error("Aucun devis à mettre à jour sur cette affaire.");
    return api.setQuoteBalance(porteur.id, {
      status,
      amount: amount === undefined ? porteur.balance_amount : amount,
    });
  });

  /** Encaisse le solde avec son montant, ou corrige le montant. */
  async function solder(amount: string | null): Promise<boolean> {
    const ok = (await setBalance.run("recu", amount)) !== null;
    if (ok) onChanged();
    return ok;
  }

  /** Retire l'encaissement du solde. Le montant reste sur le devis. */
  async function retirerSolde(): Promise<boolean> {
    const ok = (await setBalance.run("en_attente")) !== null;
    if (ok) onChanged();
    return ok;
  }

  /** Les deux fenêtres qui touchent à l'affaire elle-même : sa société, sa suppression. */
  const [changerSociete, setChangerSociete] = useState(false);
  const [supprimer, setSupprimer] = useState(false);

  /*
    Cocher un cran de la frise.

    Chaque cran écrit là où le fait vit déjà — l'affaire, le devis, les jalons —
    et `stepWrite` est le seul endroit qui le dit. Un cran n'attend jamais celui
    d'avant : c'est ce qui permet de poser « signé » sur une affaire dont aucun
    rendez-vous n'a été saisi, ce que la frise déduite refusait de dire.
  */
  function marquerCran(step: CycleStep, at: string | null): void | Promise<void> {
    const write = stepWrite(step);
    switch (write.target) {
      case "mark":
      case "jalon":
      case "materials":
        // `poserJalon` peint avant d'écrire : rien à attendre pour voir le
        // résultat, et le panneau peut se fermer sur un cran déjà vert.
        void onOverride({ [write.field]: at } as Partial<Jalons & StepMarks>);
        return;
      case "worksite_date":
        void onOverride({ worksite_date: at });
        return;
      case "quote": {
        /*
          L'acompte et le solde sont portés par le devis : le CRM n'en tient
          pas une seconde copie, et le serveur horodate d'après le statut.

          Il n'y a donc **aucun aperçu local possible** — le cran se lit du
          devis, que seul l'aller-retour peut changer. C'est la raison de la
          promesse rendue : le panneau reste ouvert, son bouton désactivé, au
          lieu de disparaître sur un point resté gris.
        */
        const action = write.field === "deposit" ? setDeposit : setBalance;
        return action.run(at ? "recu" : "en_attente").then((ok) => {
          if (ok) onChanged();
        });
      }
    }
  }

  /**
   * La commande de matériaux : ce qui a été commandé, et quand.
   *
   * Les deux partent ensemble parce qu'elles décrivent un fait unique, et
   * `null` les retire toutes les deux — une liste de ce qui a été commandé n'a
   * aucun sens sans la commande.
   *
   * La date déjà posée est **conservée** : compléter la liste trois jours plus
   * tard ne doit pas faire croire qu'on a commandé aujourd'hui.
   */
  function commanderMateriaux(list: string[] | null): Promise<boolean> {
    if (list === null) return onOverride({ materials: [], materials_ordered_at: null });
    return onOverride({
      materials: list,
      materials_ordered_at: jalons.materials_ordered_at ?? new Date().toISOString(),
    });
  }

  async function act(key: ActionKey) {
    switch (key) {
      case "interaction":
        setLogging("appel");
        break;
      case "plan_rdv":
        setLogging("rdv");
        break;
      case "open_calendar":
        router.push("/calendar");
        break;
      case "new_quote":
        onAddQuote();
        break;
      case "relance":
        setRelance(true);
        break;
      case "refuse":
        setOutcome("refuse");
        break;
      case "postpone":
        setOutcome("postpone");
        break;
      case "reopen":
      case "resume":
        if (await reopen.run()) onChanged();
        break;
      case "deposit_invoiced":
        if (await setDeposit.run("en_attente")) onChanged();
        break;
      case "deposit_paid":
        // Encaisser demande de dire combien : le client change parfois
        // l'acompte, et c'est ce montant qu'on vérifie sur le relevé.
        setAcompte(true);
        break;
      case "send_rib":
        onOverride({ rib_sent_at: new Date().toISOString() });
        break;
      case "send_insurance":
        onOverride({ insurance_sent_at: new Date().toISOString() });
        break;
      case "book_date":
        // Réserver une date demande de choisir, pas de cocher : on emmène
        // l'utilisateur là où le sélecteur se trouve.
        setOpen(true);
        setTab("apres");
        break;
      case "order_materials":
        /*
          Commander demande de dire **quoi**, pas de cocher.

          Basculer l'onglet « Après-signature » ne suffisait pas : il vit tout
          en bas de l'affaire dépliée, si bien que cliquer ne faisait rien de
          visible et qu'il fallait deviner qu'il fallait descendre. La saisie
          vient donc à l'écran.
        */
        setMateriaux(true);
        break;
      case "send_plans":
        onOverride({ plans_sent_at: new Date().toISOString() });
        break;
      case "invoice_balance":
        // Le solde appartient au devis, comme l'acompte : c'est lui qui porte
        // le règlement.
        if (await setBalance.run("recu")) onChanged();
        break;
      case "ask_review":
        onOverride({ review_requested_at: new Date().toISOString() });
        break;
      case "record_review":
        onOverride({ review_received_at: new Date().toISOString() });
        break;
      // La production du bureau d'études : chaque geste date son jalon, et le
      // livrable qu'il produit — la note de calcul, le dossier, le rapport.
      case "calc_done":
        onOverride({ calc_done_at: new Date().toISOString() });
        break;
      case "final_ready":
        onOverride({ final_ready_at: new Date().toISOString() });
        break;
      case "write_report":
        onOverride({ report_written_at: new Date().toISOString() });
        break;
      case "send_report":
        onOverride({ report_sent_at: new Date().toISOString() });
        break;
      case "survey_done":
        onOverride({ survey_done_at: new Date().toISOString() });
        break;
      case "send_survey_report":
        onOverride({ survey_report_sent_at: new Date().toISOString() });
        break;
      case "open_worksite":
        // Le chantier **est** cette affaire : on emmène son identifiant, sinon
        // on atterrit sur une liste de quarante-neuf et il faut y rechercher
        // ce qu'on venait de quitter.
        router.push(`/chantiers?affaire=${project.id}`);
        break;
    }
  }

  const site = [project.site_address, project.site_postal_code, project.site_city]
    .filter(Boolean)
    .join(", ");
  const periode = periodeChantier(project.started_at, project.finished_at);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover:bg-muted/30 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors">
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Le numéro qu'on dicte au téléphone et qu'on écrit sur un plan. */}
              {project.reference && (
                <span
                  data-demo="project-reference"
                  className="text-muted-foreground font-mono text-[11px] font-semibold"
                >
                  {projectReference(project.reference, metier)}
                </span>
              )}
              <span className="truncate text-sm font-medium">{project.label}</span>
              {metier === "etudes" && (
                <span
                  data-demo="project-mission"
                  className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]"
                >
                  {PROJECT_MISSION[mission].label}
                </span>
              )}
              {echeance && (
                <span
                  data-demo="project-deadline"
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium",
                    TONE_SOFT[echeance.tone],
                  )}
                >
                  {echeance.label}
                </span>
              )}
              {hasSurvey(quotes) && (
                <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]">
                  sondage
                </span>
              )}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {site || "Chantier non renseigné"}
              {periode && <span data-demo="project-periode"> · {periode}</span>}
              {project.manager_name && ` · ${project.manager_name}`}
            </div>
          </div>

          {/* Replié, la frise et l'attente répondent seules à « où en est-on ». */}
          <ProjectCycle points={points} size="mini" className="hidden shrink-0 sm:inline-flex" />

          <span
            className={cn(
              "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap md:inline-block",
              action.alert ? TONE_SOFT[action.tone] : "text-muted-foreground",
            )}
          >
            {action.title}
          </span>

          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {project.total_amount_ttc === "0" ? "—" : formatAmount(project.total_amount_ttc)}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-4 border-t px-4 py-4">
            {/*
              La frise se coche ici, et seulement ici : c'est le seul écran où
              l'affaire est ouverte, donc le seul où l'on sait de quelle affaire
              on parle. Dans la liste et le tableau de bord, elle se lit.
            */}
            <div data-demo="project-cycle">
            {melangee && (
              <span className="text-muted-foreground mb-1.5 block text-[11px] font-medium tracking-wide uppercase">
                {titreFrise(metierPrincipal)}
              </span>
            )}
            <ProjectCycle
              points={points}
              edit={
                canWrite
                  ? {
                      markedAt: (step) => stepMarkedAt(step, jalons, marks),
                      onMark: marquerCran,
                      hasQuote: lead !== null,
                      onAddQuote,
                      materials: jalons.materials,
                      onMaterials: commanderMateriaux,
                      deposit: {
                        amount: jalons.deposit_amount,
                        total: depositTotalOf(porteur),
                      },
                      onDeposit: encaisser,
                      onDepositRemove: retirerAcompte,
                      balance: {
                        amount: porteur?.balance_amount ?? null,
                        total: depositTotalOf(porteur),
                      },
                      onBalance: solder,
                      onBalanceRemove: retirerSolde,
                      proofs: (step) => preuves.filter((proof) => proof.step === step),
                      autoProofs: (step) => autoProofsOf(step, quotes, interactions),
                      customerId: customer.id,
                      drivePath: project.drive_path,
                      onAddProof: async (step, input, file) => {
                        const batch = await ajouterPreuve.run(step, input, file);
                        if (batch === null) return { ok: false, message: "" };
                        onChanged();
                        return { ok: true, message: describeBatch(batch) };
                      },
                      onRemoveProof: async (id) => {
                        // 204 sans corps rend `undefined` : seul `null` dit l'échec.
                        const ok = (await retirerPreuve.run(id)) !== null;
                        if (ok) onChanged();
                        return ok;
                      },
                      pending: saving || setDeposit.pending || setBalance.pending,
                    }
                  : undefined
              }
            />
            </div>

            {pointsSecond && (
              <div className="flex flex-col gap-1.5" data-demo="project-cycle-second">
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                  {titreFrise(metierPrincipal === "etudes" ? "travaux" : "etudes")}
                </span>
                <ProjectCycle points={pointsSecond} />
                <p className="text-muted-foreground text-[11px]">
                  Cette affaire porte des devis des deux sociétés, donc deux
                  parcours. Cette frise se lit seulement : cocher un cran
                  écrirait sur le devis porteur, qui appartient à l&apos;autre
                  société.
                </p>
              </div>
            )}

            {/*
              L'affaire ne dit pas de quoi il s'agit.

              Elle passe avant « à faire maintenant » parce qu'elle passe avant
              dans le temps : on ne chiffre pas ce qu'on n'a pas nommé. Elle
              disparaît dès que le type est posé — une alerte permanente cesse
              d'être une alerte.
            */}
            {canWrite && projetIncomplet(project) && (
              <ProjectOnboardingButton onClick={() => setCompleter(true)} />
            )}

            {/* L'acompte écrit sur le devis : un refus doit se lire quelque part. */}
            {setDeposit.error && <ErrorNotice message={setDeposit.error} />}
            {(ajouterPreuve.error || retirerPreuve.error) && (
              <ErrorNotice message={ajouterPreuve.error ?? retirerPreuve.error ?? ""} />
            )}

            <div data-demo="next-action">
            {canWrite && (
              <ProjectNextAction
                action={action}
                onAct={act}
                pending={reopen.pending || setDeposit.pending || setBalance.pending || saving}
              />
            )}
              <ProjectNextAssignment
                project={project}
                customerName={customer.display_name}
                action={action}
                canWrite={canWrite}
                onChanged={onChanged}
              />
            </div>

            {project.source_status && (
              <p className="text-muted-foreground text-xs">
                Suivi Excel :{" "}
                <span className="font-mono text-[0.7rem]">« {project.source_status} »</span>
              </p>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="chronologie">
                    Chronologie
                    {interactions.length > 0 && (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {interactions.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="devis" data-demo="tab-devis">
                    Devis
                    {quotes.length > 0 && (
                      <span className="text-muted-foreground ml-1.5 text-xs">{quotes.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="apres" data-demo="tab-apres">Après-signature</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <EnumBadge value={project.stage} entries={PROJECT_STAGE} />
                  {/*
                    Ouvrir l'affaire côté exécution.

                    **Le bouton ne s'affiche que pour une affaire signée**, parce
                    qu'un chantier *est* une affaire d'étape `gagne` ou
                    `realise` : `GET /v1/worksites` ne sert que celles-là, et
                    proposer le passage sur une affaire en négociation mènerait
                    à un panneau vide.

                    Il emmène l'identifiant : l'écran lit `?affaire=` et ouvre
                    la bonne fiche, là où une liste de quarante-neuf obligerait
                    à y rechercher ce qu'on vient de quitter. Il n'y a pas de
                    route `/chantiers/{id}` et il n'en faut pas — une route
                    dynamique ne s'exporte pas en statique, ce dont
                    l'application de bureau dépend.

                    L'écran suit le métier : une étude va dans Études, des
                    travaux dans Chantiers. Envoyer une étude vers Chantiers
                    l'afficherait sous une frise qui n'est pas la sienne.
                  */}
                  {(project.stage === "gagne" || project.stage === "realise") && (
                    <Button
                      size="xs"
                      variant="outline"
                      data-demo="project-worksite"
                      title={
                        metier === "etudes"
                          ? "Ouvrir cette étude dans Études"
                          : "Ouvrir ce chantier dans Chantiers"
                      }
                      onClick={() =>
                        router.push(
                          `${metier === "etudes" ? "/etudes" : "/chantiers"}?affaire=${project.id}`,
                        )
                      }
                    >
                      <HardHatIcon />
                      {metier === "etudes" ? "Étude" : "Chantier"}
                    </Button>
                  )}
                  {canWrite && (
                    <Button
                      size="xs"
                      variant="outline"
                      data-demo="project-issuer"
                      title="Basculer l'affaire vers l'autre société"
                      onClick={() => setChangerSociete(true)}
                    >
                      {metier === "etudes" ? "STRUCTURE" : "GROUPE"}
                      {!project.issuer && <span className="text-muted-foreground font-normal">· déduite</span>}
                    </Button>
                  )}
                  <ClaudeButton
                    size="xs"
                    context={projectContext({
                      label: project.label,
                      stage: PROJECT_STAGE[project.stage].label,
                      site,
                      quotes: quotes.length,
                      documents: quotes.filter((quote) => quote.drive_url).length,
                      interactions: interactions.length,
                    })}
                  />
                  {canWriteQuotes && (
                    <Button size="xs" variant="outline" onClick={onAddQuote}>
                      <FilePlusIcon />
                      Devis
                    </Button>
                  )}
                  {canWrite && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={onEdit}
                      title="Intitulé, type, responsable, intervenants"
                      data-demo="project-edit"
                    >
                      <PencilIcon />
                      Modifier
                    </Button>
                  )}
                  {canWrite && (
                    <Button
                      size="xs"
                      variant="ghost"
                      data-demo="project-delete"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setSupprimer(true)}
                    >
                      <Trash2Icon />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>

              <TabsContent value="chronologie" className="pt-4">
                <ProjectTimeline interactions={interactions} />
              </TabsContent>

              <TabsContent value="devis" className="pt-4">
                <div className="flex flex-col gap-3">
                  <QuoteList quotes={quotes} payments={customer.payments} onChanged={onChanged} />
                  {/* La sous-traitance se lit en face des devis : c'est là que la
                      marge a un sens. */}
                  <SubcontractingPanel
                    key={project.subcontractors.map((s) => `${s.subcontractor_id}:${s.amount}`).join("|")}
                    project={project}
                    quotes={quotes}
                    canWrite={canWrite}
                    onChanged={onChanged}
                  />
                </div>
              </TabsContent>

              <TabsContent value="apres" className="pt-4">
                <ProjectJalons
                  metier={metier}
                  mission={mission}
                  jalons={jalons}
                  onMaterials={commanderMateriaux}
                  depositTotal={depositTotalOf(porteur)}
                  onDeposit={encaisser}
                  onDepositRemove={retirerAcompte}
                  // Même verrou que la frise : ces cases écrivent par la
                  // même route, qui remplace la ligne entière.
                  disabled={!canWrite || saving || setDeposit.pending}
                  onToggle={async (key, value) => {
                    /*
                      L'acompte appartient au devis : cocher « facturé » ou
                      « encaissé » change son statut, et le serveur en horodate
                      la date. Les quatre autres jalons passent par leur table.
                    */
                    if (key === "deposit_invoiced_at") {
                      if (await setDeposit.run(value ? "en_attente" : "en_attente")) onChanged();
                      return;
                    }
                    if (key === "deposit_paid_at") {
                      if (await setDeposit.run(value ? "recu" : "en_attente")) onChanged();
                      return;
                    }
                    onOverride({ [key]: value });
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {completer && (
        <ProjectOnboardingDrawer
          customer={customer}
          project={project}
          milestones={customer.milestones?.find(
            (entry) => entry.project_id === project.id,
          )}
          open={completer}
          onOpenChange={setCompleter}
          onSaved={onChanged}
        />
      )}

      <MaterialsDialog
        open={materiaux}
        onOpenChange={setMateriaux}
        materials={jalons.materials}
        marked={jalons.materials_ordered_at}
        pending={saving}
        onSave={commanderMateriaux}
      />

      {changerSociete && (
        <ProjectIssuerDialog
          project={project}
          quotes={quotes}
          open={changerSociete}
          onOpenChange={setChangerSociete}
          onSaved={onChanged}
        />
      )}
      <DeleteProjectDialog
        project={project}
        open={supprimer}
        onOpenChange={setSupprimer}
        onDeleted={() => {
          setSupprimer(false);
          onChanged();
        }}
      />

      <DepositDialog
        open={acompte}
        onOpenChange={setAcompte}
        amount={jalons.deposit_amount}
        paid={jalons.deposit_paid_at !== null}
        total={depositTotalOf(porteur)}
        pending={setDeposit.pending}
        onSave={encaisser}
      />

      {relance && (
        <RelanceDialog
          customer={customer}
          project={project}
          quotes={quotes}
          open={relance}
          onOpenChange={setRelance}
          onSaved={onChanged}
        />
      )}
      {outcome && (
        <OutcomeDialog
          project={project}
          mode={outcome}
          open={outcome !== null}
          onOpenChange={(next) => !next && setOutcome(null)}
          onSaved={onChanged}
          onScheduleResume={async (date, _outcome, note) => {
            await onOverride({ resume_at: date });
            /*
            Une affaire reportée n'est réveillée par rien.

            La date de reprise devient donc une vraie tâche, échue ce jour-là et
            rattachée à l'affaire. C'est le seul mécanisme du CRM qui sache
            revenir vers quelqu'un à une date, et le réécrire ici en aurait fait
            un second — qui aurait divergé du premier.
            */
            await createTask({
              title: `Reprendre « ${project.label} »`,
              body: note ? `Reportée : ${note}` : "Affaire reportée, à revoir.",
              status: "a_faire",
              // Une affaire reportée se reprend, elle n'urge pas.
              priority: "normale",
              size: null,
              due_at: new Date(`${date}T09:00:00`).toISOString(),
              assignee_id: null,
              targets: [{ project_id: project.id }],
            }).catch(() => {
              // Le report lui-même est déjà enregistré : échouer ici ne doit
              // pas défaire ce que l'utilisateur vient de valider.
            });
          }}
        />
      )}
      {logging && (
        <InteractionDialog
          project={project}
          kind={logging}
          open={logging !== null}
          onOpenChange={(next) => !next && setLogging(null)}
          onSaved={onChanged}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Les devis, et la négociation qui s'y lit
// ---------------------------------------------------------------------------

/**
 * La liste des devis, du plus ancien au plus récent.
 *
 * L'ordre chronologique n'est pas cosmétique : c'est ainsi qu'on voit la
 * négociation. Deux devis de même nature à trois semaines d'écart, le second
 * moins cher, racontent une remise — l'écart est affiché, parce que c'est lui
 * qu'on cherche.
 */
function QuoteList({
  quotes,
  payments,
  onChanged,
}: {
  quotes: Quote[];
  /** Les virements de toute la fiche : chaque ligne y prend les siens. */
  payments: QuotePayment[];
  onChanged: () => void;
}) {
  const canDelete = usePermission("quotes:delete");
  const canWrite = usePermission("quotes:write");
  const remove = useAction((id: string) => api.deleteQuote(id));
  /*
    Le devis qu'on corrige.

    Trois sources ont peuplé le CRM sans se connaître — le classeur, l'export de
    devis, les deux arborescences OneDrive — et un devis repris de l'une d'elles
    peut porter une référence, un montant, une date ou une société à corriger.
    On ne pouvait que le supprimer, ce qui perdait aussi ce qu'il avait de juste.
  */
  const [editing, setEditing] = useState<Quote | null>(null);

  if (quotes.length === 0) {
    return (
      <EmptyState
        title="Aucun devis"
        description="L'étude, les sondages et les travaux se chiffrent ici, un devis par lot."
      />
    );
  }

  const ordered = revisions(quotes);

  return (
    <>
      <ul className="divide-y">
        {ordered.map((quote, index) => {
          /*
            Une révision se compare à la pièce de **même nature**. `kind` n'y
            suffit pas — il vaut `travaux` sur tout ce que la copie OneDrive
            crée, factures comprises — si bien qu'une facture d'acompte de
            5 000 € rangée sous un devis de 10 000 € s'affichait « révision 2,
            −5 000 € ». Invisible tant qu'une seule facture portait un montant,
            systématique dès que la lecture des PDF les peuple.
          */
          const memeNature = (other: Quote) =>
            other.kind === quote.kind && estFacture(other) === estFacture(quote);
          const previous = ordered.slice(0, index).filter(memeNature).at(-1);
          const delta = previous ? amount(quote) - amount(previous) : 0;
          const revision = previous ? ordered.slice(0, index).filter(memeNature).length + 1 : 0;

          return (
            <li key={quote.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <span className="font-mono text-xs">{quote.reference || quote.label || "Devis"}</span>
              {/* La société qui émet : sur une même affaire, l'étude est à
                  STRUCTURE et les travaux à GROUPE, et la référence seule ne le
                  dit pas — les deux numérotent chacune de leur côté. */}
              {quote.issuer && (
                <EnumBadge value={quote.issuer} entries={QUOTE_ISSUER} />
              )}
              <EnumBadge value={quote.kind} entries={QUOTE_KIND} />
              <EnumBadge value={quote.status} entries={QUOTE_STATUS} />

              {revision > 1 && (
                <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]">
                  révision {revision}
                </span>
              )}

              {quote.deposit_status !== "non_applicable" && (
                <span className="text-muted-foreground text-xs">
                  acompte {PAYMENT_STATUS[quote.deposit_status].label.toLowerCase()}
                  {quote.deposit_amount && ` · ${formatAmount(quote.deposit_amount)}`}
                </span>
              )}

              <span className="text-muted-foreground text-xs">{formatDate(quote.issued_at)}</span>

              <span className="ml-auto flex items-center gap-2">
                {delta !== 0 && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      delta < 0 ? "text-success" : "text-warning",
                    )}
                    title={`Écart avec ${previous?.reference || "le devis précédent"}`}
                  >
                    {delta > 0 ? "+" : ""}
                    {Math.round(delta).toLocaleString("fr-FR")} €
                  </span>
                )}
                <span className="text-sm font-medium tabular-nums">
                  {quote.amount_ttc || quote.amount_ht
                    ? formatAmount(quote.amount_ttc ?? quote.amount_ht)
                    : quote.amount_note || "—"}
                </span>
                {/* D'où vient le chiffre : lu du PDF, l'infobulle montre la
                    ligne du document qui l'a justifié. */}
                {quote.amount_source === "pdf" && (
                  <span
                    data-demo="quote-amount-source"
                    title={quote.amount_evidence || "Montant lu dans le PDF du devis"}
                    className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]"
                  >
                    lu du PDF
                  </span>
                )}
                {/*
                  Ce que le document dit, quand il contredit la saisie.

                  Mesuré le 16/09 : quatorze devis sur les quarante-neuf qui
                  portaient à la fois une saisie et un PDF — une remise, une
                  révision, ou un TTC ramené en HT. Le CRM ne corrige rien : il
                  le dit, l'infobulle montre la ligne du document, et la
                  décision reste commerciale.
                */}
                {quote.amount_pdf_ht &&
                  quote.amount_ht &&
                  Math.abs(Number(quote.amount_pdf_ht) - Number(quote.amount_ht)) > 0.01 && (
                    <span
                      data-demo="quote-amount-divergence"
                      title={
                        quote.amount_pdf_evidence ||
                        "Montant lu dans le PDF, différent de celui saisi"
                      }
                      className="text-warning bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]"
                    >
                      le PDF dit {formatAmount(quote.amount_pdf_ht)}
                    </span>
                  )}
                {quote.amount_read_error && !quote.amount_ht && !quote.amount_ttc && (
                  <span className="text-warning text-[0.65rem]" title={quote.amount_read_error}>
                    montant illisible
                  </span>
                )}
              </span>

              {/*
                Le devis lui-même, quand la copie OneDrive en connaît l'adresse.
                Le fichier n'est pas dans le CRM : le lien l'ouvre chez Microsoft,
                et c'est ce qui évite de faire entrer trois cents PDF en base.
              */}
              {/* Lire la pièce : c'est là que dorment montants et acomptes. */}
              <ClaudeButton
                size="xs"
                iconOnly
                context={quoteContext({
                  reference: quote.reference,
                  kind: QUOTE_KIND[quote.kind].label,
                  document: quote.drive_name,
                  amount: quote.amount_ttc
                    ? `${formatAmount(quote.amount_ttc)} TTC`
                    : quote.amount_ht
                      ? `${formatAmount(quote.amount_ht)} HT`
                      : null,
                  invoice: estFacture(quote),
                })}
              />
              {quote.drive_url && (
                <PreviewLink
                  url={quote.drive_url}
                  name={quote.drive_name || quote.reference || "Devis"}
                  className="text-muted-foreground hover:border-primary/40 flex w-full min-w-0 gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs transition-colors"
                >
                  <FileTextIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{quote.drive_name || "Ouvrir le devis"}</span>
                </PreviewLink>
              )}

              {quote.comment && (
                <p className="text-muted-foreground w-full text-xs">{quote.comment}</p>
              )}

              {/*
                Les virements de l'acompte, quand il y en a.

                Ils prennent toute la largeur de la ligne — le `li` est en
                `flex-wrap`, donc ce bloc passe seul en dessous — et ne
                s'affichent que si un acompte est attendu ou reçu : un
                formulaire de virement sous une facture déjà soldée n'aurait
                rien à recevoir. Le solde se fractionne de la même façon en
                base et n'a pas encore d'écran.
              */}
              {quote.deposit_status !== "non_applicable" && (
                <QuotePayments
                  quoteId={quote.id}
                  payments={payments.filter(
                    (payment) => payment.quote_id === quote.id && payment.kind === "acompte",
                  )}
                  canWrite={canWrite}
                  onChanged={onChanged}
                />
              )}

              {/*
                Un devis peut être faux : deux fois le même repris d'un dossier
                OneDrive, un montant lu de travers, une référence attribuée à la
                mauvaise affaire. On le corrige ou on le supprime ici, à la ligne
                où on le voit.
              */}
              {canWrite && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground/50 hover:text-foreground -my-1"
                  aria-label="Modifier le devis"
                  onClick={() => setEditing(quote)}
                >
                  <PencilIcon />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground/50 hover:text-danger -my-1"
                  aria-label="Supprimer le devis"
                  disabled={remove.pending}
                  onClick={async () => {
                    const nom = quote.reference || quote.label || "ce devis";
                    if (!confirm(`Supprimer le devis « ${nom} » ?`)) return;
                    if ((await remove.run(quote.id)) !== null) onChanged();
                  }}
                >
                  <Trash2Icon />
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {/* La boîte vit hors de la liste : une liste ne porte que ses lignes. */}
      <QuoteDialog
        // Remontée à chaque devis : le formulaire part de ce que porte
        // celui-ci, et non de ce que portait le précédent.
        key={editing?.id ?? "quote-closed"}
        project={null}
        quote={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
    </>
  );
}

/*
  Une facture se reconnaît à sa référence, et `kind` ne peut pas servir : la
  copie OneDrive pose `travaux` sur toutes les pièces qu'elle crée, factures
  comprises. Le serveur tient la même règle en SQL — `est_facture`, migration 59.
*/
function estFacture(quote: Quote): boolean {
  return quote.reference.toUpperCase().startsWith("FA");
}

function amount(quote: Quote): number {
  const raw = quote.amount_ttc ?? quote.amount_ht;
  const value = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isNaN(value) ? 0 : value;
}
