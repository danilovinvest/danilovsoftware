"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { ImportReport, ImportStatus, Plan } from "../lib/types";
import { PlanPreview } from "./plan-preview";

export function ImportView() {
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, setPending] = useState<"analyze" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getStatus()
      .then(setStatus)
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  async function runAnalyze(file?: File) {
    setPending("analyze");
    setError(null);
    setReport(null);
    try {
      setPlan(await api.analyze(file));
    } catch (cause) {
      setError(errorMessage(cause));
      setPlan(null);
    } finally {
      setPending(null);
    }
  }

  async function runApply() {
    if (!plan) return;
    setPending("apply");
    setError(null);
    try {
      setReport(await api.apply(plan));
      setPlan(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Synchronisation Excel</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Reprend le fichier de suivi et le transforme en fiches, affaires, devis et
          échanges. Rien n&apos;est enregistré avant votre confirmation.
        </p>
      </header>

      {error && <ErrorNotice message={error} />}

      <Card>
        <CardHeader>
          <CardTitle>1. Choisir la source</CardTitle>
          <CardDescription>
            Le classeur posé à la racine du projet est repris tel quel ; vous pouvez
            aussi en déposer un autre.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              disabled={pending !== null || !status?.default_file_available}
              onClick={() => runAnalyze()}
            >
              {pending === "analyze" ? <Spinner /> : <FileSpreadsheetIcon />}
              Analyser le fichier du projet
            </Button>

            <Button
              size="lg"
              variant="outline"
              disabled={pending !== null}
              onClick={() => fileInput.current?.click()}
            >
              <UploadIcon />
              Choisir un autre fichier
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void runAnalyze(file);
                event.target.value = "";
              }}
            />
          </div>

          {status && (
            <dl className="text-muted-foreground grid gap-2 text-xs sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <dt>Fichier du projet :</dt>
                <dd className="text-foreground font-mono">
                  {status.default_file_available
                    ? `${status.default_file_path} (${Math.round(status.default_file_size / 1024)} Ko)`
                    : "introuvable"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt>Classification des statuts :</dt>
                <dd>
                  {status.openai_configured ? (
                    <Badge className="bg-info-soft text-info">
                      <SparklesIcon /> OpenAI · {status.openai_model}
                    </Badge>
                  ) : (
                    <Badge className="bg-warning-soft text-warning">
                      Règles internes — clé OpenAI absente
                    </Badge>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="text-success size-4" />
              Synchronisation terminée
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-4">
            <Figure label="Fiches créées" value={report.customers_created} />
            <Figure label="Fiches mises à jour" value={report.customers_updated} />
            <Figure
              label="Affaires"
              value={`${report.projects_created} + ${report.projects_updated} maj`}
            />
            <Figure
              label="Devis"
              value={`${report.quotes_created} + ${report.quotes_updated} maj`}
            />
            <Figure label="Échanges ajoutés" value={report.interactions_added} />
            <Figure
              label="Échanges déjà présents"
              value={report.interactions_skipped}
            />
          </CardContent>
        </Card>
      )}

      {plan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>2. Relire l&apos;aperçu</CardTitle>
              <CardDescription>
                L&apos;étape et l&apos;issue de chaque affaire sont déduites du texte
                libre de la colonne « Statut ». Le texte d&apos;origine est affiché en
                regard pour vérification.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Figure label="Fiches à créer" value={plan.stats.customers_to_create} />
                <Figure
                  label="Fiches à mettre à jour"
                  value={plan.stats.customers_to_update}
                />
                <Figure label="Affaires" value={plan.stats.projects} />
                <Figure label="Devis" value={plan.stats.quotes} />
                <Figure label="Échanges" value={plan.stats.interactions} />
                <Figure label="À relire" value={plan.stats.low_confidence} />
              </div>

              {plan.warnings.map((warning) => (
                <p
                  key={warning}
                  className="text-warning bg-warning-soft flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                >
                  <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                  {warning}
                </p>
              ))}
            </CardContent>
          </Card>

          <PlanPreview plan={plan} />

          <div className="bg-background sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t py-4">
            <p className="text-muted-foreground text-xs">
              {plan.stats.customers_to_create + plan.stats.customers_to_update} fiches
              seront écrites en une seule transaction. Relancer la synchronisation plus
              tard met à jour l&apos;existant au lieu de le dupliquer.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPlan(null)}>
                Annuler
              </Button>
              <Button size="lg" disabled={pending !== null} onClick={runApply}>
                {pending === "apply" && <Spinner />}
                Synchroniser vers la base
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
