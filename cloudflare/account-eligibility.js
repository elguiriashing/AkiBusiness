/** Shared caller-only eligibility contract; AkiPasa owns the disabled cohort. */
export async function requireGatewayAccountEligibility(request, env, fetcher = fetch) {
  if (String(env.AKISUITE_ONBOARDING_SCHEMA_READY) !== "true") return null;
  const path = new URL(request.url).pathname;
  // Privacy/support, signed provider intake and health retain their own controls.
  if (path === "/api/health" || /^\/api\/(privacy|support|webhooks)\//.test(path)) return null;
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null; // Endpoint-specific authorization still rejects missing identity.
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = String(env.SUPABASE_PUBLISHABLE_KEY || "");
  const reply = (status, error) => Response.json({ ok:false,error }, {status,headers:{"cache-control":"private, no-store"}});
  if (!base.startsWith("https://") || !key) return reply(503,"account_eligibility_unavailable");
  try {
    // Use the caller token, never a service key or an arbitrary profile parameter.
    const result = await fetcher(`${base}/rest/v1/rpc/account_features_allowed`, {
      method:"POST", headers:{apikey:key,authorization:`Bearer ${token}`,"content-type":"application/json"},
      body:"{}", signal:AbortSignal.timeout(10000)
    });
    if (result.status === 401) return reply(401,"unauthorized");
    if (!result.ok) return reply(503,"account_eligibility_unavailable");
    const allowed = await result.json();
    if (allowed === true) return null;
    return allowed === false ? reply(403,"account_completion_required") : reply(503,"account_eligibility_unavailable");
  } catch { return reply(503,"account_eligibility_unavailable"); }
}
