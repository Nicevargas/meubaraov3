import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "./types";

export type SupabaseClientKind = "public" | "service";

const viteEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined;

function getRuntimeEnv() {
  if (typeof process !== "undefined" && process?.env) {
    return process.env;
  }
  return undefined;
}

function readEnv(name: string): string | undefined {
  const viteValue = viteEnv?.[name];
  if (typeof viteValue === "string" && viteValue.length > 0) {
    return viteValue;
  }

  const runtimeEnv = getRuntimeEnv();
  const runtimeValue = runtimeEnv?.[name];
  if (typeof runtimeValue === "string" && runtimeValue.length > 0) {
    return runtimeValue;
  }

  return undefined;
}

function getCredentials(kind: SupabaseClientKind) {
  const url =
    kind === "service"
      ? readEnv("SUPABASE_URL")
      : (readEnv("VITE_SUPABASE_URL") ?? readEnv("SUPABASE_URL"));

  const key =
    kind === "service"
      ? readEnv("SUPABASE_SERVICE_ROLE_KEY")
      : (readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ?? readEnv("SUPABASE_PUBLISHABLE_KEY"));

  const missing = [
    ...(!url ? [kind === "service" ? "SUPABASE_URL" : "VITE_SUPABASE_URL"] : []),
    ...(!key
      ? [kind === "service" ? "SUPABASE_SERVICE_ROLE_KEY" : "VITE_SUPABASE_PUBLISHABLE_KEY"]
      : []),
  ];

  if (missing.length > 0) {
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. Please configure them in your environment variables.`,
    );
  }

  return { url: url!, key: key! };
}

export function createSupabaseConnection(
  kind: SupabaseClientKind,
  options?: SupabaseClientOptions,
) {
  const { url, key } = getCredentials(kind);
  return createClient<Database>(url, key, options);
}

export function getSupabaseCredentials(kind: SupabaseClientKind) {
  return getCredentials(kind);
}
