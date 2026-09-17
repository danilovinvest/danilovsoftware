/**
 * Structure du groupe : les sociétés et leurs pôles d'activité.
 *
 * Référence transverse, pas un écran. La facturation s'en sert pour savoir qui
 * émet une facture, les chantiers pour savoir qui exécute, et le jour où le
 * tableau de bord se scindera par métier il s'en servira aussi. C'est
 * précisément parce que trois modules en dépendent qu'elle ne vit dans aucun
 * des trois.
 */
export {
  ENTITIES,
  ENTITY_BY_ID,
  DORMANT_ENTITIES,
  entityName,
  type Entity,
  type EntityRole,
} from "./lib/entities";
export {
  companyLabel,
  companyOptions,
  scopeFromHost,
  scopeName,
  scopeParam,
  useScope,
  type Scope,
} from "./lib/scope";
export {
  ACTIVITIES,
  ACTIVITY_BY_ID,
  activitiesOfEntity,
  activityName,
  entityOfActivity,
  type Activity,
  type ActivityKind,
} from "./lib/activities";
