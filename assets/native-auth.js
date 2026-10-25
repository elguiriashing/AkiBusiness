(() => {
  "use strict";
  const current = new URL(location.href);
  const android = /\bAkiBusinessAndroid\//.test(navigator.userAgent);
  const callbackUrl = () => {
    const callback = new URL("/login", location.origin);
    if (android) {
      callback.searchParams.set("android", "1");
      callback.searchParams.set("locale", document.documentElement.lang === "es" || current.searchParams.get("locale") === "es" ? "es" : "en");
    }
    return callback.toString();
  };
  const handoff = current.pathname === "/login" && current.searchParams.get("android") === "1"
    && current.searchParams.get("native") !== "1" && !current.hash;
  const callbackOptions = current.pathname === "/login" && current.searchParams.get("android") === "1" && current.searchParams.get("native") === "1"
    && current.searchParams.has("code") && !current.hash ? { auth: { flowType: "pkce" } } : undefined;
  let nativeClient;
  let recoveryClient;
  const emailClient = client => {
    if (!callbackOptions) return client;
    if (!recoveryClient) {
      const config = window.AKIHQ_CONFIG;
      recoveryClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { flowType: "implicit", detectSessionInUrl: false, autoRefreshToken: false }
      });
    }
    return recoveryClient;
  };
  const oauthClient = client => {
    if (!android) return client;
    if (!nativeClient) {
      const config = window.AKIHQ_CONFIG;
      nativeClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { flowType: "pkce", detectSessionInUrl: false, autoRefreshToken: false }
      });
    }
    return nativeClient;
  };
  window.AkiBusinessNativeAuth = { callbackUrl, handoff, oauthClient, callbackOptions, emailClient };
  if (!handoff) return;
  // The verifier remains in the initiating WebView. Chrome must not consume
  // this one-time PKCE code or initialize a second Supabase auth client.
  const target = new URL("akibusiness://auth/callback");
  target.searchParams.set("locale", current.searchParams.get("locale") === "es" ? "es" : "en");
  for (const key of ["code", "error", "error_code", "error_description"]) {
    const value = current.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  const es = current.searchParams.get("locale") === "es";
  const title = document.createElement("h1");
  title.textContent = "AkiBusiness";
  const message = document.createElement("p");
  message.textContent = es ? "Vuelve a AkiBusiness para terminar de iniciar sesión." : "Return to AkiBusiness to finish signing in.";
  const link = document.createElement("a");
  link.href = target.toString();
  link.textContent = es ? "Volver a AkiBusiness" : "Return to AkiBusiness";
  document.getElementById("app").replaceChildren(title, message, link);
  window.setTimeout(() => location.assign(target.toString()), 2000);
})();
