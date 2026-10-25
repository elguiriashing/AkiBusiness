/* Native AkiBusiness account v2. Shared identity/RLS; no browser billing authority. */
(() => {
  "use strict";
  const params = new URLSearchParams(location.search),
    config = window.AKIHQ_CONFIG || {};
  const single = (key) =>
    params.getAll(key).length === 1 ? params.get(key) : null;
  const validWorkspace = (value) =>
    typeof value === "string" && /^[a-z0-9][a-z0-9_-]{2,79}$/.test(value);
  const tiers = {
    basico: { name: "Basic", cents: 1999 },
    standard: { name: "Standard", cents: 4899 },
    pro: { name: "Pro", cents: 9799 },
  };
  const requestedTier = single("tier"),
    tier = Object.hasOwn(tiers, requestedTier) ? requestedTier : null;
  let locale = window.AkiSuiteNavigation.locale(),
    user = null,
    profile = null,
    workspaces = [],
    selected = null,
    access = null,
    busy = false;
  let activeSection = "workspace";
  const root = document.getElementById("account"),
    t = (en, es) => (locale === "es" ? es : en);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const local = (path, extra = {}) => {
    const url = new URL(path, location.origin);
    url.searchParams.set("locale", locale);
    if (tier) url.searchParams.set("tier", tier);
    if (validWorkspace(selected)) url.searchParams.set("workspace", selected);
    for (const [key, value] of Object.entries(extra))
      url.searchParams.set(key, value);
    return url.pathname + url.search;
  };
  const icons = {
    workspace:
      '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 5V3h8v2M3 11h18M10 11v3h4v-3"/>',
    membership:
      '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>',
    profile:
      '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    security:
      '<path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m8 12 3 3 5-6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    photo:
      '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1"/><path d="m3 16 5-5 4 4 3-3 6 6"/>',
  };
  const icon = (name) =>
    `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.workspace}</svg>`;
  let theme = "dark";
  try {
    theme =
      localStorage.getItem("akipasa.theme") ||
      (window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark");
  } catch {}
  if (theme !== "light") theme = "dark";
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    const button = document.getElementById("theme");
    button.textContent =
      theme === "dark" ? t("Light", "Claro") : t("Dark", "Oscuro");
    button.setAttribute(
      "aria-label",
      theme === "dark"
        ? t("Use light theme", "Usar tema claro")
        : t("Use dark theme", "Usar tema oscuro"),
    );
    document.querySelector('meta[name="theme-color"]').content =
      theme === "dark" ? "#071124" : "#faf7f2";
  }
  function showSection(key, focus = false) {
    if (!["workspace", "membership", "profile", "security"].includes(key))
      return;
    activeSection = key;
    root.querySelectorAll("[data-section]").forEach((panel) => {
      panel.hidden = panel.dataset.section !== key;
    });
    root.querySelectorAll("[data-account-nav]").forEach((button) => {
      const current = button.dataset.accountNav === key;
      button.setAttribute("aria-selected", String(current));
      button.tabIndex = current ? 0 : -1;
    });
    if (focus) root.querySelector(`[data-account-nav="${key}"]`)?.focus();
  }
  function wireSections() {
    const buttons = [...root.querySelectorAll("[data-account-nav]")];
    buttons.forEach((button, index) => {
      button.onclick = () => showSection(button.dataset.accountNav);
      button.onkeydown = (event) => {
        const delta = ["ArrowRight", "ArrowDown"].includes(event.key)
          ? 1
          : ["ArrowLeft", "ArrowUp"].includes(event.key)
            ? -1
            : 0;
        if (!delta && !["Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const target =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index + delta + buttons.length) % buttons.length;
        showSection(buttons[target].dataset.accountNav, true);
      };
    });
    showSection(activeSection);
  }
  const client =
    config.SUPABASE_URL && config.SUPABASE_ANON_KEY
      ? window.supabase?.createClient(
          config.SUPABASE_URL,
          config.SUPABASE_ANON_KEY,
          window.AkiBusinessNativeAuth?.callbackOptions,
        )
      : null;
  const message = (value, error = false) => {
    let node = document.getElementById("message");
    if (!node) {
      node = document.createElement("p");
      node.id = "message";
      root.prepend(node);
    }
    node.className = error ? "notice error" : "notice";
    node.setAttribute("role", error ? "alert" : "status");
    node.textContent = value;
    node.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  };
  function controls() {
    applyTheme();
    root.removeAttribute("aria-busy");
    document.querySelector(".skip-link").textContent = t(
      "Skip to account",
      "Ir a la cuenta",
    );
    document.getElementById("footer-copy").textContent = t(
      "Your business. Your toolbox.",
      "Tu negocio. Tus herramientas.",
    );
    document
      .querySelector(".header-actions")
      .setAttribute("aria-label", t("Page controls", "Controles de página"));
    window.AkiSuiteNavigation.remember(locale);
    document.documentElement.lang = locale;
    document.getElementById("language").textContent =
      locale === "es" ? "EN" : "ES";
    document.getElementById("plans").textContent = t("Plans", "Planes");
    document.getElementById("plans").href = local("/membership");
    document.getElementById("dashboard").textContent = t("Dashboard", "Panel");
    document.getElementById("dashboard").href = local("/login");
  }
  function authScreen() {
    controls();
    root.innerHTML = `<h1>${t("Your business starts here", "Tu negocio empieza aquí")}</h1><p>${t("Use your existing AkiSuite account, or create one here. No public venue or listing is required.", "Usa tu cuenta AkiSuite o crea una aquí. No necesitas un local ni una ficha pública.")}</p><p id="message" role="status"></p><section class="panel"><h2>${t("Sign in", "Iniciar sesión")}</h2><form id="signin"><label>Email<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label>${t("Password", "Contraseña")}<input name="password" type="password" required autocomplete="current-password"></label><button type="submit">${t("Continue in AkiBusiness", "Continuar en AkiBusiness")}</button></form><button id="google" type="button">${t("Continue with Google", "Continuar con Google")}</button><button id="forgot" type="button">${t("Forgot password?", "¿Olvidaste tu contraseña?")}</button><form id="recover" hidden><label>Email<input name="email" type="email" required maxlength="254" autocomplete="email"></label><button type="submit">${t("Send recovery link", "Enviar enlace de recuperación")}</button></form></section><details class="panel"><summary>${t("New here? Create your AkiSuite account", "¿Primera vez? Crea tu cuenta AkiSuite")}</summary><form id="signup"><label>${t("Your name", "Tu nombre")}<input name="name" required minlength="2" maxlength="100" autocomplete="name"></label><label>Email<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label>${t("Password: 12+ characters, upper/lowercase and number", "Contraseña: 12+ caracteres, mayúscula, minúscula y número")}<input name="password" type="password" required minlength="12" maxlength="128" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,128}" autocomplete="new-password"></label><label class="check"><input type="checkbox" name="terms" required><span>${t("I accept the shared AkiSuite terms and have read the privacy notice.", "Acepto las condiciones compartidas de AkiSuite y he leído la política de privacidad.")} <a href="https://akipasa.com/${locale}/terms" target="_blank" rel="noopener">${t("Terms", "Condiciones")}</a> · <a href="https://akipasa.com/${locale}/privacy" target="_blank" rel="noopener">${t("Privacy", "Privacidad")}</a></span></label><button type="submit">${t("Create account here", "Crear cuenta aquí")}</button></form></details>`;
    root.className = "auth-layout";
    const authIntro = document.createElement("div");
    authIntro.className = "auth-intro";
    authIntro.append(root.querySelector("h1"), root.querySelector("p"));
    authIntro.insertAdjacentHTML(
      "afterbegin",
      `<p class="eyebrow">${t("YOUR BUSINESS. YOUR TOOLBOX.", "TU NEGOCIO. TUS HERRAMIENTAS.")}</p>`,
    );
    const authForms = document.createElement("div");
    authForms.className = "auth-forms";
    [...root.querySelectorAll(".panel")].forEach((panel) =>
      authForms.append(panel),
    );
    root.append(authIntro, authForms);
    document.getElementById("signin").onsubmit = (event) =>
      run(event, async (form) => {
        const { error } = await client.auth.signInWithPassword({
          email: form.get("email").trim(),
          password: form.get("password"),
        });
        if (error)
          throw new Error(
            t(
              "Check your email and password, then try again.",
              "Revisa el correo y la contraseña e inténtalo de nuevo.",
            ),
          );
        await load();
      });
    document.getElementById("signup").onsubmit = (event) =>
      run(event, async (form) => {
        if (!form.get("terms"))
          throw new Error(
            t(
              "Accept the terms to continue.",
              "Acepta las condiciones para continuar.",
            ),
          );
        const password = form.get("password");
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,128}$/.test(password))
          throw new Error(
            t(
              "Check the password requirements.",
              "Revisa los requisitos de contraseña.",
            ),
          );
        const { data, error } = await client.auth.signUp({
          email: form.get("email").trim(),
          password,
          options: {
            data: { display_name: form.get("name").trim() },
            emailRedirectTo: location.origin + "/login",
          },
        });
        if (error)
          throw new Error(
            t(
              "Could not create the account. Try signing in or recovering your password.",
              "No se pudo crear la cuenta. Prueba a iniciar sesión o recuperar la contraseña.",
            ),
          );
        if (data?.session) await load();
        else
          message(
            t(
              "Check your email to confirm your account, then return here to sign in.",
              "Confirma tu cuenta desde el correo y vuelve aquí para iniciar sesión.",
            ),
          );
      });
    document.getElementById("forgot").onclick = () => {
      document.getElementById("recover").hidden = false;
      document.getElementById("recover").querySelector("input").focus();
    };
    document.getElementById("recover").onsubmit = (event) =>
      run(event, async (form) => {
        const result = await client.auth.resetPasswordForEmail(
          form.get("email").trim(),
          { redirectTo: location.origin + "/login" },
        );
        if (result.error)
          throw new Error(
            t(
              "Could not send recovery email. Retry.",
              "No se pudo enviar el enlace. Reintenta.",
            ),
          );
        message(
          t(
            "If an account exists, check your email for the recovery link.",
            "Si existe una cuenta, revisa tu correo para recuperarla.",
          ),
        );
      });
    document.getElementById("google").onclick = async () => {
      if (busy) return;
      busy = true;
      try {
        sessionStorage.setItem(
          "akibusiness:account-return",
          JSON.stringify({
            locale,
            tier,
            workspace: validWorkspace(single("workspace"))
              ? single("workspace")
              : null,
          }),
        );
        const oauthClient = window.AkiBusinessNativeAuth?.oauthClient(client) || client;
        const { error } = await oauthClient.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.AkiBusinessNativeAuth?.callbackUrl() || location.origin + "/login" },
        });
        if (error) throw error;
      } catch {
        message(
          t(
            "Google sign-in is unavailable. Try email sign-in.",
            "Google no está disponible. Prueba con tu correo.",
          ),
          true,
        );
        busy = false;
      }
    };
  }
  async function run(event, action) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const form = event.currentTarget,
      buttons = [...form.querySelectorAll("button")];
    buttons.forEach((b) => (b.disabled = true));
    try {
      await action(new FormData(form));
    } catch (error) {
      message(
        error.message ||
          t(
            "Unable to complete the request. Please retry.",
            "No se pudo completar. Reintenta.",
          ),
        true,
      );
    } finally {
      busy = false;
      buttons.forEach((b) => (b.disabled = false));
    }
  }
  async function load() {
    controls();
    if (!client) throw new Error("Account service unavailable.");
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data?.user) {
      authScreen();
      return;
    }
    user = identity.data.user;
    if (
      !(await window.AkiAccountEligibility.allowed(
        client,
        config.ONBOARDING_SCHEMA_READY === true,
      ))
    ) {
      root.innerHTML = `<h1>${t("Complete your shared account", "Completa tu cuenta compartida")}</h1><p>${t("Your account needs the shared eligibility review before business tools can be used.", "Tu cuenta necesita completar la revisión antes de usar herramientas empresariales.")}</p><a href="${esc(window.AkiAccountEligibility.completionUrl(locale))}">${t("Review account eligibility", "Revisar acceso a la cuenta")}</a>`;
      return;
    }
    const result = await client
      .from("profiles")
      .select(
        "display_name,username,bio,phone,locality,province,preferred_locale,profile_visibility,contact_visibility,terms_version",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (result.error || !result.data)
      throw new Error(
        t(
          "Your profile could not be loaded. Reload to retry.",
          "No se pudo cargar tu perfil. Recarga para reintentar.",
        ),
      );
    profile = result.data;
    if (profile.terms_version !== "2026-07-23") {
      root.innerHTML = `<h1>${t("Shared account terms", "Condiciones de la cuenta compartida")}</h1><p><a href="https://akipasa.com/${locale}/terms" target="_blank" rel="noopener">${t("Read terms", "Leer condiciones")}</a></p><form id="terms"><label class="check"><input name="accept" type="checkbox" required><span>${t("I accept the current AkiSuite terms.", "Acepto las condiciones actuales de AkiSuite.")}</span></label><button type="submit">${t("Continue here", "Continuar aquí")}</button></form>`;
      document.getElementById("terms").onsubmit = (event) =>
        run(event, async (form) => {
          if (!form.get("accept")) return;
          const r = await client.rpc("accept_current_terms", {
            p_version: "2026-07-23",
            p_locale: locale,
          });
          if (r.error)
            throw new Error(
              t(
                "Could not save acceptance. Please retry.",
                "No se pudo guardar. Reintenta.",
              ),
            );
          await load();
        });
      return;
    }
    const locations = await client.rpc("list_managed_operating_locations", {
      p_limit: 50,
      p_offset: 0,
    });
    if (locations.error)
      throw new Error(
        t(
          "Your locations could not be loaded. Reload to retry; your sign-in is still valid.",
          "No se pudieron cargar tus ubicaciones. Recarga; tu sesión sigue activa.",
        ),
      );
    workspaces = Array.isArray(locations.data) ? locations.data : [];
    const requested = single("workspace");
    selected = params.has("workspace")
      ? requested && validWorkspace(requested)
        ? workspaces.find((w) => w.id === requested)?.id || null
        : null
      : workspaces.length === 1
        ? workspaces[0].id
        : null;
    access = null;
    if (selected) {
      const r = await client.rpc("crm_workspace_access", {
        p_workspace: selected,
      });
      if (!r.error) access = r.data;
    }
    render();
    void loadBilling();
    if (requested && !selected)
      message(
        t(
          "The requested location is not available to this account. Choose one you manage.",
          "La ubicación solicitada no está disponible para esta cuenta. Elige una que gestiones.",
        ),
        true,
      );
  }
  function render() {
    controls();
    const plan = tier ? tiers[tier] : null;
    const input = (name, label, key, max) =>
      `<label>${label}<input name="${name}" value="${esc(profile[key])}" maxlength="${max}" ${name === "displayName" ? 'required minlength="2"' : name === "username" ? 'pattern="[a-zA-Z0-9_]{3,30}"' : ""}></label>`;
    const sections = [
      ["workspace", t("Workspace", "Espacio")],
      ["membership", t("Membership", "Membresía")],
      ["profile", t("Profile", "Perfil")],
      ["security", t("Security", "Seguridad")],
    ];
    const initials = (profile.display_name || user.email || "AB")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    root.className = "";
    root.innerHTML = `
      <div class="account-heading"><div><p class="eyebrow">${t("MADE FOR YOUR WORKING DAY", "PARA TU DÍA A DÍA")}</p><h1>${t("Your AkiBusiness account", "Tu cuenta AkiBusiness")}</h1><p>${t("Your workspace, your details. All in one place.", "Tu espacio, tus datos. Todo en un lugar.")}</p></div><span class="suite-badge">${icon("check")} ${t("One AkiSuite account", "Una cuenta AkiSuite")}</span></div>
      <p id="message" role="status"></p>
      <div class="account-layout">
        <aside class="account-sidebar">
          <div class="member-summary"><span class="member-avatar" aria-hidden="true">${esc(initials)}</span><div><strong>${esc(profile.display_name || t("Your account", "Tu cuenta"))}</strong><span>${esc(user.email)}</span></div></div>
          <nav class="account-nav" role="tablist" aria-label="${t("Account sections", "Secciones de la cuenta")}">${sections.map(([key, label]) => `<button type="button" role="tab" id="tab-${key}" aria-controls="view-${key}" aria-selected="false" data-account-nav="${key}">${icon(key)}<span>${label}</span><span class="nav-arrow" aria-hidden="true">›</span></button>`).join("")}</nav>
          <div class="shared-note">${icon("security")}<p>${t("One profile, across AkiSuite.", "Un perfil para AkiSuite.")}<span>${t("Updates follow you across all five products.", "Tus cambios se comparten en los cinco productos.")}</span></p></div>
        </aside>
        <div class="account-content">
          <section id="view-workspace" role="tabpanel" aria-labelledby="tab-workspace" data-section="workspace">
            <div class="section-heading"><div><p class="eyebrow">${t("LET’S GET TO WORK", "MANOS A LA OBRA")}</p><h2>${t("Your workspace", "Tu espacio de trabajo")}</h2><p>${t("Choose a location and pick up where you left off.", "Elige una ubicación y sigue donde lo dejaste.")}</p></div></div>
            <div class="workspace-grid"><section class="panel locations-panel"><div class="panel-heading"><span class="icon-tile">${icon("workspace")}</span><div><h3>${t("Your locations", "Tus ubicaciones")}</h3><p>${t("A space for each place you run.", "Un espacio para cada negocio.")}</p></div><span class="count-badge">${workspaces.length}</span></div>
              <form id="location-picker"><fieldset class="location-options"><legend class="sr-only">${t("Choose location", "Elige ubicación")}</legend>${workspaces.length ? workspaces.map((w) => `<label class="location-card"><input type="radio" name="workspace" value="${esc(w.id)}" ${w.id === selected ? "checked" : ""} required><span class="location-symbol">${icon("workspace")}</span><span class="location-copy"><strong>${esc(w.name)}</strong><span>${t("Operating location", "Ubicación operativa")}</span></span><span class="radio-mark" aria-hidden="true"></span></label>`).join("") : `<div class="empty-state">${icon("workspace")}<h3>${t("Make room for your business", "Dale espacio a tu negocio")}</h3><p>${t("Create your first location below to get started.", "Crea tu primera ubicación para empezar.")}</p></div>`}</fieldset>
              ${selected && access?.can_operate === true ? `<a id="open-dashboard" class="button primary" href="${esc(local("/login"))}">${t("Open my dashboard", "Abrir mi panel")}${icon("arrow")}</a>` : ""}
              <button id="open-location" class="primary" type="submit" ${!workspaces.length ? "disabled" : ""} ${selected && access?.can_operate === true ? "hidden" : ""}>${t("Open this location", "Abrir esta ubicación")}${icon("arrow")}</button>
              </form>
              ${selected && access?.can_operate !== true ? `<p class="fine-print">${t("Tools require an active plan and permission for this location.", "Las herramientas necesitan un plan activo y permisos para esta ubicación.")}</p>` : ""}
              ${selected ? `<a class="text-link" href="${esc(local("/toolbox"))}">${t("My toolbox and team permissions", "Mis herramientas y permisos")}${icon("arrow")}</a>` : ""}
            </section>
            <aside class="plan-preview panel"><span class="plan-orbit" aria-hidden="true">✦</span><p class="eyebrow">${plan ? t("YOUR SELECTED PLAN", "TU PLAN ELEGIDO") : t("YOUR NEXT CHAPTER", "TU SIGUIENTE PASO")}</p><h3>${plan ? `AkiBusiness ${plan.name}` : t("Build your toolbox", "Crea tu caja de herramientas")}</h3>${plan ? `<p class="plan-preview-price"><strong>${new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(plan.cents / 100)}</strong><span>/${t("month", "mes")}</span></p><p class="fine-print">${t("Per operating location", "Por ubicación operativa")}</p><span class="plan-capacity">${icon("check")} ${tier === "basico" ? "4" : tier === "standard" ? "8" : "12"}/12 ${t("tools", "herramientas")}</span>` : `<p>${t("Choose the tools that fit the way you work.", "Elige las herramientas que encajan con tu negocio.")}</p>`}<a class="button secondary" href="${esc(local("/membership"))}">${plan ? t("Compare plans", "Comparar planes") : t("Explore plans", "Explorar planes")}${icon("arrow")}</a><p class="fine-print">${t("New purchases are not available yet. Selecting a plan does not charge you or change your access.", "Las nuevas compras aún no están disponibles. Elegir un plan no genera cargos ni cambia tu acceso.")}</p></aside></div>
            <details class="panel create-panel" ${!workspaces.length ? "open" : ""}><summary><span class="icon-tile">${icon("plus")}</span><span><strong>${t("Create a private operating location", "Crear ubicación operativa privada")}</strong><small>${t("An office, a shop, a studio. No public listing needed.", "Oficina, tienda o estudio. Sin necesitar una ficha pública.")}</small></span><span class="expand-mark" aria-hidden="true">+</span></summary><form id="create-location"><label>${t("Location name", "Nombre de la ubicación")}<input name="name" required minlength="2" maxlength="120" autocomplete="organization" placeholder="${t("e.g. Fuengirola studio", "Ej. Estudio Fuengirola")}"></label><button type="submit">${t("Create my location", "Crear mi ubicación")}${icon("arrow")}</button></form></details>
          </section>
          <section id="view-membership" role="tabpanel" aria-labelledby="tab-membership" data-section="membership" hidden><div class="section-heading"><h2>${t("Your membership", "Tu membresía")}</h2><p>${t("Plans and billing, together in one place.", "Planes y pagos, en un solo lugar.")}</p></div><section id="billing" class="panel"><h3>${t("My memberships", "Mis membresías")}</h3><p role="status">${t("Loading membership details…", "Cargando las membresías…")}</p></section><a class="button secondary" href="${esc(local("/membership"))}">${t("Explore AkiBusiness plans", "Explorar planes AkiBusiness")}${icon("arrow")}</a></section>
          <section id="view-profile" role="tabpanel" aria-labelledby="tab-profile" data-section="profile" hidden><div class="section-heading"><h2>${t("Make it yours", "A tu manera")}</h2><p>${t("One profile. Updated across AkiSuite.", "Un perfil. Actualizado en AkiSuite.")}</p></div><section class="panel"><div class="panel-heading"><span class="icon-tile">${icon("profile")}</span><h3>${t("Personal details", "Datos personales")}</h3></div><form id="profile"><div class="grid">${input("displayName", t("Display name", "Nombre"), "display_name", 100)}${input("username", t("Username", "Nombre de usuario"), "username", 30)}${input("phone", t("Phone", "Teléfono"), "phone", 40)}${input("locality", t("Town / city", "Localidad"), "locality", 120)}${input("province", t("Province", "Provincia"), "province", 120)}<label>${t("Preferred language", "Idioma preferido")}<select name="preferredLocale"><option value="en" ${profile.preferred_locale === "en" ? "selected" : ""}>English</option><option value="es" ${profile.preferred_locale === "es" ? "selected" : ""}>Español</option></select></label>${[
            [
              "profileVisibility",
              "profile_visibility",
              t("Profile visibility", "Visibilidad del perfil"),
            ],
            [
              "contactVisibility",
              "contact_visibility",
              t("Contact visibility", "Visibilidad del contacto"),
            ],
          ]
            .map(
              ([name, key, label]) =>
                `<label>${label}<select name="${name}">${[
                  ["private", t("Private", "Privado")],
                  ["members", t("Members", "Miembros")],
                  ["public", t("Public", "Público")],
                ]
                  .map(
                    ([v, l]) =>
                      `<option value="${v}" ${profile[key] === v ? "selected" : ""}>${l}</option>`,
                  )
                  .join("")}</select></label>`,
            )
            .join(
              "",
            )}</div><label>Bio<textarea name="bio" maxlength="2000" rows="3">${esc(profile.bio)}</textarea></label><div class="form-footer"><span>${icon("check")}${t("Shared across all five products", "Compartido en los cinco productos")}</span><button type="submit">${t("Save shared profile", "Guardar perfil compartido")}</button></div></form></section><section class="panel"><div class="panel-heading"><span class="icon-tile">${icon("photo")}</span><h3>${t("Profile photos", "Fotos del perfil")}</h3></div><form id="photos"><div class="grid"><label>${t("Photo type", "Tipo de foto")}<select name="kind"><option value="avatar">${t("Profile photo", "Foto de perfil")}</option><option value="banner">${t("Cover photo", "Foto de portada")}</option></select></label><label class="upload-field">${t("JPG, PNG or WebP, up to 10 MB", "JPG, PNG o WebP, hasta 10 MB")}<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required></label></div><button type="submit">${t("Save shared photo", "Guardar foto compartida")}</button></form></section></section>
          <section id="view-security" role="tabpanel" aria-labelledby="tab-security" data-section="security" hidden><div class="section-heading"><h2>${t("Sign-in and security", "Acceso y seguridad")}</h2><p>${t("Keep your account in safe hands. Yours.", "Tu cuenta en buenas manos. Las tuyas.")}</p></div><section class="panel"><div class="panel-heading"><span class="icon-tile">${icon("security")}</span><div><h3>${t("Email address", "Correo electrónico")}</h3><p>${esc(user.email)}</p></div></div><form id="email"><label>${t("New sign-in email", "Nuevo correo de acceso")}<input name="email" type="email" required maxlength="254" autocomplete="email"></label><button type="submit">${t("Request email change", "Solicitar cambio de correo")}</button></form></section><section class="panel security-row"><div><h3>${t("Password", "Contraseña")}</h3><p>${t("Receive a secure link to reset your password.", "Recibe un enlace seguro para cambiar tu contraseña.")}</p></div><button id="reset" type="button">${t("Send password reset link", "Enviar recuperación")}</button></section><section class="panel security-row"><div><h3>${t("This device", "Este dispositivo")}</h3><p>${t("Sign out of AkiBusiness on this browser.", "Cierra tu sesión de AkiBusiness en este navegador.")}</p></div><button id="signout" class="danger-button" type="button">${t("Sign out here", "Cerrar sesión aquí")}</button></section></section>
          <section class="panel" id="privacy-and-deletion" aria-labelledby="privacy-heading">
            <h2 id="privacy-heading">${t("Privacy, export and account deletion", "Privacidad, exportación y eliminación de cuenta")}</h2>
            <p>${t("Your identity is shared across AkiSuite. Requesting account deletion affects all five products, not just AkiBusiness.", "Tu identidad se comparte en AkiSuite. La solicitud de eliminación afecta a los cinco productos, no solo a AkiBusiness.")}</p>
            <p>${t("A person handles verified requests within 48 hours and sends a manually written confirmation from support@akipasa.com after deletion. Sending a request does not mean deletion is complete.", "Una persona tramita las solicitudes verificadas en 48 horas y envía una confirmación escrita manualmente desde support@akipasa.com tras la eliminación. Enviar la solicitud no significa que la eliminación haya terminado.")}</p>
            <p><a id="account-privacy-request" href="https://akipasa.com/${locale}/account/privacy">${t("Export data or request deletion", "Exportar datos o solicitar eliminación")}</a> · <a id="account-deletion-instructions" href="https://akipasa.com/${locale}/account-deletion">${t("Deletion instructions without signing in", "Instrucciones de eliminación sin iniciar sesión")}</a> · <a id="account-privacy-policy" href="/privacy#${locale}">${t("Privacy and retention details", "Privacidad y plazos de conservación")}</a></p>
          </section>
        </div>
      </div>`;
    wireSections();
    root.querySelectorAll('[name="workspace"]').forEach((radio) =>
      radio.addEventListener("change", () => {
        const direct = document.getElementById("open-dashboard");
        if (direct) direct.hidden = radio.value !== selected;
        document.getElementById("open-location").hidden =
          !!direct && radio.value === selected;
      }),
    );
    document.getElementById("location-picker").onsubmit = (event) =>
      run(event, async (form) => {
        const value = form.get("workspace");
        if (!validWorkspace(value) || !workspaces.some((w) => w.id === value))
          return;
        const result = await client.rpc("crm_workspace_access", {
          p_workspace: value,
        });
        if (result.error)
          throw new Error(
            t(
              "Could not check this location's access. Please retry.",
              "No se pudo comprobar el acceso a esta ubicación. Reintenta.",
            ),
          );
        location.assign(
          local(result.data?.can_operate === true ? "/login" : "/account", {
            workspace: value,
          }),
        );
      });
    const createId = crypto.randomUUID();
    document.getElementById("create-location").onsubmit = (event) =>
      run(event, async (form) => {
        const name = form.get("name").trim();
        if (name.length < 2 || name.length > 120)
          throw new Error(
            t(
              "Use a location name between 2 and 120 characters.",
              "Usa un nombre de 2 a 120 caracteres.",
            ),
          );
        const r = await client.rpc("create_private_operating_location", {
          p_request_id: createId,
          p_name: name,
        });
        if (r.error || !validWorkspace(r.data))
          throw new Error(
            t(
              "Location creation is unavailable. Retry without changing the name; no public listing is needed.",
              "No se pudo crear la ubicación. Reintenta con el mismo nombre; no necesitas una ficha pública.",
            ),
          );
        location.assign(local("/account", { workspace: r.data }));
      });
    document.getElementById("profile").onsubmit = (event) =>
      run(event, async (form) => {
        const values = Object.fromEntries(form);
        const name = values.displayName.trim(),
          username = values.username.trim();
        if (
          name.length < 2 ||
          name.length > 100 ||
          (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) ||
          !["en", "es"].includes(values.preferredLocale) ||
          !["private", "members", "public"].includes(
            values.profileVisibility,
          ) ||
          !["private", "members", "public"].includes(values.contactVisibility)
        )
          throw new Error(
            t("Check your profile fields.", "Revisa los datos del perfil."),
          );
        const update = {
          display_name: name,
          username: username || null,
          bio: values.bio.trim() || null,
          phone: values.phone.trim() || null,
          locality: values.locality.trim() || null,
          province: values.province.trim() || null,
          preferred_locale: values.preferredLocale,
          profile_visibility: values.profileVisibility,
          contact_visibility: values.contactVisibility,
        };
        const r = await client
          .from("profiles")
          .update(update)
          .eq("id", user.id)
          .select("id")
          .maybeSingle();
        if (r.error || !r.data)
          throw new Error(
            t(
              "Profile could not be saved. Check the username and retry.",
              "No se pudo guardar. Revisa el nombre de usuario y reintenta.",
            ),
          );
        profile = { ...profile, ...update };
        root.querySelector(".member-summary strong").textContent = name;
        message(
          t(
            "Profile saved across all five products.",
            "Perfil guardado en los cinco productos.",
          ),
        );
      });
    document.getElementById("photos").onsubmit = (event) =>
      run(event, async (form) => {
        const file = form.get("file"),
          kind = form.get("kind");
        if (
          !file ||
          file.size <= 0 ||
          file.size > 10 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          !["avatar", "banner"].includes(kind)
        )
          throw new Error(
            t(
              "Choose a JPG, PNG or WebP image up to 10 MB.",
              "Elige una imagen JPG, PNG o WebP de hasta 10 MB.",
            ),
          );
        const extension =
          file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg";
        const path = `${user.id}/${kind}-${crypto.randomUUID()}.${extension}`,
          bucket = client.storage.from("profile-media");
        const upload = await bucket.upload(path, await file.arrayBuffer(), {
          contentType: file.type,
          upsert: false,
        });
        if (upload.error)
          throw new Error(
            t(
              "Photo upload failed. Retry.",
              "No se pudo subir la foto. Reintenta.",
            ),
          );
        const { data } = bucket.getPublicUrl(path);
        const result = await client
          .from("profiles")
          .update(
            kind === "avatar"
              ? { avatar_url: data.publicUrl }
              : { banner_url: data.publicUrl },
          )
          .eq("id", user.id)
          .select("id")
          .maybeSingle();
        if (result.error || !result.data) {
          await bucket.remove([path]);
          throw new Error(
            t(
              "Photo could not be saved. Retry.",
              "No se pudo guardar la foto. Reintenta.",
            ),
          );
        }
        message(
          t("Photo saved across AkiSuite.", "Foto guardada en AkiSuite."),
        );
      });
    document.getElementById("email").onsubmit = (event) =>
      run(event, async (form) => {
        const email = form.get("email").trim().toLowerCase();
        const r = await client.auth.updateUser(
          { email },
          { emailRedirectTo: location.origin + "/login" },
        );
        if (r.error)
          throw new Error(
            t(
              "Could not request email change. Retry.",
              "No se pudo solicitar el cambio. Reintenta.",
            ),
          );
        message(
          t(
            "Check your inboxes to confirm the email change.",
            "Revisa tus correos para confirmar el cambio.",
          ),
        );
      });
    document.getElementById("reset").onclick = async () => {
      if (busy) return;
      busy = true;
      try {
        const r = await client.auth.resetPasswordForEmail(user.email, {
          redirectTo: location.origin + "/login",
        });
        if (r.error) throw r.error;
        message(
          t(
            "Check your email for the recovery link.",
            "Revisa tu correo para recuperar la contraseña.",
          ),
        );
      } catch {
        message(
          t(
            "Could not send recovery email. Retry.",
            "No se pudo enviar. Reintenta.",
          ),
          true,
        );
      } finally {
        busy = false;
      }
    };
    document.getElementById("signout").onclick = async () => {
      const r = await client.auth.signOut({ scope: "local" });
      if (r.error) {
        message(
          t(
            "Could not sign out. Retry.",
            "No se pudo cerrar sesión. Reintenta.",
          ),
          true,
        );
        return;
      }
      user = null;
      profile = null;
      selected = null;
      authScreen();
    };
  }

  async function billingRequest(action) {
    const { data } = await client.auth.getSession();
    if (!data.session?.access_token) throw new Error("Identity required");
    const response = await fetch("https://akipasa.com/api/account/portal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ action, product: "business", locale }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Billing unavailable");
    return response.json();
  }
  async function loadBilling() {
    const node = document.getElementById("billing");
    if (!node) return;
    try {
      const data = await billingRequest("summary");
      if (!node.isConnected) return;
      const planNames = {
        premium: "AkiPasa Premium",
        business: t(
          "Legacy Business subscription",
          "Suscripción Business anterior",
        ),
        business_pro: t(
          "Legacy Business Pro subscription",
          "Suscripción Business Pro anterior",
        ),
        akihq_standard: t("Legacy AkiHQ Standard", "AkiHQ Standard anterior"),
        akihq_pro: t("Legacy AkiHQ Pro", "AkiHQ Pro anterior"),
      };
      node.innerHTML = `<div class="panel-heading"><span class="icon-tile">${icon("membership")}</span><h3>${t("My memberships", "Mis membresías")}</h3></div>${data.subscriptions?.length ? `<ul>${data.subscriptions.map((row) => `<li>${esc(planNames[row.plan_code] || t("Existing subscription", "Suscripción existente"))} · ${esc(row.status)}${row.current_period_end ? ` · ${esc(new Date(row.current_period_end).toLocaleDateString(locale))}` : ""}</li>`).join("")}</ul>` : `<div class="empty-state">${icon("membership")}<h3>${t("No paid subscriptions recorded.", "No hay suscripciones de pago registradas.")}</h3><p>${t("Your existing subscriptions will appear here.", "Tus suscripciones existentes aparecerán aquí.")}</p></div>`}${data.hasCustomer ? `<button id="billing-portal" type="button">${t("Manage billing and subscriptions", "Gestionar pagos y suscripciones")}</button>` : ""}`;
      document
        .getElementById("billing-portal")
        ?.addEventListener("click", async (event) => {
          event.currentTarget.disabled = true;
          try {
            const result = await billingRequest("portal");
            if (
              !result.url ||
              new URL(result.url).origin !== "https://billing.stripe.com"
            )
              throw new Error();
            location.assign(result.url);
          } catch {
            message(
              t(
                "Billing management is unavailable. Retry shortly.",
                "La gestión de pagos no está disponible. Reintenta.",
              ),
              true,
            );
            const button = document.getElementById("billing-portal");
            if (button) button.disabled = false;
          }
        });
    } catch {
      if (node.isConnected)
        node.innerHTML = `<h2>${t("My memberships", "Mis membresías")}</h2><p role="alert">${t("Membership details could not be loaded. Your profile remains available.", "No se pudieron cargar las membresías. Puedes seguir usando tu perfil.")}</p>`;
    }
  }
  document.getElementById("theme").onclick = () => {
    theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("akipasa.theme", theme);
    } catch {}
    applyTheme();
  };
  applyTheme();
  document.getElementById("language").onclick = () => {
    locale = locale === "es" ? "en" : "es";
    window.AkiSuiteNavigation.remember(locale);
    const drafts = [...root.querySelectorAll("form")].map((form) => [
      form.id,
      [...form.elements]
        .filter(
          (field) => field.name && !["file", "password"].includes(field.type),
        )
        .map((field) => ({
          name: field.name,
          value: field.value,
          checked: field.checked,
        })),
    ]);
    const disclosures = [...root.querySelectorAll("details")].map(
      (node) => node.open,
    );
    if (user && profile) {
      render();
      void loadBilling();
    } else authScreen();
    for (const [id, fields] of drafts)
      for (const field of fields) {
        const controls = document.getElementById(id)?.elements;
        if (!controls) continue;
        for (const control of controls)
          if (control.name === field.name) {
            if (["radio", "checkbox"].includes(control.type)) {
              if (control.value === field.value)
                control.checked = field.checked;
            } else control.value = field.value;
          }
      }
    root.querySelectorAll("details").forEach((node, i) => {
      node.open = disclosures[i] ?? node.open;
    });
    root
      .querySelector('[name="workspace"]:checked')
      ?.dispatchEvent(new window.Event("change"));
  };
  load().catch(() => {
    root.innerHTML = `<h1>${t("Your account is temporarily unavailable", "Tu cuenta no está disponible ahora")}</h1><p>${t("Reload to retry. Your data and sign-in have not been changed.", "Recarga para reintentar. Tus datos y sesión no se han cambiado.")}</p><a href="${esc(local("/account"))}">${t("Retry", "Reintentar")}</a>`;
  });
})();
