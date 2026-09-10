/** « 214 ko », « 1,3 Mo » — la taille telle qu'on la dit. */
export function weight(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}
