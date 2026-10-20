(function(root){
  "use strict";
  async function allowed(client, enabled) {
    if (enabled !== true) return true;
    const result = await client.rpc("account_features_allowed");
    if (result.error || typeof result.data !== "boolean") throw new Error("Account eligibility is temporarily unavailable.");
    return result.data;
  }
  function completionUrl(locale){return `https://akipasa.com/${locale === "es" ? "es" : "en"}/onboarding`;}
  const api={allowed,completionUrl};
  root.AkiAccountEligibility=api;
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
