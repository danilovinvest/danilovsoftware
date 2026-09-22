"use client";

import { useEffect } from "react";
import {
  canReloadForStaleChunk,
  isStaleChunk,
  reloadForStaleChunk,
} from "@/shared/lib/stale-chunk";

/*
  Le dernier recours, quand le cadre lui-même a planté.

  Il remplace la mise en page racine : ni styles globaux, ni thème, ni police.
  D'où des styles écrits ici, sobres, qui suivent le thème du système.
*/
export default function GlobalError({ error }: { error: unknown }) {
  useEffect(() => {
    if (isStaleChunk(error) && canReloadForStaleChunk()) reloadForStaleChunk();
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 16,
          colorScheme: "light dark",
        }}
      >
        <title>Erreur · OMPT CRM</title>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 18 }}>Le CRM n&apos;a pas pu s&apos;afficher</h1>
          <p style={{ opacity: 0.7, fontSize: 14 }}>
            Rien n&apos;a été perdu de ce qui était déjà enregistré. Rechargez la page ; si
            l&apos;erreur revient, prévenez l&apos;administrateur.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: "8px 16px", fontSize: 14, cursor: "pointer" }}
          >
            Recharger la page
          </button>
        </div>
      </body>
    </html>
  );
}
