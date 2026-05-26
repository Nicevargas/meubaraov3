// Server-only Mercado Pago HTTP helpers.
// Routes all calls through the official MP REST API using fetch.
// Never import this file from client code.

export type MpEnv = "sandbox" | "prod";

const MP_API_BASE = "https://api.mercadopago.com";

function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not configured`);
  return v;
}

export function getAccessToken(env: MpEnv): string {
  return env === "prod"
    ? getEnv("MERCADO_PAGO_ACCESS_TOKEN_PROD")
    : getEnv("MERCADO_PAGO_ACCESS_TOKEN_SANDBOX");
}

export function getPublicKey(env: MpEnv): string {
  return env === "prod"
    ? getEnv("MERCADO_PAGO_PUBLIC_KEY_PROD")
    : getEnv("MERCADO_PAGO_PUBLIC_KEY_SANDBOX");
}

export function getWebhookSecret(): string {
  return getEnv("MERCADO_PAGO_WEBHOOK_SECRET");
}

/**
 * Derive the MP environment from the current public key. Sandbox keys start
 * with "TEST-"; production keys start with "APP_USR-".
 * We default to sandbox until a prod key is explicitly used.
 */
export function resolveEnv(): MpEnv {
  const prodToken = process.env.MERCADO_PAGO_ACCESS_TOKEN_PROD;
  if (prodToken && prodToken.startsWith("APP_USR-") && process.env.NODE_ENV === "production") {
    return "prod";
  }
  return "sandbox";
}

type MpFetchInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
};

export async function mpFetch<T = unknown>(
  env: MpEnv,
  path: string,
  init: MpFetchInit = {},
): Promise<T> {
  const token = getAccessToken(env);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  const res = await fetch(`${MP_API_BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    console.error("[MercadoPago] API error", {
      path,
      status: res.status,
      response: json,
    });
    const message =
      (json as { message?: string })?.message ?? `Mercado Pago request failed (${res.status})`;
    throw new Error(message);
  }

  return json as T;
}
