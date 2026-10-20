/* AkiSuite navigation contract v1. Keep aligned with suite-navigation.ts. */
(function (root) {
  "use strict";
  const origins = { pasa: "https://akipasa.com", duermo: "https://akiduermo.com", coches: "https://akicoches.com", hq: "https://akihq.app", business: "https://akibusiness.com" };
  const validLocale = value => value === "en" || value === "es";
  let chosen;
  try {
    const params = new URLSearchParams(root.location?.search || "");
    chosen = params.get("locale") || params.get("lang");
    if (!validLocale(chosen)) chosen = root.localStorage?.getItem("akisuite.language");
  } catch {}
  function locale(fallback = "en") { return validLocale(chosen) ? chosen : validLocale(fallback) ? fallback : "en"; }
  function remember(value) {
    if (!validLocale(value)) return;
    chosen = value;
    try { root.localStorage?.setItem("akisuite.language", value); } catch {}
    try {
      if (root.location?.href && root.history?.replaceState) {
        const current = new URL(root.location.href);
        if (current.searchParams.has("locale") || current.searchParams.has("lang")) {
          current.searchParams.delete("lang");
          current.searchParams.set("locale", value);
          root.history.replaceState(root.history.state, "", current.toString());
        }
      }
    } catch {}
  }
  function referralCode() {
    const codes = new URLSearchParams(root.location?.search || "").getAll("ref");
    return codes.length === 1 && /^[A-Z0-9]{8,24}$/.test(codes[0]) ? codes[0] : undefined;
  }
  function href(product, language, options = {}) {
    if (!Object.hasOwn(origins, product)) throw new Error("Unknown AkiSuite product.");
    language = language === "es" ? "es" : "en";
    const path = options.path || (product === "hq" ? "/business" : "/");
    if (!path.startsWith("/") || path.startsWith("//") || /[\\?#%\s]/.test(path)) throw new Error("AkiSuite destination must be a plain local path.");
    if (path.split("/").some(part => part === "." || part === "..")) throw new Error("AkiSuite destination cannot traverse paths.");
    const url = new URL(origins[product]);
    if (product === "pasa" || product === "hq") {
      const unprefixed = path.replace(/^\/(en|es)(?=\/|$)/, "");
      url.pathname = `/${language}${unprefixed === "/" ? "" : unprefixed}`;
    } else { url.pathname = path; url.searchParams.set(product === "business" ? "locale" : "lang", language); }
    let referralCode = options.referralCode;
    if (!referralCode) {
      const codes = new URLSearchParams(root.location?.search || "").getAll("ref");
      if (codes.length === 1) referralCode = codes[0];
    }
    if (referralCode && /^[A-Z0-9]{8,24}$/.test(referralCode)) url.searchParams.set("ref", referralCode);
    return url.toString();
  }
  root.AkiSuiteNavigation = Object.freeze({ href, locale, remember, referralCode });
})(globalThis);
