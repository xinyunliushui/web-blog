export const isFormValidationError = (err: unknown): boolean =>
  Boolean(
    err &&
      typeof err === "object" &&
      "errorFields" in (err as Record<string, unknown>)
  );

export const getRequestErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: {
      data?: {
        message?: unknown;
        msg?: unknown;
      };
    };
    message?: unknown;
  };

  const backendMessage = e?.response?.data?.message ?? e?.response?.data?.msg;
  if (typeof backendMessage === "string" && backendMessage.trim()) {
    return backendMessage.trim();
  }
  if (typeof e?.message === "string" && e.message.trim()) {
    return e.message.trim();
  }
  return fallback;
};
