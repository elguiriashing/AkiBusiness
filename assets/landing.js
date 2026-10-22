(() => {
  "use strict";
  const es = {
    navTools:"Herramientas", navPlans:"Precios", navHq:"AkiHQ", signIn:"Entrar ↗",
    eyebrow:"EL SISTEMA OPERATIVO DE TU NEGOCIO",
    headline1:"Dirige el día.", headline2:"Haz crecer tu negocio.",
    heroIntro:"TPV, inventario, equipos, clientes e informes. Tus herramientas operativas conectadas, sin el caos de diecisiete pestañas abiertas.",
    seePlans:"Descubrir planes", openWorkspace:"Abrir mi espacio",
    locationPlans:"Planes por ubicación operativa", oneAccount:"Conectado con tu cuenta AkiSuite",
    workspaceReady:"ESPACIO", mockOverview:"Resumen", mockSales:"Ventas", mockInventory:"Inventario", mockTeam:"Equipo", mockReports:"Informes",
    liveWorkspace:"TU ESPACIO", demoTitle:"Todo en marcha.", demoChip:"OPERACIONES",
    demoPos:"PUNTO DE VENTA", posTitle:"Pedidos", demoInventory:"INVENTARIO", inventoryTitle:"Estado del stock",
    demoReports:"INFORMES", reportTitle:"Tendencias de un vistazo", allConnected:"TODO CONECTADO",
    twoProducts:"DOS PRODUCTOS. UNA SUITE CONECTADA.", managementHub:"Gestión gratuita", operationsSuite:"Herramientas profesionales",
    toolKicker:"CADA HERRAMIENTA EN SU LUGAR", toolHeading:"Un espacio. Todas tus operaciones.",
    toolIntro:"Empieza con las herramientas que tu local necesita. Mantén a tu equipo trabajando sin saltar entre sistemas.",
    toolPos:"Punto de venta", toolPosDesc:"Mesas, pedidos, cuentas, cocina y barra en una sola vista de servicio.",
    toolInventory:"Inventario", toolInventoryDesc:"Controla existencias, productos y operaciones del día a día.",
    toolTeam:"Personal y permisos", toolTeamDesc:"Da acceso a cada persona solo a las herramientas y ubicaciones que necesita.",
    toolCrm:"CRM y clientes", toolCrmDesc:"Organiza las relaciones con tus clientes desde un único espacio.",
    toolReports:"Informes y análisis", toolReportsDesc:"Ten una visión clara del rendimiento y de la actividad del negocio.",
    toolTogether:"Herramientas conectadas", toolTogetherDesc:"Elige la combinación adecuada de herramientas para cada ubicación.",
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
  const urlLocale = new URLSearchParams(location.search).get("locale");
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
    languageButton.setAttribute("aria-label", locale === "es" ? "Cambiar a inglés" : "Switch to Spanish");
    document.querySelectorAll("[data-login-link]").forEach(link => {
      link.href = "/login?locale=" + locale;
    });
    document.querySelectorAll(".ab-plan-cta").forEach(link => {
      link.href = "/membership.html?locale=" + locale;
    });
    document.querySelectorAll('a[href^="https://akihq.app"]').forEach(link => {
      link.href = "https://akihq.app/?lang=" + locale;
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
  renderLanguage();
})();
