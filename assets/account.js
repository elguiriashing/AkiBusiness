/* Native AkiBusiness account v1. Shared identity/RLS; no browser billing authority. */
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
  const client =
    config.SUPABASE_URL && config.SUPABASE_ANON_KEY
      ? window.supabase?.createClient(
          config.SUPABASE_URL,
          config.SUPABASE_ANON_KEY,
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
  };
  function controls() {
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
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: location.origin + "/login" },
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
    root.innerHTML = `<h1>${t("Your AkiBusiness account", "Tu cuenta AkiBusiness")}</h1><p>${t("One shared AkiSuite profile. Your operations stay here.", "Un perfil compartido AkiSuite. Tus operaciones se quedan aquí.")}</p><p id="message" role="status"></p><section class="panel"><h2>${t("Your operating location", "Tu ubicación operativa")}</h2><p>${t("Use AkiBusiness with a private workplace, even without a public AkiPasa venue, property or rental listing.", "Usa AkiBusiness con una ubicación privada, sin necesitar un local, alojamiento o sucursal pública.")}</p>${plan ? `<p class="notice">${t("Selected package", "Paquete elegido")}: AkiBusiness ${plan.name} · ${new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(plan.cents / 100)} / ${t("month per location", "mes por ubicación")}</p>` : ""}<form id="location-picker"><label>${t("Choose location", "Elige ubicación")}<select name="workspace"><option value="">${t("Choose…", "Elige…")}</option>${workspaces.map((w) => `<option value="${esc(w.id)}" ${w.id === selected ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label><button type="submit">${t("Open this location", "Abrir esta ubicación")}</button></form>${selected ? `<div class="actions">${access?.can_operate === true ? `<a class="button primary" href="${esc(local("/login"))}">${t("Open my dashboard", "Abrir mi panel")}</a>` : `<p>${t("This location is set up. Operating tools need their applicable plan and permissions; choosing a package does not activate or charge it.", "La ubicación está creada. Las herramientas requieren su plan y permisos; elegir un paquete no lo activa ni genera cargos.")}</p>`}<a href="${esc(local("/toolbox"))}">${t("My toolbox and team permissions", "Mis herramientas y permisos")}</a></div>` : ""}<details><summary>${t("Create a private operating location", "Crear ubicación operativa privada")}</summary><form id="create-location"><label>${t("Location name", "Nombre de la ubicación")}<input name="name" required minlength="2" maxlength="120" autocomplete="organization"></label><button type="submit">${t("Create my location", "Crear mi ubicación")}</button></form></details><p>${t("New checkout is not available yet. Existing subscriptions and access remain unchanged. No payment is taken here.", "Las nuevas compras aún no están disponibles. Se mantienen las suscripciones y accesos existentes. Aquí no se cobra ningún pago.")}</p></section><section id="billing" class="panel"><h2>${t("My memberships", "Mis membresías")}</h2><p role="status">${t("Loading membership details…", "Cargando las membresías…")}</p></section><section class="panel"><h2>${t("Shared profile", "Perfil compartido")}</h2><p>${t("Saved directly to the same account used by AkiPasa, AkiDuermo, AkiCoches and AkiHQ.", "Guardado en la misma cuenta de AkiPasa, AkiDuermo, AkiCoches y AkiHQ.")}</p><form id="profile"><div class="grid">${input("displayName", t("Display name", "Nombre"), "display_name", 100)}${input("username", t("Username", "Nombre de usuario"), "username", 30)}${input("phone", t("Phone", "Teléfono"), "phone", 40)}${input("locality", t("Town / city", "Localidad"), "locality", 120)}${input("province", t("Province", "Provincia"), "province", 120)}<label>${t("Preferred language", "Idioma preferido")}<select name="preferredLocale"><option value="en" ${profile.preferred_locale === "en" ? "selected" : ""}>English</option><option value="es" ${profile.preferred_locale === "es" ? "selected" : ""}>Español</option></select></label>${[
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
      )}</div><label>Bio<textarea name="bio" maxlength="2000" rows="4">${esc(profile.bio)}</textarea></label><button type="submit">${t("Save shared profile", "Guardar perfil compartido")}</button></form></section><section class="panel"><h2>${t("Profile photos", "Fotos del perfil")}</h2><form id="photos"><label>${t("Photo type", "Tipo de foto")}<select name="kind"><option value="avatar">${t("Profile photo", "Foto de perfil")}</option><option value="banner">${t("Cover photo", "Foto de portada")}</option></select></label><label>${t("JPG, PNG or WebP, up to 10 MB", "JPG, PNG o WebP, hasta 10 MB")}<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required></label><button type="submit">${t("Save shared photo", "Guardar foto compartida")}</button></form></section><section class="panel"><h2>${t("Sign-in and security", "Acceso y seguridad")}</h2><p>${esc(user.email)}</p><form id="email"><label>${t("New sign-in email", "Nuevo correo de acceso")}<input name="email" type="email" required maxlength="254" autocomplete="email"></label><button type="submit">${t("Request email change", "Solicitar cambio de correo")}</button></form><div class="actions"><button id="reset" type="button">${t("Send password reset link", "Enviar recuperación")}</button><button id="signout" type="button">${t("Sign out here", "Cerrar sesión aquí")}</button></div></section>`;
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
      node.innerHTML = `<h2>${t("My memberships", "Mis membresías")}</h2><p>${t("Existing subscriptions on your shared account.", "Suscripciones existentes en tu cuenta compartida.")}</p>${data.subscriptions?.length ? `<ul>${data.subscriptions.map((row) => `<li>${esc(planNames[row.plan_code] || t("Existing subscription", "Suscripción existente"))} · ${esc(row.status)}${row.current_period_end ? ` · ${esc(new Date(row.current_period_end).toLocaleDateString(locale))}` : ""}</li>`).join("")}</ul>` : `<p>${t("No paid subscriptions recorded.", "No hay suscripciones de pago registradas.")}</p>`}${data.hasCustomer ? `<button id="billing-portal" type="button">${t("Manage billing and subscriptions", "Gestionar pagos y suscripciones")}</button>` : ""}`;
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
  document.getElementById("language").onclick = () => {
    locale = locale === "es" ? "en" : "es";
    window.AkiSuiteNavigation.remember(locale);
    if (user && profile) {
      render();
      void loadBilling();
    } else authScreen();
  };
  load().catch(() => {
    root.innerHTML = `<h1>${t("Your account is temporarily unavailable", "Tu cuenta no está disponible ahora")}</h1><p>${t("Reload to retry. Your data and sign-in have not been changed.", "Recarga para reintentar. Tus datos y sesión no se han cambiado.")}</p><a href="${esc(local("/account"))}">${t("Retry", "Reintentar")}</a>`;
  });
})();
