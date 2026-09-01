export type ApiErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal_error"
  | "network_error";

/** Erreur normalisée renvoyée par l'API Go (enveloppe `{ error: {...} }`). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  /** Erreurs par champ, renseignées quand code vaut "validation_failed". */
  readonly fields: Record<string, string>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get isValidation() {
    return this.code === "validation_failed";
  }

  get isForbidden() {
    return this.code === "forbidden";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Une erreur inattendue est survenue.";
}
