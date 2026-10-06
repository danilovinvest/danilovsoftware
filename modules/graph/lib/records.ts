/**
 * Une table complète sur une liste de clés connue.
 *
 * `Object.fromEntries` rend un dictionnaire ouvert ; la liste de clés, elle,
 * garantit que chaque clé est là. C'est le seul endroit du module qui le dit
 * au compilateur.
 */
export function recordOf<K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<K, V>;
}
