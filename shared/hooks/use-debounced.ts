"use client";

import { useEffect, useState } from "react";

/**
 * Retarde la propagation d'une valeur : ce qu'on tape n'interroge le serveur
 * qu'une fois la frappe posée.
 *
 * Deux copies vivent encore dans `customers` et `mail` : elles rejoindront
 * celle-ci quand leurs modules seront repris.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
