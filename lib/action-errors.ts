export type ActionErrorLike = string | string[] | Record<string, unknown> | undefined | null;

export function getActionErrorMessage(
  error: ActionErrorLike,
  fallback = "Nao foi possivel concluir a operacao.",
) {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (Array.isArray(error)) {
    return String(error.find(Boolean) || fallback);
  }

  if (typeof error === "object") {
    for (const value of Object.values(error)) {
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0]);
      }

      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }

  return fallback;
}
