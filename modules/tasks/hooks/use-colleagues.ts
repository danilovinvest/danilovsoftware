"use client";

import { useEffect, useState } from "react";
import * as api from "../lib/api";
import type { Colleague } from "../lib/types";

/**
 * Annuaire des collègues assignables. Il passe par /v1/directory/users, ouvert
 * à tout compte connecté : la liste des comptes, elle, exige users:read qu'un
 * chargé d'affaires n'a pas.
 */
export function useColleagues() {
  const [colleagues, setColleagues] = useState<Colleague[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listColleagues(controller.signal)
      .then((data) => setColleagues(data.items))
      .catch(() => setColleagues([]));
    return () => controller.abort();
  }, []);

  return colleagues;
}
