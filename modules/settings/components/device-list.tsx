"use client";

import { useState } from "react";
import { MonitorIcon, SmartphoneIcon, TabletIcon } from "lucide-react";
import { revokeSession } from "@/modules/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";

import { useSessions } from "../hooks/use-settings";
import { SettingsSection } from "./settings-page";

/**
 * « Vu il y a 5 min ».
 *
 * `formatRelative` du domaine raisonne en jours : pour des sessions, tout
 * tomberait sur « aujourd'hui ». Une session se juge à l'heure près, d'où ce
 * formateur local plutôt qu'un élargissement du formateur partagé, qui
 * changerait l'affichage des dates métier.
 */
function formatLastSeen(iso: string): string {
  const seen = new Date(iso).getTime();
  if (Number.isNaN(seen)) return "date inconnue";

  const minutes = Math.round((Date.now() - seen) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  return relative.format(-Math.round(hours / 24), "day");
}

/**
 * Lit un user-agent juste assez pour nommer l'appareil.
 *
 * On ne cherche pas à identifier finement : l'utilisateur doit reconnaître SA
 * machine dans une liste courte. « Chrome sur macOS » suffit à cela, et évite
 * d'embarquer une bibliothèque de détection pour une ligne de texte.
 */
function describeDevice(userAgent: string) {
  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /OPR\//.test(userAgent) ? "Opera"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /curl\//.test(userAgent) ? "curl"
    : "Navigateur inconnu";

  const os =
    /iPhone|iPad|iPod/.test(userAgent) ? "iOS"
    : /Android/.test(userAgent) ? "Android"
    : /Mac OS X/.test(userAgent) ? "macOS"
    : /Windows/.test(userAgent) ? "Windows"
    : /Linux/.test(userAgent) ? "Linux"
    : null;

  const mobile = /iPhone|iPod|Android.*Mobile/.test(userAgent);
  const tablet = /iPad|Android(?!.*Mobile)/.test(userAgent);

  return {
    label: os ? `${browser} sur ${os}` : browser,
    Icon: mobile ? SmartphoneIcon : tablet ? TabletIcon : MonitorIcon,
  };
}

/**
 * Les appareils ayant une session ouverte sur le compte.
 *
 * Chaque ligne est un refresh token vivant. Le révoquer ferme la session à
 * distance : le prochain renouvellement de cet appareil échouera et il
 * repassera par l'écran de connexion.
 */
export function DeviceList() {
  const { sessions, loading, error, reload } = useSessions();
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function revoke(id: string) {
    setPending(id);
    setFailure(null);
    try {
      await revokeSession(id);
      reload();
    } catch (cause) {
      setFailure(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <SettingsSection
      title="Appareils"
      description="Les appareils ayant une session ouverte sur votre compte."
    >
      {error ? (
        <ErrorNotice message={error} />
      ) : (
        <div className="max-h-80 divide-y overflow-y-auto rounded-lg border">
          {failure && <ErrorNotice message={failure} className="m-2" />}

          {loading
            ? Array.from({ length: 2 }, (_, index) => (
                <div key={index} className="px-3 py-2.5">
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            : sessions.map((session) => {
                const { label, Icon } = describeDevice(session.user_agent);
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{label}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        Vu {formatLastSeen(session.last_seen_at)} ·{" "}
                        <span className="font-mono">{session.ip_address}</span>
                      </p>
                    </div>
                    {session.current ? (
                      <Badge className="bg-success-soft text-success rounded-[4px]">
                        Cet appareil
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending === session.id}
                        onClick={() => revoke(session.id)}
                      >
                        {pending === session.id ? "Fermeture…" : "Fermer"}
                      </Button>
                    )}
                  </div>
                );
              })}
        </div>
      )}
    </SettingsSection>
  );
}
