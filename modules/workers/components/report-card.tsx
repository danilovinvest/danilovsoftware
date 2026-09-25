"use client";

import { useState } from "react";
import { DownloadIcon, MailIcon, SendIcon } from "lucide-react";
import { LIVE, STABLE, useCached } from "@/shared/api/cache";
import { apiFetchBlob } from "@/shared/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { askConfirm } from "@/shared/ui/confirm";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import { useAuth } from "@/modules/auth";
import * as api from "../lib/api";
import { monthLabel } from "../lib/labels";

/**
 * Le rapport mensuel au comptable.
 *
 * **Le CRM n'envoie aucun courriel, sauf celui-ci.** La messagerie lit, les
 * invitations se copient à la main, les automatisations passent par Telegram.
 * L'exception est étroite : un destinataire, un mois, une pièce jointe — et
 * elle part par la boîte déjà raccordée, avec le mot de passe d'application
 * qui sert déjà à la lire. Aucun secret de plus.
 *
 * **Fermé par défaut**, et l'écran le dit : rien ne part tant qu'une adresse
 * n'est pas écrite et l'interrupteur allumé.
 *
 * **Trois gestes, et un seul envoie.** Voir ce que le comptable recevrait,
 * télécharger le fichier, ou l'envoyer pour de bon. L'essai **ne marque pas**
 * le mois : il ne doit pas priver le comptable de son rapport automatique.
 */
export function ReportCard({ month }: { month: string }) {
  const { can } = useAuth();
  const canAdmin = can("workers:admin");
  const [adresse, setAdresse] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [apercu, setApercu] = useState(false);

  const { data: etat, mutate } = useCached("workers:report", () => api.getReportState(), STABLE);
  const { data: rapport } = useCached(
    apercu ? `workers:report:${month}` : null,
    () => api.previewReport(month),
    LIVE,
  );

  const saisie = adresse ?? etat?.recipient ?? "";

  async function enregistrer(enabled: boolean) {
    const mail = saisie.trim();
    if (enabled && mail === "") {
      notifyError("Écrire l'adresse du comptable avant d'allumer l'envoi.");
      return;
    }
    setPending(true);
    try {
      await api.setReport(mail, enabled);
      setAdresse(null);
      await mutate();
    } catch (cause) {
      notifyError(cause instanceof Error ? cause.message : "Le réglage n'a pas été enregistré.");
    } finally {
      setPending(false);
    }
  }

  async function telecharger() {
    try {
      const blob = await apiFetchBlob(api.reportCsvUrl(month));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `absences-${month}.csv`;
      a.click();
      // Révoquée tout de suite : l'adresse ne sert qu'au clic qu'on vient de
      // faire, et la garder retiendrait le fichier en mémoire.
      URL.revokeObjectURL(url);
    } catch (cause) {
      notifyError(cause instanceof Error ? cause.message : "Le fichier n'a pas pu être lu.");
    }
  }

  async function envoyer() {
    const ok = await askConfirm({
      title: `Envoyer le rapport de ${monthLabel(month)} ?`,
      description:
        `Un courriel part maintenant à ${etat?.recipient}, avec la liste des absences ` +
        "en pièce jointe. Les samedis n'y figurent pas. Cet essai ne remplace pas " +
        "l'envoi automatique du dernier jour du mois.",
      confirmLabel: "Envoyer",
    });
    if (!ok) return;
    setPending(true);
    try {
      const out = await api.sendReport(month);
      await mutate();
      notifySuccess(`Rapport de ${out.libelle} envoyé à ${etat?.recipient}.`);
    } catch (cause) {
      await mutate();
      notifyError(cause instanceof Error ? cause.message : "L'envoi a échoué.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border p-4" data-demo="ouvriers-comptable">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <MailIcon className="size-4" /> Rapport au comptable
      </h2>
      <p className="text-muted-foreground mb-3 text-xs">
        Le dernier jour de chaque mois, la liste des absences part au comptable, en
        pièce jointe. <span className="font-medium">Les samedis n&apos;y sont pas comptés</span> —
        ils restent visibles dans la grille ci-dessus, où se décide s&apos;ils ont été
        travaillés.
      </p>

      {etat?.last_error ? (
        <p role="alert" className="text-danger mb-3 text-xs font-medium">
          Dernier envoi en échec : {etat.last_error}
        </p>
      ) : etat?.last_sent_month ? (
        <p className="text-muted-foreground mb-3 text-xs">
          Dernier envoi : {monthLabel(etat.last_sent_month)}
          {etat.last_sent_at &&
            ` le ${new Date(etat.last_sent_at).toLocaleDateString("fr-FR")}`}
          .
        </p>
      ) : (
        <p className="text-muted-foreground mb-3 text-xs">Aucun rapport encore envoyé.</p>
      )}

      {etat && !etat.can_send && (
        <p className="text-warning mb-3 text-xs font-medium">
          Aucune boîte de messagerie raccordée : rien ne peut partir. Réglages → Messagerie.
        </p>
      )}

      {canAdmin ? (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              inputMode="email"
              value={saisie}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="comptable@exemple.fr"
              aria-label="Adresse du comptable"
            />
            <Button variant="outline" disabled={pending} onClick={() => void enregistrer(etat?.enabled ?? false)}>
              Enregistrer
            </Button>
          </div>
          <label className="mb-3 flex items-center gap-2 text-xs">
            <Switch
              checked={etat?.enabled ?? false}
              disabled={pending}
              onCheckedChange={(v) => void enregistrer(v)}
            />
            Envoyer automatiquement le dernier jour du mois
          </label>
        </>
      ) : (
        <p className="text-muted-foreground mb-3 text-xs">
          {etat?.recipient
            ? `Destinataire : ${etat.recipient}. Seul un administrateur peut le changer.`
            : "Aucun destinataire. Seul un administrateur peut le renseigner."}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setApercu((v) => !v)}>
          {apercu ? "Masquer l'aperçu" : "Voir ce qu'il recevrait"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => void telecharger()}>
          <DownloadIcon className="size-3.5" /> Télécharger le CSV
        </Button>
        {canAdmin && (
          <Button
            size="sm"
            disabled={pending || !etat?.recipient || !etat?.can_send}
            onClick={() => void envoyer()}
          >
            <SendIcon className="size-3.5" /> Envoyer un essai
          </Button>
        )}
      </div>

      {apercu && rapport && (
        <div className="mt-3 overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Ouvrier</th>
                <th className="px-2 py-1.5 text-right font-medium">Jours</th>
                <th className="px-2 py-1.5 text-right font-medium">½</th>
                <th className="px-2 py-1.5 text-right font-medium">Abs.</th>
                <th className="px-2 py-1.5 text-left font-medium">Dates</th>
              </tr>
            </thead>
            <tbody>
              {rapport.lignes.map((l) => (
                <tr key={l.worker} className="border-t">
                  <td className="px-2 py-1">{l.worker}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {l.jours_travailles.toLocaleString("fr-FR")}
                  </td>
                  <td className="text-muted-foreground px-2 py-1 text-right tabular-nums">
                    {l.demi_journees || ""}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{l.absences || ""}</td>
                  <td className="text-muted-foreground px-2 py-1">
                    {l.dates_absences.join(" ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted-foreground px-2 py-1.5 text-[11px]">
            {rapport.samedis_exclus} samedi(s) écarté(s) de ce décompte.
          </p>
        </div>
      )}
    </div>
  );
}
