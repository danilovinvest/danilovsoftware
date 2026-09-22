"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ce qu'on tape dans la recherche, avant qu'il n'entre dans l'adresse.
 *
 * La recherche attend qu'on cesse de taper : une requête par frappe reste une
 * requête par frappe. Et si l'adresse change sans nous — le bouton Retour, un
 * lien —, le champ la suit : il ne doit jamais afficher une recherche que la
 * liste n'applique pas.
 */
export function useSearchDraft(committed: string, commit: (value: string) => void, delay = 300) {
  const [draft, setDraft] = useState(committed);
  const [seen, setSeen] = useState(committed);
  // L'adresse a changé sans passer par ce champ : il la reprend.
  if (committed !== seen) {
    setSeen(committed);
    setDraft(committed);
  }

  const latest = useRef(commit);
  useEffect(() => {
    latest.current = commit;
  });

  useEffect(() => {
    if (draft === committed) return;
    const timer = setTimeout(() => latest.current(draft.trim() === "" ? "" : draft), delay);
    return () => clearTimeout(timer);
  }, [draft, committed, delay]);

  return { value: draft, set: setDraft };
}
