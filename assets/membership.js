(() => {
  const copy = {
    en: {suite:"by AkiPasa",back:"Back to operations",eyebrow:"PAID OPERATIONS SUITE",title:"Run service, stock and teams from one place.",intro:"Plans are shown for product planning. Billing is not active here yet, and viewing a plan never creates a subscription or captures payment.",monthly:"Monthly",yearly:"Yearly",saving:"save 20%",location:"Per operating location",recommended:"RECOMMENDED",permonth:"/month",standard1:"PoS and table service",standard2:"Core stock and staff controls",standard3:"Operational reports",plus1:"Everything in Standard",plus2:"KDS, courses and advanced inventory",plus3:"CRM and multi-station workflows",pro1:"Everything in Plus",pro2:"Advanced permissions and reporting",pro3:"Priority operational support",staged:"Staged — not available to buy",notice:"AkiHQ remains the free company-management hub. AkiBusiness plans cover paid operating tools and do not grant listing or personal Premium subscriptions."},
    es: {suite:"de AkiPasa",back:"Volver a operaciones",eyebrow:"SUITE DE OPERACIONES DE PAGO",title:"Gestiona servicio, stock y equipo desde un solo lugar.",intro:"Los planes se muestran para planificación. La facturación aún no está activa aquí; ver un plan nunca crea una suscripción ni captura un pago.",monthly:"Mensual",yearly:"Anual",saving:"ahorra 20%",location:"Por ubicación operativa",recommended:"RECOMENDADO",permonth:"/mes",standard1:"TPV y servicio de mesas",standard2:"Controles básicos de stock y personal",standard3:"Informes operativos",plus1:"Todo lo incluido en Standard",plus2:"KDS, cursos e inventario avanzado",plus3:"CRM y flujos para varias estaciones",pro1:"Todo lo incluido en Plus",pro2:"Permisos e informes avanzados",pro3:"Soporte operativo prioritario",staged:"En preparación — aún no se puede comprar",notice:"AkiHQ sigue siendo el centro gratuito de gestión empresarial. Los planes AkiBusiness cubren herramientas operativas de pago y no incluyen suscripciones de anuncios ni Premium personal."}
  };
  let language = window.AkiSuiteNavigation.locale();
  let cycle = "monthly";
  const render = () => {
    window.AkiSuiteNavigation.remember(language);
    document.querySelectorAll('.plans-header a').forEach(node => { node.href = `/?locale=${language}`; });
    document.documentElement.lang = language;
    document.title = language === "es" ? "Planes AkiBusiness" : "AkiBusiness plans";
    document.querySelectorAll("[data-copy]").forEach(node => { node.textContent = copy[language][node.dataset.copy]; });
    document.getElementById("language").textContent = language === "es" ? "EN" : "ES";
    document.querySelectorAll("[data-cycle]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.cycle === cycle)));
    document.querySelectorAll(".price strong").forEach(node => { node.textContent = `€${node.dataset[cycle]}`; });
  };
  document.getElementById("language").addEventListener("click", () => { language = language === "es" ? "en" : "es"; render(); });
  document.querySelectorAll("[data-cycle]").forEach(button => button.addEventListener("click", () => { cycle = button.dataset.cycle; render(); }));
  render();
})();
