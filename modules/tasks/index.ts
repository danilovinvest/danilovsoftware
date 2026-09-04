export { TasksView } from "./components/tasks-view";
export { CustomerTasksPanel } from "./components/customer-tasks-panel";
export { TaskStatusBadge } from "./components/task-badge";
// Reporter une affaire crée une tâche de reprise : sans elle, une affaire mise
// en pause n'est réveillée par rien. C'est la seule écriture que le module des
// fiches client fait ici, et elle passe par la surface publique.
export { createTask } from "./lib/api";
export * from "./lib/types";
