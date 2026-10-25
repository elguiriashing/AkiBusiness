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
  const copy = es ? {
    title: "Inicio de sesión seguro",
    description: "Has terminado con tu proveedor. Vamos a abrir la aplicación para completar el inicio de sesión.",
    count: "Volviendo en", unit: "segundos", button: "Abrir AkiBusiness ahora",
    help: "¿No se abre? Pulsa el botón de arriba y comprueba que tienes la aplicación instalada.",
    footer: "Regresando de forma segura a tu aplicación AkiSuite"
  } : {
    title: "Secure sign-in",
    description: "You’re signed in with your provider. Let’s finish opening your app.",
    count: "Returning in", unit: "seconds", button: "Open AkiBusiness now",
    help: "App not opening? Tap the button above. Make sure the app is installed on this device.",
    footer: "Securely returning to your AkiSuite app"
  };
  document.body.classList.add("native-oauth-handoff");
  document.title = "AkiBusiness · " + copy.title;
  const shell = document.createElement("main");
  shell.className = "native-return-shell";
  shell.innerHTML = `<div class="native-return-label">AkiSuite · <span class="native-return-label-text"></span></div>
    <section class="native-return-card" aria-labelledby="return-title">
      <div class="native-return-icon"><img alt="" width="80" height="80" src="/assets/brand/v3/business.svg"></div>
      <h1 id="return-title">AkiBusiness</h1><p class="native-return-desc"></p>
      <p class="native-return-count" role="status" aria-live="off"><span></span> <strong id="return-seconds">5</strong> <span></span></p>
      <div class="native-return-track" aria-hidden="true"><span></span></div>
      <a class="native-return-button" id="native-return" href="#"><span></span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a>
      <p class="native-return-help"></p>
    </section><p class="native-return-foot"></p>`;
  shell.querySelector(".native-return-label-text").textContent = copy.title;
  shell.querySelector(".native-return-desc").textContent = copy.description;
  shell.querySelector(".native-return-count span:first-child").textContent = copy.count;
  shell.querySelector(".native-return-count span:last-child").textContent = copy.unit;
  shell.querySelector(".native-return-button span").textContent = copy.button;
  shell.querySelector(".native-return-help").textContent = copy.help;
  shell.querySelector(".native-return-foot").textContent = copy.footer;
  const link = shell.querySelector("#native-return");
  link.href = target.toString();
  document.getElementById("app").replaceChildren(shell);
  let remaining = 5;
  const counter = shell.querySelector("#return-seconds");
  const ticker = window.setInterval(() => {
    remaining = Math.max(0, remaining - 1);
    counter.textContent = String(remaining);
    if (!remaining) window.clearInterval(ticker);
  }, 1000);
  window.setTimeout(() => location.assign(link.href), 5000);
})();
