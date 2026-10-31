(function (root) {
  "use strict";
  // Instructions describe current capabilities. They never imply a planned integration executes.
  const guides = {
    crm: {
      entity: "contact",
      en: [
        "Turn customer details into a clear next action.",
        "Add a contact and their company.",
        "Create a deal in the correct pipeline stage.",
        "Add a follow-up task with an owner and due date.",
      ],
      es: [
        "Convierte los datos del cliente en una próxima acción clara.",
        "Añade un contacto y su empresa.",
        "Crea una oportunidad en la etapa adecuada.",
        "Añade una tarea de seguimiento con responsable y fecha.",
      ],
    },
    inbox: {
      entity: "conversation",
      en: [
        "Keep each customer conversation together.",
        "Ask a workspace administrator to connect a dedicated Gmail or Microsoft 365 business mailbox.",
        "Open a message, review the recipient and reply. Unknown send outcomes must be checked in the provider's Sent folder.",
        "Record the next action in Tasks when follow-up is needed.",
      ],
      es: [
        "Mantén cada conversación con el cliente en un solo lugar.",
        "Pide al administrador que conecte un buzón de empresa de Gmail o Microsoft 365.",
        "Abre un mensaje, revisa el destinatario y responde. Comprueba los envíos inciertos en Enviados del proveedor.",
        "Registra la próxima acción en Tareas si necesita seguimiento.",
      ],
    },
    tasks: {
      entity: "task",
      en: [
        "Make responsibility and deadlines visible.",
        "Create a task with a specific outcome.",
        "Assign an owner, project, priority and due date.",
        "Use List view to edit a task without dragging, then move it through review to done.",
      ],
      es: [
        "Aclara responsabilidades y plazos.",
        "Crea una tarea con un resultado concreto.",
        "Asigna responsable, proyecto, prioridad y fecha.",
        "Usa la vista Lista para editar sin arrastrar y avanza hasta completarla.",
      ],
    },
    calendar: {
      entity: "event",
      en: [
        "Keep meetings and work dates in one place.",
        "Create an event with a start, end and location.",
        "Open a day to see all of its events.",
        "Use Rotas for staff shifts; Calendar is for events and meetings.",
      ],
      es: [
        "Reúne reuniones y fechas de trabajo.",
        "Crea un evento con inicio, fin y ubicación.",
        "Abre un día para ver todos sus eventos.",
        "Usa Horarios para turnos; Calendario es para eventos y reuniones.",
      ],
    },
    inventory: {
      entity: "product",
      en: [
        "Know what is available before taking an order.",
        "Create a product with a unique SKU and stock thresholds.",
        "Record receipts and movements against the correct location.",
        "Review low-stock recommendations and recorded valuation before reordering.",
      ],
      es: [
        "Comprueba las existencias antes de tomar un pedido.",
        "Crea un producto con SKU único y umbrales de stock.",
        "Registra entradas y movimientos en la ubicación correcta.",
        "Revisa recomendaciones de reposición y valoración registrada.",
      ],
    },
    pos: {
      en: [
        "Take an order through service to a recorded payment.",
        "Check catalogue, floor and printer stations before service.",
        "Open the table or order, add items and review the bill.",
        "Record payment, then check the sales ledger and end-of-day totals.",
      ],
      es: [
        "Lleva el pedido desde el servicio hasta el pago registrado.",
        "Comprueba catálogo, plano y estaciones de impresión antes del servicio.",
        "Abre mesa o pedido, añade productos y revisa la cuenta.",
        "Registra el pago y revisa el historial y el cierre de caja.",
      ],
    },
    sales: {
      entity: "invoice",
      en: [
        "Track sales records and amounts that need follow-up.",
        "Add a customer and review the sales record.",
        "Check status, due date and totals before recording changes.",
        "Review fiscal setup separately; an operational record is not proof of a valid fiscal invoice.",
      ],
      es: [
        "Controla ventas e importes que necesitan seguimiento.",
        "Añade un cliente y revisa el registro de venta.",
        "Comprueba estado, vencimiento y totales antes de guardar.",
        "Revisa la configuración fiscal: un registro operativo no acredita una factura fiscal válida.",
      ],
    },
    marketing: {
      entity: "campaign",
      en: [
        "Plan campaigns with a clear audience and outcome.",
        "Create an email campaign with subject, content and a permitted audience.",
        "Review the email and recipient. Your connected mailbox, verified sender, consent and unsubscribe setup are required for delivery.",
        "Campaign figures are recorded values; saving a campaign does not send a campaign. Send reviewed email is an explicit, separate action.",
      ],
      es: [
        "Planifica campañas con público y objetivo claros.",
        "Crea una campaña de correo con asunto, contenido y público autorizado.",
        "Revisa el correo y destinatario. El envío requiere buzón conectado, remitente verificado, consentimiento y baja configurada.",
        "Las cifras son valores registrados; guardar una campaña no la envía. Enviar correo revisado es una acción independiente.",
      ],
    },
    automation: {
      entity: "automation",
      en: [
        "Turn overdue work and low stock into reviewed follow-up tasks.",
        "Choose a supported rule, activate it and preview the matching records.",
        "Review the proposed tasks, then explicitly create them. The same rule/source pair is deduplicated for the day.",
        "Saving or toggling does not execute a rule. Custom plans do not execute actions; background execution is not enabled.",
      ],
      es: [
        "Convierte trabajo vencido y stock bajo en tareas de seguimiento revisadas.",
        "Elige una regla compatible, actívala y previsualiza los registros.",
        "Revisa y crea las tareas propuestas. Se evitan duplicados de la misma regla y registro durante el día.",
        "Guardar o activar no ejecuta la regla. Los planes personalizados no ejecutan acciones; no hay ejecución en segundo plano.",
      ],
    },
    collaboration: {
      en: [
        "Keep work conversations inside the right team channel.",
        "Choose a channel or direct conversation.",
        "Send the context and a specific next action.",
        "Put work requiring ownership and a deadline into Tasks.",
      ],
      es: [
        "Mantén las conversaciones en el canal de equipo adecuado.",
        "Elige un canal o una conversación directa.",
        "Envía el contexto y una próxima acción concreta.",
        "Lleva a Tareas el trabajo con responsable y fecha.",
      ],
    },
    employees: {
      en: [
        "Reuse your team across staff operations.",
        "Owners manage invitations and role access in workspace settings.",
        "Open a staff profile to review assignments and department.",
        "Open Rotas to select linked staff or add manual profiles without granting access.",
      ],
      es: [
        "Reutiliza tu equipo en las operaciones de personal.",
        "El propietario gestiona invitaciones y permisos en Ajustes.",
        "Abre un perfil para revisar tareas y departamento.",
        "Abre Horarios para usar personal vinculado o añadir perfiles manuales sin dar acceso.",
      ],
    },
    knowledge: {
      entity: "article",
      en: [
        "Give staff a process they can follow without asking around.",
        "Create an article with a clear title and category.",
        "Write the steps, exceptions and the person to contact.",
        "Review the content when the process changes; automatic review reminders are not yet available.",
      ],
      es: [
        "Ofrece al equipo un proceso que pueda seguir por su cuenta.",
        "Crea un artículo con título y categoría claros.",
        "Describe pasos, excepciones y persona de contacto.",
        "Revisa al cambiar el proceso; aún no hay recordatorios automáticos de revisión.",
      ],
    },
  };
  guides.rotas = { en: ["Publish a clear schedule for your team.", "Add linked team members or manual staff profiles.", "Create shifts and resolve overlap warnings.", "Publish the schedule, then print or export the selected period."], es: ["Publica un horario claro para tu equipo.", "Añade miembros del equipo o perfiles manuales.", "Crea turnos y resuelve los conflictos.", "Publica el horario e imprime o exporta el período."] };
  function render(key, locale, options = {}) {
    const g = guides[key];
    if (!g) return "";
    const es = locale === "es",
      lines = g[es ? "es" : "en"];
    return `<details class="panel tool-guide"><summary><span>${es ? "Guía rápida" : "Quick guide"}</span><span>${lines[0]}</span></summary><ol>${lines
      .slice(1)
      .map((s) => `<li>${s}</li>`)
      .join(
        "",
      )}</ol>${g.entity && options.canOperate !== false ? `<button class="action-btn" data-action="open-form" data-entity="${g.entity}">${es ? "Crear registro" : "Create record"}</button>` : ""}${key === "employees" || key === "calendar" ? `<button class="action-btn" data-action="navigate" data-route="rotas">${es ? "Abrir horarios" : "Open rotas"}</button>` : ""}</details>`;
  }
  const api = { guides, render };
  if (typeof module === "object") module.exports = api;
  root.AkiToolGuides = api;
})(typeof window !== "undefined" ? window : globalThis);
