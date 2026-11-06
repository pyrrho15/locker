type FieldError = { field: string; message: string };

type SuccessEnvelope<T> = { success: true; data: T };
type ErrorEnvelope = {
  success: false;
  error: string;
  details?: FieldError[];
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Small client-side wrapper around the JSON API. Every mutation/query goes
 * through the real route handlers so the UI tests the same surface as Postman.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const { method = "GET", body } = options;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response; handled below.
  }

  const envelope = payload as SuccessEnvelope<T> | ErrorEnvelope | null;

  if (!response.ok || !envelope || envelope.success !== true) {
    const message =
      envelope && envelope.success === false
        ? envelope.error
        : `Request failed (${response.status})`;
    const details =
      envelope && envelope.success === false ? envelope.details : undefined;
    const detailText =
      details && details.length > 0
        ? `: ${details.map((detail) => detail.message).join(", ")}`
        : "";
    return { ok: false, error: `${message}${detailText}` };
  }

  return { ok: true, data: envelope.data };
}
