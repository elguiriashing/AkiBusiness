(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AkiBusinessOperationalAnalytics = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const copy = {
    en: {
      title: "Operational reports",
      intro:
        "Recorded activity for this operating location. Discovery visibility remains in free AkiHQ.",
      hq: "Open free AkiHQ overview",
      range: "Period",
      through: "Through date (blank means yesterday)",
      days: "days",
      refresh: "Refresh report",
      export: "Export permitted report",
      loading: "Loading scoped records…",
      unavailable: "Report unavailable. Retry to load authoritative records.",
      empty: "No report loaded yet.",
      staged:
        "Advanced reports are being prepared. Existing tools remain available.",
      sales: "Sales",
      inventory: "Stock and cost",
      employees: "Team activity",
      current: "Selected period",
      previous: "Previous equal period",
      currency: "Currency",
      completed: "Completed sales",
      recorded: "Recorded sales",
      tips: "Tips recorded separately",
      refunds: "Refunded sale records",
      voids: "Voided sale records",
      noSales: "No recorded sales in these periods.",
      source: "Source",
      noProfit:
        "These are operational records, not profit, accounting statements or sitewide Google traffic.",
      partial:
        "The selected period is still in progress; the previous period is complete.",
      locked: "Requires this active toolbox tool and current team permission.",
      opening: "Opening recorded stock",
      closing: "Closing recorded stock",
      known: "Known carrying value",
      total: "Complete carrying value",
      unknown: "Unknown-cost rows",
      unrecorded: "Rows before tracking / unrecorded",
      noStock: "No stock evidence exists for this cutoff.",
      consumption: "Known recorded sale consumption",
      waste: "Known recorded waste cost",
      unknownOutflow: "Outflows with unknown cost",
      noFlows: "No recorded stock movements in these periods.",
      staffNote:
        "Counts are recorded actions, not hours worked or productivity scores. Only sources you can access are included.",
      member: "Team member",
      activeMembers: "Currently active team members",
      actions: "Recorded actions",
      posActions: "PoS actions",
      stockActions: "Stock operations",
      noStaff: "No actions recorded in the permitted sources.",
      noSources:
        "No PoS or stock activity source is permitted for this report.",
      limited:
        "Showing the first 50 actors; totals include all recorded actors.",
      daily: "Daily recorded sales (latest 30 rows)",
      date: "Date",
      error: "Could not load this report.",
      exportError: "Could not export this report.",
      noExport: "Your role has no report export permission.",
      generated: "Generated",
      period: "Period",
      previousOpening: "Previous opening recorded stock",
    },
    es: {
      title: "Informes operativos",
      intro:
        "Actividad registrada de esta ubicación operativa. La visibilidad del listado sigue en AkiHQ gratuito.",
      hq: "Abrir resumen gratuito de AkiHQ",
      range: "Periodo",
      through: "Hasta la fecha (en blanco: ayer)",
      days: "días",
      refresh: "Actualizar informe",
      export: "Exportar informe permitido",
      loading: "Cargando registros de esta ubicación…",
      unavailable:
        "Informe no disponible. Reintenta para cargar los registros autorizados.",
      empty: "Todavía no se ha cargado un informe.",
      staged:
        "Los informes avanzados están en preparación. Las herramientas existentes siguen disponibles.",
      sales: "Ventas",
      inventory: "Stock y coste",
      employees: "Actividad del equipo",
      current: "Periodo seleccionado",
      previous: "Periodo anterior equivalente",
      currency: "Moneda",
      completed: "Ventas completadas",
      recorded: "Ventas registradas",
      tips: "Propinas registradas por separado",
      refunds: "Registros de ventas reembolsadas",
      voids: "Registros de ventas anuladas",
      noSales: "No hay ventas registradas en estos periodos.",
      source: "Fuente",
      noProfit:
        "Son registros operativos, no beneficios, estados contables ni tráfico general de Google.",
      partial:
        "El periodo seleccionado sigue abierto; el periodo anterior está completo.",
      locked:
        "Requiere esta herramienta activa y un permiso actual del equipo.",
      opening: "Stock registrado al inicio",
      closing: "Stock registrado al cierre",
      known: "Valor de stock conocido",
      total: "Valor completo del stock",
      unknown: "Filas con coste desconocido",
      unrecorded: "Filas anteriores al seguimiento / sin registro",
      noStock: "No hay evidencia de stock para este momento.",
      consumption: "Consumo de ventas registrado con coste conocido",
      waste: "Coste de merma registrado conocido",
      unknownOutflow: "Salidas con coste desconocido",
      noFlows: "No hay movimientos de stock registrados en estos periodos.",
      staffNote:
        "Son acciones registradas, no horas trabajadas ni puntuaciones de productividad. Solo se incluyen fuentes que puedes consultar.",
      member: "Miembro del equipo",
      activeMembers: "Miembros activos actualmente",
      actions: "Acciones registradas",
      posActions: "Acciones de PoS",
      stockActions: "Operaciones de stock",
      noStaff: "No hay acciones registradas en las fuentes permitidas.",
      noSources:
        "No hay una fuente de actividad de PoS o stock permitida para este informe.",
      limited:
        "Se muestran los primeros 50 operadores; los totales incluyen todos los operadores registrados.",
      daily: "Ventas diarias registradas (últimas 30 filas)",
      date: "Fecha",
      error: "No se pudo cargar este informe.",
      exportError: "No se pudo exportar este informe.",
      noExport: "Tu rol no tiene permiso para exportar informes.",
      generated: "Generado",
      period: "Periodo",
      previousOpening: "Stock registrado al inicio anterior",
    },
  };
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  function cents(value, currency = "EUR", locale = "en") {
    const text =
      typeof value === "number"
        ? Number.isSafeInteger(value)
          ? String(value)
          : ""
        : String(value ?? "");
    if (!/^\d+(\.\d+)?$/.test(text) || !/^[A-Z]{3}$/.test(currency)) return "—";
    const [whole, decimal = ""] = text.split(".");
    const rounded = BigInt(whole) + (decimal[0] >= "5" ? 1n : 0n);
    let parts, digits;
    try {
      if (
        typeof Intl.supportedValuesOf === "function" &&
        !Intl.supportedValuesOf("currency").includes(currency)
      )
        return "—";
      const formatter = new Intl.NumberFormat(
        locale === "es" ? "es-ES" : "en-GB",
        { style: "currency", currency },
      );
      parts = formatter.formatToParts(0);
      digits = formatter.resolvedOptions().maximumFractionDigits;
    } catch {
      return "—";
    }
    const divisor = 10n ** BigInt(digits);
    const amount =
      (rounded / divisor).toLocaleString(locale === "es" ? "es-ES" : "en-GB") +
      (digits
        ? (locale === "es" ? "," : ".") +
          String(rounded % divisor).padStart(digits, "0")
        : "");
    const symbol = parts.find((p) => p.type === "currency")?.value || currency;
    return parts.findIndex((p) => p.type === "currency") <
      parts.findIndex((p) => p.type === "integer")
      ? symbol + amount
      : amount + " " + symbol;
  }
  function validReport(value, workspace, exportMode = false) {
    if (
      !value ||
      value.schema_version !== 1 ||
      value.workspace_id !== workspace ||
      value.export !== exportMode ||
      value.sitewide_discovery_included !== false ||
      value.profitability_available !== false ||
      !value.period ||
      !value.permissions ||
      !Array.isArray(value.permissions.export_tools)
    )
      throw new Error("Invalid scoped report");
    for (const [flag, section] of [
      ["pos", "sales"],
      ["inventory", "inventory"],
      ["employees", "staff"],
    ])
      if (!value.permissions[flag] && value[section] !== null)
        throw new Error("Unexpected unlicensed report section");
    const array = (v, max) => Array.isArray(v) && v.length <= max;
    const amount = (v) => typeof v === "string" && /^\d+(\.\d+)?$/.test(v);
    const count = (v) => Number.isSafeInteger(v) && v >= 0;
    const currency = (v) => typeof v === "string" && /^[A-Z]{3}$/.test(v);
    for (const flag of ["pos", "inventory", "employees"])
      if (typeof value.permissions[flag] !== "boolean")
        throw new Error("Invalid permissions");
    if (
      value.permissions.pos &&
      (!value.sales ||
        !array(value.sales.summary, 32) ||
        !array(value.sales.daily, 5856) ||
        value.sales.daily.some(
          (row) =>
            !currency(row.currency) ||
            !amount(row.recorded_sales_cents) ||
            !count(row.completed_sales),
        ) ||
        value.sales.summary.some(
          (row) =>
            !["current", "previous"].includes(row.period) ||
            !currency(row.currency) ||
            !amount(row.recorded_sales_cents) ||
            !count(row.completed_sales) ||
            !count(row.refunded_sales) ||
            !count(row.voided_sales),
        ))
    )
      throw new Error("Incomplete sales report");
    if (
      value.permissions.inventory &&
      (!value.inventory ||
        !array(value.inventory.flows, 32) ||
        value.inventory.flows.some(
          (row) =>
            !currency(row.currency) ||
            !amount(row.known_sale_consumption_cents) ||
            !amount(row.known_waste_cents) ||
            !count(row.unknown_outflow_cost_rows),
        ) ||
        ["previous_opening", "opening", "closing"].some(
          (key) =>
            !array(value.inventory.snapshots?.[key]?.currencies, 16) ||
            value.inventory.snapshots[key].currencies.some(
              (row) =>
                !currency(row.currency) ||
                !amount(row.known_value_cents) ||
                (row.complete_value_cents !== null &&
                  !amount(row.complete_value_cents)) ||
                !count(row.unknown_cost_rows) ||
                !count(row.unrecorded_rows),
            ),
        ))
    )
      throw new Error("Incomplete inventory report");
    if (
      value.permissions.employees &&
      (!value.staff ||
        !array(value.staff.actors, 50) ||
        !array(value.staff.sources, 2) ||
        !count(value.staff.totals?.current_actions) ||
        !count(value.staff.totals?.previous_actions) ||
        !count(value.staff.active_members) ||
        value.staff.actors.some(
          (row) =>
            !count(row.current_actions) ||
            !count(row.previous_actions) ||
            !count(row.pos_actions) ||
            !count(row.inventory_actions),
        ))
    )
      throw new Error("Incomplete staff report");
    if (JSON.stringify(value).length > 1500000)
      throw new Error("Report is too large");
    return value;
  }
  function rowsTable(headers, rows) {
    return (
      '<div class="oa-scroll"><table><thead><tr>' +
      headers.map((x) => '<th scope="col">' + esc(x) + "</th>").join("") +
      "</tr></thead><tbody>" +
      rows
        .map(
          (row) =>
            "<tr>" +
            row.map((x) => "<td>" + esc(x) + "</td>").join("") +
            "</tr>",
        )
        .join("") +
      "</tbody></table></div>"
    );
  }
  function metric(label, value) {
    return (
      '<article class="oa-metric"><span>' +
      esc(label) +
      "</span><strong>" +
      esc(value) +
      "</strong></article>"
    );
  }
  function renderSales(data, t, locale) {
    const summary = data?.summary || [];
    const table = rowsTable(
      [t.period, t.currency, t.completed, t.recorded, t.refunds, t.voids],
      summary.map((row) => [
        row.period === "current" ? t.current : t.previous,
        row.currency,
        row.completed_sales,
        cents(row.recorded_sales_cents, row.currency, locale),
        row.refunded_sales,
        row.voided_sales,
      ]),
    );
    const daily = (data?.daily || []).slice(-30);
    return (
      "<h3>" +
      esc(t.sales) +
      "</h3>" +
      (summary.length ? table : "<p>" + esc(t.noSales) + "</p>") +
      "<details><summary>" +
      esc(t.daily) +
      "</summary>" +
      rowsTable(
        [t.date, t.currency, t.completed, t.recorded],
        daily.map((row) => [
          row.day,
          row.currency,
          row.completed_sales,
          cents(row.recorded_sales_cents, row.currency, locale),
        ]),
      ) +
      "</details><small>" +
      esc(t.source) +
      ": crm_pos_sales</small>"
    );
  }
  function renderInventory(data, t, locale) {
    let output = "<h3>" + esc(t.inventory) + "</h3>";
    for (const [key, label] of [
      ["previous_opening", t.previousOpening],
      ["opening", t.opening],
      ["closing", t.closing],
    ]) {
      const rows = data?.snapshots?.[key]?.currencies || [];
      output +=
        "<details " +
        (key === "closing" ? "open" : "") +
        "><summary>" +
        esc(label) +
        "</summary>" +
        (rows.length
          ? rowsTable(
              [t.currency, t.known, t.total, t.unknown, t.unrecorded],
              rows.map((row) => [
                row.currency,
                cents(row.known_value_cents, row.currency, locale),
                cents(row.complete_value_cents, row.currency, locale),
                row.unknown_cost_rows,
                row.unrecorded_rows,
              ]),
            )
          : "<p>" + esc(t.noStock) + "</p>") +
        "</details>";
    }
    const flows = data?.flows || [];
    output += flows.length
      ? rowsTable(
          [t.period, t.currency, t.consumption, t.waste, t.unknownOutflow],
          flows.map((row) => [
            row.period === "current" ? t.current : t.previous,
            row.currency,
            cents(row.known_sale_consumption_cents, row.currency, locale),
            cents(row.known_waste_cents, row.currency, locale),
            row.unknown_outflow_cost_rows,
          ]),
        )
      : "<p>" + esc(t.noFlows) + "</p>";
    return (
      output +
      "<small>" +
      esc(t.source) +
      ": crm_inventory_value_events</small>"
    );
  }
  function renderStaff(data, t) {
    const actors = data?.actors || [];
    return (
      "<h3>" +
      esc(t.employees) +
      "</h3><p>" +
      esc(t.staffNote) +
      '</p><div class="oa-metrics">' +
      metric(t.activeMembers, data.active_members) +
      metric(
        t.current + " · " + t.actions,
        data.sources.length ? data.totals.current_actions : "—",
      ) +
      metric(
        t.previous + " · " + t.actions,
        data.sources.length ? data.totals.previous_actions : "—",
      ) +
      "</div>" +
      (actors.length
        ? rowsTable(
            [t.member, t.current, t.previous, t.posActions, t.stockActions],
            actors.map((row) => [
              row.display_name || t.member,
              row.current_actions,
              row.previous_actions,
              row.pos_actions,
              row.inventory_actions,
            ]),
          )
        : "<p>" + esc(data.sources.length ? t.noStaff : t.noSources) + "</p>") +
      (data.actors_truncated ? "<p>" + esc(t.limited) + "</p>" : "")
    );
  }
  function render(state, scope) {
    const locale = scope.locale === "es" ? "es" : "en",
      t = copy[locale],
      data = state.data;
    const managementUrl =
      typeof globalThis.AkiSuiteNavigation?.href === "function"
        ? globalThis.AkiSuiteNavigation.href("hq", locale)
        : `https://akihq.app/${locale}/business`;
    const head =
      '<header class="oa-header"><div><span class="analytics-eyebrow">AkiPulse · AkiBusiness</span><h2>' +
      esc(t.title) +
      "</h2><p>" +
      esc(scope.name || scope.workspace) +
      "</p><p>" +
      esc(t.intro) +
      '</p></div><a class="action-btn" href="' +
      esc(managementUrl) +
      '">' +
      esc(t.hq) +
      "</a></header>";
    const filters =
      '<div class="oa-controls"><label>' +
      esc(t.range) +
      '<select data-change="operational-analytics-days">' +
      [7, 30, 90, 365]
        .map(
          (day) =>
            '<option value="' +
            day +
            '" ' +
            (Number(scope.days) === day ? "selected" : "") +
            ">" +
            day +
            " " +
            esc(t.days) +
            "</option>",
        )
        .join("") +
      "</select></label><label>" +
      esc(t.through) +
      '<input type="date" value="' +
      esc(scope.through || "") +
      '" data-change="operational-analytics-through"></label><button class="action-btn" data-action="refresh-analytics" ' +
      (state.loading ? "disabled" : "") +
      ">" +
      esc(t.refresh) +
      '</button><button class="action-btn" data-action="operational-analytics-export" ' +
      (!data?.permissions?.export_tools?.length || state.exporting
        ? "disabled"
        : "") +
      ">" +
      esc(t.export) +
      "</button></div>";
    if (!scope.enabled)
      return (
        '<section class="panel oa-workspace">' +
        head +
        "<p>" +
        esc(t.staged) +
        "</p></section>"
      );
    if (state.error || !data)
      return (
        '<section class="panel oa-workspace">' +
        head +
        filters +
        '<p role="status">' +
        esc(state.loading ? t.loading : state.error ? t.unavailable : t.empty) +
        "</p></section>"
      );
    const tabs =
      '<nav class="oa-tabs" aria-label="' +
      esc(t.title) +
      '">' +
      [
        ["sales", "pos"],
        ["inventory", "inventory"],
        ["employees", "employees"],
      ]
        .map(
          ([tab, flag]) =>
            '<button class="action-btn ' +
            (state.section === tab ? "primary" : "") +
            '" data-action="operational-analytics-tab" data-tab="' +
            tab +
            '" aria-pressed="' +
            (state.section === tab) +
            '">' +
            esc(t[tab]) +
            (!data.permissions[flag] ? " · 🔒" : "") +
            "</button>",
        )
        .join("") +
      "</nav>";
    let detail;
    if (state.section === "inventory")
      detail = data.inventory
        ? renderInventory(data.inventory, t, locale)
        : "<p>" + esc(t.locked) + "</p>";
    else if (state.section === "employees")
      detail = data.staff
        ? renderStaff(data.staff, t)
        : "<p>" + esc(t.locked) + "</p>";
    else
      detail = data.sales
        ? renderSales(data.sales, t, locale)
        : "<p>" + esc(t.locked) + "</p>";
    return (
      '<section class="panel oa-workspace">' +
      head +
      filters +
      '<p class="oa-period">' +
      esc(data.period.from_date) +
      " — " +
      esc(data.period.through_date) +
      " · " +
      esc(data.timezone) +
      "<br>" +
      esc(t.previous) +
      ": " +
      esc(data.period.previous_from_date) +
      " — " +
      esc(data.period.previous_through_date) +
      "</p>" +
      (data.period.partial
        ? '<p role="status">' + esc(t.partial) + "</p>"
        : "") +
      tabs +
      '<div class="oa-detail" tabindex="0">' +
      detail +
      "</div><footer><small>" +
      esc(t.noProfit) +
      "</small><small>" +
      esc(t.generated) +
      ": " +
      esc(data.generated_at) +
      "</small></footer></section>"
    );
  }
  function create(options) {
    let version = 0,
      resolvedKey = "";
    const state = {
      data: null,
      error: "",
      loading: false,
      exporting: false,
      section: "sales",
    };
    const scope = () => options.getScope();
    const key = (s) =>
      String(s.user) +
      ":" +
      String(s.workspace) +
      ":" +
      String(s.days) +
      ":" +
      String(s.through || "") +
      ":" +
      String(s.enabled === true);
    function reset() {
      version++;
      resolvedKey = "";
      state.data = null;
      state.error = "";
      state.loading = false;
      state.exporting = false;
    }
    async function load() {
      const target = scope(),
        at = ++version;
      state.data = null;
      state.error = "";
      state.exporting = false;
      state.loading = true;
      options.changed();
      if (!target.enabled) {
        state.loading = false;
        options.changed();
        return;
      }
      try {
        const client = options.client();
        if (!client || !target.user || !target.workspace)
          throw new Error("Sign in required");
        const result = await client.rpc("crm_operational_analytics", {
          p_workspace: target.workspace,
          p_days: Number(target.days),
          p_through: target.through || null,
          p_export: false,
        });
        if (result.error) throw result.error;
        const data = validReport(result.data, target.workspace);
        if (at !== version || key(scope()) !== key(target)) return;
        state.data = data;
        resolvedKey = key(target);
      } catch (error) {
        if (at === version && key(scope()) === key(target)) {
          state.error = copy[target.locale === "es" ? "es" : "en"].error;
          state.data = null;
        }
      } finally {
        if (at === version && key(scope()) === key(target)) {
          state.loading = false;
          options.changed();
        }
      }
    }
    async function exportReport() {
      const target = scope(),
        at = version,
        t = copy[target.locale === "es" ? "es" : "en"];
      if (!target.enabled || !state.data?.permissions?.export_tools?.length)
        throw new Error(t.noExport);
      state.exporting = true;
      options.changed();
      try {
        const result = await options.client().rpc("crm_operational_analytics", {
          p_workspace: target.workspace,
          p_days: Number(target.days),
          p_through: target.through || null,
          p_export: true,
        });
        if (result.error) throw result.error;
        const data = validReport(result.data, target.workspace, true);
        if (at !== version || key(scope()) !== key(target)) return;
        options.download(
          "akibusiness-operational-report-" +
            data.period.through_date +
            ".json",
          JSON.stringify(data, null, 2),
          "application/json",
        );
      } catch (error) {
        if (at === version && key(scope()) === key(target)) {
          state.data = null;
          state.error = t.exportError;
        }
        throw error;
      } finally {
        if (at === version && key(scope()) === key(target)) {
          state.exporting = false;
          options.changed();
        }
      }
    }
    return {
      load,
      reset,
      exportReport,
      render: () =>
        render(
          state.data && resolvedKey !== key(scope())
            ? { ...state, data: null, error: "", loading: false }
            : state,
          scope(),
        ),
      section: (value) => {
        if (["sales", "inventory", "employees"].includes(value)) {
          state.section = value;
          options.changed();
        }
      },
      state,
    };
  }
  return { create, render, validReport, cents };
});
