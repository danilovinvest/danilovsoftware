/**
 * Surface publique du module « graphe » : la vue de toute la base, ses liens
 * explicites et déduits. Les routes et les autres modules n'importent que d'ici.
 */
export { CustomersGraphScreen } from "./components/customers-graph-screen";
export { getCustomersGraph, getCustomersGraphVersion } from "./lib/api";
export { GRAPH_VERSION_POLL, useGraphVersion } from "./hooks/use-graph-version";
export type { CustomersGraph, GraphEdge, GraphEdgeKind, GraphNode } from "./lib/types";
