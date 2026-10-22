(() => {
  "use strict";
  const copy = {
    en: {
      suite: "by AkiPasa", back: "Back to operations", eyebrow: "YOUR BUSINESS. YOUR TOOLBOX.",
      title: "The tools you need. One operating workspace.",
      intro: "AkiBusiness is paid operating software for your locations. AkiHQ stays free for managing listings; listing Premium upgrades are separate.",
      monthly: "Monthly", location: "Per operating location", period: "/month", chooseTools: "tools of your choice", allTools: "all tools available",
      basicRotation: "1 tool replacement at each monthly rotation", standardRotation: "2 tool replacements at each monthly rotation", proRotation: "Unrestricted tool access; no monthly selection needed",
      savedNext: "Save your next toolbox without changing this month's tools", instantStaff: "Change staff access to active tools immediately", allTogether: "Keep every operating tool available together", moreFlexibility: "MORE FLEXIBILITY", completeToolbox: "THE COMPLETE TOOLBOX",
      clearRules: "A CLEAR MONTHLY RHYTHM", howTitle: "Available now. Ready for next month.", activeTitle: "Active toolbox", activeBody: "These are the tools your location can use now. Saving a different selection does not activate it early.", nextTitle: "Saved next toolbox", nextBody: "Your saved selection starts at the next eligible monthly rotation. A replacement removes one active tool and adds another; repeated saves do not increase your allowance.", staffTitle: "Your team, without the wait", staffBody: "Grant or revoke staff access to your active tools whenever you need. Permissions stay scoped to the location and never unlock an unlicensed tool.",
      annualRotation: "Annual subscribers also rotate monthly. Billing frequency does not lock a toolbox for a year. Access changes after a confirmed upgrade follow the purchased package; downgrades take effect on the applicable billing date. Existing tool data is retained.",
      catalogueTitle: "Explore the 12 operating tools", catalogueBody: "Standard and Plus choose from this same catalogue. Pro includes all twelve. Individual tools still follow their applicable setup and permissions.",
      reviewTitle: "Review your operating subscription", reviewBody: "Your account checks the location you own, existing subscriptions and billing availability before offering a purchase or change. Opening it does not charge you.", reviewAction: "Manage operating subscription",
      separateTitle: "Free management. Separate listing upgrades.", notice: "AkiHQ is the free hub for organisations, locations, listings and ownership. An AkiBusiness operating subscription does not include personal Premium or Premium listing upgrades for AkiPasa, AkiDuermo or AkiCoches.", freeManagement: "Open free AkiHQ", listingOptions: "Explore listing upgrades",
      monthlyNote: "Monthly prices per operating location. Review availability and billing terms in your account.",
      plansLabel: "AkiBusiness plans", pageControls: "Page controls", light: "Light", dark: "Dark", useLight: "Switch to light mode", useDark: "Switch to dark mode",
    },
    es: {
      suite: "de AkiPasa", back: "Volver a operaciones", eyebrow: "TU NEGOCIO. TUS HERRAMIENTAS.",
      title: "Las herramientas que necesitas. Un solo espacio de trabajo.",
      intro: "AkiBusiness es software de operaciones de pago por ubicación. AkiHQ sigue siendo gratuito para gestionar tus fichas; las mejoras Premium se contratan aparte.",
      monthly: "Mensual", location: "Por ubicación operativa", period: "/mes", chooseTools: "herramientas a tu elección", allTools: "todas las herramientas disponibles",
      basicRotation: "1 sustitución de herramienta en cada rotación mensual", standardRotation: "2 sustituciones de herramientas en cada rotación mensual", proRotation: "Acceso sin restricciones; no necesitas elegir herramientas cada mes",
      savedNext: "Guarda tu próxima selección sin cambiar las herramientas de este mes", instantStaff: "Cambia al instante el acceso del equipo a las herramientas activas", allTogether: "Mantén disponibles todas las herramientas operativas a la vez", moreFlexibility: "MÁS FLEXIBILIDAD", completeToolbox: "TODAS LAS HERRAMIENTAS",
      clearRules: "UN RITMO MENSUAL CLARO", howTitle: "Disponibles hoy. Preparadas para el próximo mes.", activeTitle: "Herramientas activas", activeBody: "Son las herramientas que tu ubicación puede utilizar ahora. Guardar otra selección no la activa antes de tiempo.", nextTitle: "Próxima selección guardada", nextBody: "Tu selección guardada empieza en la siguiente rotación mensual permitida. Una sustitución quita una herramienta activa y añade otra; guardar varias veces no aumenta tu límite.", staffTitle: "Tu equipo, sin esperas", staffBody: "Concede o revoca el acceso a las herramientas activas cuando lo necesites. Los permisos se limitan a la ubicación y nunca desbloquean una herramienta sin licencia.",
      annualRotation: "Las suscripciones anuales también rotan mensualmente. La frecuencia de pago no bloquea las herramientas durante un año. Tras una mejora confirmada se aplican los accesos del nuevo paquete; las bajadas de plan entran en vigor en la fecha de facturación correspondiente. Los datos de las herramientas se conservan.",
      catalogueTitle: "Explora las 12 herramientas operativas", catalogueBody: "Standard y Plus eligen del mismo catálogo. Pro incluye las doce. Cada herramienta sigue su configuración y sus permisos aplicables.",
      reviewTitle: "Revisa tu suscripción operativa", reviewBody: "Tu cuenta comprueba la ubicación de tu propiedad, las suscripciones existentes y la disponibilidad de facturación antes de ofrecer una compra o un cambio. Abrirla no genera ningún cargo.", reviewAction: "Gestionar suscripción operativa",
      separateTitle: "Gestión gratuita. Mejoras de fichas independientes.", notice: "AkiHQ es el centro gratuito para empresas, ubicaciones, fichas y titularidad. Una suscripción operativa de AkiBusiness no incluye Premium personal ni las mejoras Premium de fichas de AkiPasa, AkiDuermo o AkiCoches.", freeManagement: "Abrir AkiHQ gratis", listingOptions: "Ver mejoras Premium de fichas",
      monthlyNote: "Precios mensuales por ubicación operativa. Consulta la disponibilidad y las condiciones de facturación en tu cuenta.",
      plansLabel: "Planes AkiBusiness", pageControls: "Controles de página", light: "Claro", dark: "Oscuro", useLight: "Cambiar a modo claro", useDark: "Cambiar a modo oscuro",
    },
  };
  // Stable parent tool keys match the authoritative toolbox catalogue. Subtools
  // such as support, sites and crm-social do not become extra selectable tools.
  const tools = [
    ["crm", "Customers & CRM", "Clientes y CRM"], ["inbox", "Inbox", "Bandeja de entrada"],
    ["tasks", "Tasks & projects", "Tareas y proyectos"], ["calendar", "Calendar", "Calendario"],
    ["inventory", "Inventory", "Inventario"], ["pos", "Point of sale", "TPV"],
    ["sales", "Sales", "Ventas"], ["marketing", "Marketing", "Marketing"],
    ["automation", "Automation", "Automatización"], ["collaboration", "Team chat", "Chat de equipo"],
    ["employees", "People", "Equipo"], ["knowledge", "Knowledge", "Conocimiento"],
  ];
  const params = new URLSearchParams(location.search);
  const workspaces = params.getAll("workspace");
  const workspace = workspaces.length === 1 && /^[a-z0-9][a-z0-9_-]{2,79}$/.test(workspaces[0]) ? workspaces[0] : undefined;
  let language = window.AkiSuiteNavigation.locale();
  let theme = "dark";
  try { theme = localStorage.getItem("akipasa.theme") || (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark"); } catch {}
  if (theme !== "light") theme = "dark";

  const render = () => {
    const text = copy[language];
    window.AkiSuiteNavigation.remember(language);
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.title = language === "es" ? "Planes AkiBusiness" : "AkiBusiness plans";
    document.querySelectorAll("[data-copy]").forEach(node => { node.textContent = text[node.dataset.copy]; });
    document.querySelectorAll('[data-copy="period"]').forEach(node => { node.textContent = text.period; });
    document.querySelector(".plan-grid").setAttribute("aria-label", text.plansLabel);
    document.querySelector(".header-actions").setAttribute("aria-label", text.pageControls);
    const languageButton = document.getElementById("language");
    languageButton.textContent = language === "es" ? "EN" : "ES";
    languageButton.setAttribute("aria-label", language === "es" ? "Switch to English" : "Cambiar a español");
    const themeButton = document.getElementById("theme");
    themeButton.textContent = theme === "dark" ? text.light : text.dark;
    themeButton.setAttribute("aria-label", theme === "dark" ? text.useLight : text.useDark);
    document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#071124" : "#faf7f2";
    const currency = new Intl.NumberFormat(language === "es" ? "es-ES" : "en-IE", { style: "currency", currency: "EUR" });
    document.querySelectorAll(".price strong").forEach(node => { node.textContent = currency.format(Number(node.dataset.monthly)); });
    document.getElementById("billing-note").textContent = text.monthlyNote;
    const catalogue = document.getElementById("tool-catalogue");
    catalogue.replaceChildren(...tools.map(([key, en, es]) => { const node = document.createElement("li"); node.dataset.tool = key; node.textContent = language === "es" ? es : en; return node; }));
    const review = new URL(window.AkiSuiteNavigation.href("pasa", language, { path: "/account/subscription/operations" }));
    if (workspace) review.searchParams.set("workspace", workspace);
    document.getElementById("operations-subscription-link").href = review.toString();
    document.getElementById("free-management-link").href = window.AkiSuiteNavigation.href("hq", language);
    document.getElementById("listing-plans-link").href = window.AkiSuiteNavigation.href("hq", language, { path: "/membership" });
    const back = new URL("/", location.origin);
    back.searchParams.set("locale", language);
    if (workspace) back.searchParams.set("workspace", workspace);
    document.querySelectorAll("[data-operations-back]").forEach(node => { node.href = `${back.pathname}${back.search}`; });
  };
  document.getElementById("language").addEventListener("click", () => { language = language === "es" ? "en" : "es"; render(); });
  document.getElementById("theme").addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; try { localStorage.setItem("akipasa.theme", theme); } catch {} render(); });
  render();
})();
