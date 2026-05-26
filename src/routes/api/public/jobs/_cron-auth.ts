// Auth compartilhada para endpoints /api/public/jobs/*.
// Aceita: x-cron-token === CRON_SECRET (preferido) OU apikey === SUPABASE_PUBLISHABLE_KEY (fallback).
// Sem nenhum dos dois → 401.
export function checkCronAuth(request: Request): Response | null {
  const cronToken = request.headers.get("x-cron-token");
  const apikey = request.headers.get("apikey");
  const expectedCron = process.env.CRON_SECRET;
  const expectedAnon = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (expectedCron && cronToken && cronToken === expectedCron) return null;
  if (expectedAnon && apikey && apikey === expectedAnon) return null;

  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
