import { DEFAULT_VIEW, isView } from "./views";
import type { MailView } from "./types";

/**
 * Ce que l'écran Messagerie regarde, dans l'adresse.
 *
 * La conversation ouverte ne se lisait qu'au montage : choisir un second
 * courriel dans ⌘K depuis la messagerie changeait l'adresse sans changer
 * l'écran (issue 91), et cliquer dans la liste changeait l'écran sans changer
 * l'adresse. L'adresse est désormais la seule source : l'écran la lit à chaque
 * rendu et l'écrit à chaque geste — « une adresse désigne ce qu'on regarde ».
 *
 * Seul ce qui s'écarte du défaut s'écrit : la boîte ouverte sans rien toucher
 * garde l'adresse `/mail`. Module pur, sans React.
 */
export type MailQuery = {
  view: MailView;
  search: string;
  /** Une adresse : « tout de ce contact ». */
  contact: string;
  /** La boîte lue. Vide = toutes. */
  account: string;
  /** Un message de la conversation ouverte, n'importe lequel. */
  message: string | null;
};

export function readMailQuery(params: { get(name: string): string | null }): MailQuery {
  const vue = params.get("vue");
  return {
    view: isView(vue) ? vue : DEFAULT_VIEW,
    search: params.get("q") ?? "",
    contact: params.get("contact") ?? "",
    account: params.get("boite") ?? "",
    message: params.get("message") || null,
  };
}

export function writeMailQuery(query: MailQuery): string {
  const params = new URLSearchParams();
  if (query.view !== DEFAULT_VIEW) params.set("vue", query.view);
  if (query.search) params.set("q", query.search);
  if (query.contact) params.set("contact", query.contact);
  if (query.account) params.set("boite", query.account);
  if (query.message) params.set("message", query.message);
  return params.toString();
}
