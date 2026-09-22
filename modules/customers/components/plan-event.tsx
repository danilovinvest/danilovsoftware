"use client";

import { useEffect, useState } from "react";
import { EventForm, listCalendars, type Calendar, type EventPreset } from "@/modules/calendar";

/**
 * Le formulaire de l'agenda, ouvert depuis un écran qui n'est pas l'agenda.
 *
 * « Planifier le RDV » créait un échange daté de J+3 dans l'historique : le
 * rendez-vous n'apparaissait pas dans l'agenda, ni rappel ni conflit visible. Il
 * ouvre désormais le vrai formulaire, fiche, affaire et catégorie posées — un
 * seul écran pour un même objet, comme depuis l'onglet Échanges.
 *
 * Les agendas ne sont lus qu'à l'ouverture : la plupart des fiches ne planifient
 * rien, et le formulaire en a besoin pour proposer où poser l'événement.
 */
export function PlanEvent({
  open,
  onClose,
  onSaved,
  preset,
  range = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  preset: EventPreset;
  range?: { from: Date; to: Date; allDay: boolean } | null;
}) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    listCalendars(controller.signal)
      .then((page) => setCalendars(page.items))
      // Sans agendas, le formulaire le dit lui-même au moment d'enregistrer.
      .catch(() => {});
    return () => controller.abort();
  }, [open]);

  if (!open || calendars.length === 0) return null;
  return (
    <EventForm
      open
      onClose={onClose}
      onSaved={onSaved}
      calendars={calendars}
      range={range}
      preset={preset}
    />
  );
}
