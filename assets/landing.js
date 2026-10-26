(() => {
  "use strict";
  const es = {
    headerSignIn:"Entrar", navTools:"Herramientas", navPlans:"Precios", navHq:"AkiHQ", signIn:"Entrar ↗",
    eyebrow:"EL SISTEMA OPERATIVO DE TU NEGOCIO",
    headline1:"Dirige el día.", headline2:"Haz crecer tu negocio.",
    heroIntro:"Elige entre las 12 herramientas reales de AkiBusiness, incluyendo TPV, CRM, inventario, chat de equipo y más. Las herramientas activas dependen del plan y los permisos de tu ubicación.",
    seePlans:"Descubrir planes", openWorkspace:"Abrir mi espacio",
    locationPlans:"Planes por ubicación operativa", oneAccount:"Conectado con tu cuenta AkiSuite",
    workspaceReady:"ESPACIO", mockOverview:"Resumen", mockSales:"Ventas", mockInventory:"Inventario", mockTeam:"Equipo", mockReports:"Informes",
    liveWorkspace:"TU ESPACIO", demoTitle:"Todo en marcha.", demoChip:"OPERACIONES",
    demoPos:"PUNTO DE VENTA", posTitle:"Pedidos", demoInventory:"INVENTARIO", inventoryTitle:"Estado del stock",
    demoReports:"INFORMES", reportTitle:"Tendencias de un vistazo", allConnected:"TODO CONECTADO",
    twoProducts:"DOS PRODUCTOS. UNA SUITE CONECTADA.", managementHub:"Gestión gratuita", operationsSuite:"Herramientas profesionales",
    toolKicker:"LAS 12 HERRAMIENTAS OPERATIVAS DE AKIBUSINESS", toolHeading:"Tu caja de herramientas. Tú eliges.",
    toolIntro:"Explora las mismas 12 herramientas incluidas en los planes AkiBusiness. Basic permite elegir 4, Standard permite 8 y Pro incluye las 12. Los cambios guardados se aplican en la próxima rotación mensual correspondiente.",
    toolCrm:"Clientes y CRM", toolCrmDesc:"Espacio de clientes y CRM.",
    toolInbox:"Bandeja de entrada", toolInboxDesc:"Bandeja y mensajes de soporte.",
    toolTasks:"Tareas y proyectos", toolTasksDesc:"Organiza tareas y proyectos.",
    toolCalendar:"Calendario", toolCalendarDesc:"Calendario de trabajo del equipo.",
    toolInventory:"Inventario", toolInventoryDesc:"Gestiona productos y existencias.",
    toolPos:"TPV", toolPosDesc:"Mesas, pedidos, cuentas y flujos de servicio.",
    toolSales:"Ventas", toolSalesDesc:"Espacio de ventas y facturación.",
    toolMarketing:"Marketing", toolMarketingDesc:"Herramientas de marketing y sitios web.",
    toolAutomation:"Automatización", toolAutomationDesc:"Automatizaciones para tus flujos de trabajo.",
    toolChat:"Chat de equipo", toolChatDesc:"Conversaciones del equipo en un mismo espacio.",
    toolPeople:"Equipo", toolPeopleDesc:"Gestión de personal y accesos.",
    toolKnowledge:"Conocimiento", toolKnowledgeDesc:"Espacio de conocimiento interno.",
    toolCatalogueNote:"Las mismas 12 herramientas del catálogo AkiBusiness. Basic incluye 4, Standard 8 y Pro las 12. El acceso depende de los permisos, el plan y la ubicación.",
    pricingKicker:"PRECIOS CLAROS Y ESCALABLES", pricingTitle:"Tus herramientas. A tu ritmo.",
    pricingIntro:"Precios mensuales por ubicación operativa. La selección y facturación dependen de las ventajas confirmadas en tu cuenta.",
    starting:"PARA EMPEZAR", flexible:"MÁS FLEXIBILIDAD", everything:"HERRAMIENTAS COMPLETAS", month:"/ mes",
    standardIntro:"Lo esencial para tus operaciones.", plusIntro:"Más herramientas para equipos en crecimiento.", proIntro:"Todas las funciones operativas.",
    ofTwelve:"de 12 herramientas", standard1:"Elige cuatro herramientas activas", standard2:"Guarda la selección del próximo mes",
    plus1:"Elige ocho herramientas activas", plus2:"Dos sustituciones por rotación mensual",
    pro1:"Las doce herramientas operativas", pro2:"Sin selección mensual obligatoria",
    all1:"Acceso del personal por ubicación", comparePlans:"Ver detalles del plan ↗",
    billingDisclaimer:"Información de los planes. Consulta tu cuenta para disponibilidad, impuestos, ciclos de facturación y pago.",
    ctaKicker:"LA GESTIÓN VA POR NUESTRA CUENTA", ctaTitle:"¿Prefieres empezar gratis?",
    ctaBody:"AkiHQ es el centro gratuito para gestionar empresas y fichas. Añade AkiBusiness cuando tu equipo lo necesite.",
    openHq:"Descubrir AkiHQ ↗", footerCopy:"AkiBusiness · Parte de AkiSuite de AkiPasa Marketing S.L."
  };
  const original = new Map([...document.querySelectorAll("[data-i18n]")].map(el => [el, el.textContent]));
  const languageButton = document.getElementById("ab-language");
  const params = new URLSearchParams(location.search);
  const urlLocale = params.get("locale") || params.get("lang");
  let saved = null;
  try { saved = localStorage.getItem("akisuite.language"); } catch {}
  let locale = urlLocale === "es" || urlLocale === "en" ? urlLocale : saved === "es" ? "es" : "en";
  function renderLanguage() {
    document.documentElement.lang = locale;
    for (const [el, en] of original) {
      const key = el.dataset.i18n;
      el.textContent = locale === "es" ? (es[key] || en) : en;
    }
    languageButton.textContent = locale === "es" ? "EN" : "ES";
    updateHeader();
    languageButton.setAttribute("aria-label", locale === "es" ? "Cambiar a inglés" : "Switch to Spanish");
    document.querySelectorAll("[data-login-link]").forEach(link => {
      link.href = "/login?locale=" + locale;
    });
    document.querySelectorAll(".ab-plan-cta").forEach(link => {
      link.href = "/account?locale=" + locale + "&tier=" + link.dataset.tier;
      const name = {basico:"Basic",standard:"Standard",pro:"Pro"}[link.dataset.tier];
      link.textContent = (locale === "es" ? "Elegir " : "Choose ") + name + " →";
    });
    document.querySelectorAll('a[href^="https://akihq.app"]').forEach(link => {
      if (!link.hasAttribute("data-suite-product")) link.href = "https://akihq.app/?lang=" + locale;
    });
  }
  languageButton.addEventListener("click", () => {
    locale = locale === "es" ? "en" : "es";
    try { localStorage.setItem("akisuite.language", locale); } catch {}
    const url = new URL(location.href);
    url.searchParams.set("locale", locale);
    history.replaceState(history.state, "", url);
    renderLanguage();
  });
  let theme = "dark";
  try { theme = localStorage.getItem("akipasa.theme") === "light" ? "light" : "dark"; } catch {}
  const themeButton = document.getElementById("ab-theme");
  const menu = document.querySelector(".suite-marketing-header .portal-product-menu");
  function updateHeader() {
    const es = locale === "es";
    document.querySelector(".suite-marketing-brand").setAttribute("aria-label", es ? "Inicio de AkiBusiness" : "AkiBusiness home");
    document.querySelector(".suite-marketing-links").setAttribute("aria-label", es ? "Navegación principal" : "Primary navigation");
    document.querySelector(".portal-header-tools").setAttribute("aria-label", es ? "Controles de Aki Apps" : "Aki Apps controls");
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute("aria-pressed", String(theme === "dark"));
    themeButton.setAttribute("aria-label", es ? `Cambiar a modo ${theme === "dark" ? "claro" : "oscuro"}` : `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
    themeButton.innerHTML = theme === "dark" ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg>';
    document.querySelectorAll("[data-suite-product]").forEach(link => {
      const id = link.dataset.suiteProduct;
      const urls = {pasa:`https://akipasa.com/${locale}`,duermo:`https://akiduermo.com/?lang=${locale}`,coches:`https://akicoches.com/?lang=${locale}`,hq:`https://akihq.app/${locale}/business`,business:`/?locale=${locale}`};
      link.href = urls[id];
      if (id === "business") link.setAttribute("aria-current", "page");
    });
  }
  themeButton.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("akipasa.theme", theme); } catch {}
    updateHeader();
  });
  document.addEventListener("pointerdown", event => { if (!menu.contains(event.target)) menu.open = false; });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); } });
  menu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => { menu.open = false; }));
  renderLanguage();
})();
