"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, PlayIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { useAutomation, useRuns } from "../hooks/use-automations";
import * as api from "../lib/api";
import type { Automation, Graph } from "../lib/types";
import { AutomationCanvas, failuresOf } from "./automation-canvas";
import { RunJournal } from "./run-journal";

/**
 * L'éditeur d'une automatisation : la toile, son en-tête et son journal.
 *
 * Le corps est remonté à chaque chargement — la clé change avec la réponse — de
 * sorte que l'état de travail se calcule une fois, dans l'initialiseur du
 * `useState`. Sans cela il faudrait le synchroniser depuis un effet, et une
 * frappe rapide pendant un rechargement serait écrasée.
 */
export function AutomationEditor({ id }: { id: string }) {
  const { automation, calendars, loading, error, reload } = useAutomation(id);

  if (loading && !automation) {
    return <Skeleton className="h-[32rem] w-full rounded-xl" />;
  }
  if (error || !automation) {
    return <ErrorNotice message={error ?? "Automatisation introuvable."} />;
  }

  return (
    <EditorBody
      key={automation.id}
      automation={automation}
      calendars={calendars}
      onSaved={reload}
    />
  );
}

function EditorBody({
  automation,
  calendars,
  onSaved,
}: {
  automation: Automation;
  calendars: Array<{ id: string; name: string }>;
  onSaved: () => void;
}) {
  const [name, setName] = useState(automation.name);
  const [cron, setCron] = useState(automation.cron);
  const [timeZone, setTimeZone] = useState(automation.time_zone);
  const [active, setActive] = useState(automation.active);
  const [graph, setGraph] = useState<Graph>(automation.graph);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const journal = useRuns(automation.id, 20);
  // La dernière exécution désigne la carte qui a fauté : la toile la cerne de
  // rouge, ce qui évite de lire le journal pour savoir où regarder.
  const failures = journal.runs[0] ? failuresOf(journal.runs[0].steps) : {};

  async function save(nextActive = active) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.saveAutomation(automation.id, {
        name,
        description: automation.description,
        active: nextActive,
        cron,
        time_zone: timeZone,
        graph,
      });
      setActive(saved.active);
      setNotice(
        saved.active && saved.next_run_at
          ? `Enregistré. Prochaine exécution le ${formatDateTime(saved.next_run_at)}.`
          : "Enregistré. L'automatisation est en pause.",
      );
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
      // L'interrupteur revient à sa position : le serveur a refusé, prétendre
      // le contraire ferait croire à une automatisation armée.
      setActive(automation.active);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setError(null);
    setNotice(null);
    try {
      await api.runAutomation(automation.id);
      setNotice("Message envoyé.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setTesting(false);
      journal.reload();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
          <Link href="/automations" aria-label="Retour aux automatisations">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>

        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Nom de l'automatisation"
          className="hover:border-input focus-visible:border-input h-8 w-64 border-transparent bg-transparent px-2 text-sm font-medium shadow-none"
        />

        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-2">
            <Switch
              id="active"
              checked={active}
              onCheckedChange={(next) => {
                setActive(next);
                void save(next);
              }}
            />
            <Label htmlFor="active" className="text-xs font-normal">
              {active ? "Active" : "En pause"}
            </Label>
          </span>

          <Button variant="outline" size="sm" onClick={test} disabled={testing}>
            {testing ? <Spinner /> : <PlayIcon className="size-3.5" />}
            Essayer maintenant
          </Button>

          <Button size="sm" onClick={() => save()} disabled={saving}>
            {saving ? <Spinner /> : <SaveIcon className="size-3.5" />}
            Enregistrer
          </Button>
        </div>
      </header>

      {error && <ErrorNotice message={error} />}
      {notice && (
        <p className="text-success bg-success-soft/40 rounded-lg px-3 py-2 text-xs">
          {notice}
        </p>
      )}

      <AutomationCanvas
        graph={graph}
        cron={cron}
        timeZone={timeZone}
        calendars={calendars}
        failures={failures}
        onChange={setGraph}
        onCron={setCron}
        onTimeZone={setTimeZone}
      />

      <RunJournal runs={journal.runs} loading={journal.loading} onReload={journal.reload} />
    </div>
  );
}
