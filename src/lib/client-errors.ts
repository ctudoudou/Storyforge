type ErrorPayload = {
  error?: string | {
    code?: string;
    message?: string;
  };
};

export async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
  if (typeof payload?.error === "string") return payload.error;
  if (payload?.error?.message) return payload.error.message;
  return fallback;
}

