(function(root){
  "use strict";
  async function allowed(client, enabled) {
    if (enabled !== true) return true;
    const result = await client.rpc("account_features_allowed");
    if (result.error || typeof result.data !== "boolean") throw new Error("Account eligibility is temporarily unavailable.");
    return result.data;
  }
  function completionUrl(locale, requested){
    const language = locale === "es" ? "es" : "en";
    const base = `https://akipasa.com/${language}/onboarding`;
    const search = requested === undefined ? root.location?.search : requested;
    if (typeof search !== "string") return base;
    // Static operations has one fixed root and a bounded workspace identifier.
    // Never forward an auth code, token, external destination or fragment.
    const incoming = new URLSearchParams(search.startsWith("/?") ? search.slice(2) : search.replace(/^\?/, ""));
    const workspace = incoming.getAll("workspace").length === 1 ? incoming.get("workspace") : null;
    const task = new URLSearchParams();
    if (workspace && /^[A-Za-z0-9_-]{1,128}$/.test(workspace)) task.set("workspace", workspace);
    const ref = incoming.getAll("ref").length === 1 ? root.AkiSuiteNavigation?.referralCode(incoming.get("ref")) : undefined;
    if (ref) task.set("ref", ref);
    const path = task.size ? `/?${task}` : "/";
    const next = `/${language}/account-resume?${new URLSearchParams({product:"business",path})}`;
    return `${base}?${new URLSearchParams({next})}`;
  }
  const api={allowed,completionUrl};
  root.AkiAccountEligibility=api;
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
