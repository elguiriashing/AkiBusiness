import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const api = require("../assets/operational-analytics.js");
const scope = {
  workspace: "one",
  name: "Test location",
  user: "owner",
  locale: "en",
  days: 30,
  through: "",
  enabled: true,
};
function report(workspace = "one", exportMode = false) {
  return {
    schema_version: 1,
    workspace_id: workspace,
    timezone: "Europe/Madrid",
    generated_at: "2026-10-20T12:00:00Z",
    period: {
      from_date: "2026-09-20",
      through_date: "2026-10-19",
      previous_from_date: "2026-08-21",
      previous_through_date: "2026-09-19",
      days: 30,
      partial: false,
    },
    permissions: {
      pos: true,
      inventory: false,
      employees: false,
      export_tools: ["pos"],
    },
    sales: {
      summary: [
        {
          period: "current",
          currency: "EUR",
          completed_sales: 1,
          recorded_sales_cents: "1000",
          refunded_sales: 0,
          voided_sales: 0,
        },
      ],
      daily: [],
    },
    inventory: null,
    staff: null,
    export: exportMode,
    sitewide_discovery_included: false,
    profitability_available: false,
  };
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
test("money rendering preserves integer precision, fractional-cent rounding and explicit unknown values", () => {
  assert.equal(
    api.cents("123456789012345678900", "EUR", "en"),
    "€1,234,567,890,123,456,789.00",
  );
  assert.equal(api.cents("123.500000", "EUR", "en"), "€1.24");
  assert.equal(api.cents(null, "EUR", "es"), "—");
  assert.equal(api.cents(9007199254740992, "EUR", "en"), "—");
  assert.equal(api.cents("1000", "EUR", "es"), "10,00 €");
  assert.match(api.cents("1000", "JPY", "en"), /1,000$/);
  assert.match(api.cents("1000", "BHD", "en"), /1\.000$/);
  assert.equal(api.cents("1000", "AAA", "en"), "—");
});
test("scoped validation rejects cross-location, malformed, unlicensed and truncated-looking records", () => {
  assert.throws(
    () => api.validReport(report("other"), "one"),
    /Invalid scoped/,
  );
  const extra = report();
  extra.inventory = { private: "cost" };
  assert.throws(() => api.validReport(extra, "one"), /unlicensed/);
  const missing = report();
  delete missing.sales.summary[0].recorded_sales_cents;
  assert.throws(() => api.validReport(missing, "one"), /Incomplete sales/);
  const currency = report();
  delete currency.sales.summary[0].currency;
  assert.throws(() => api.validReport(currency, "one"), /Incomplete sales/);
});
test("EN and ES show exact recorded figures, permission locks and no profitability claims", () => {
  for (const locale of ["en", "es"]) {
    const state = {
      data: report(),
      error: "",
      loading: false,
      section: "sales",
    };
    const html = api.render(state, { ...scope, locale });
    assert.match(
      html,
      locale === "es" ? /Ventas registradas/ : /Recorded sales/,
    );
    assert.match(html, locale === "es" ? /10,00 €/ : /€10\.00/);
    assert.match(html, locale === "es" ? /no beneficios/ : /not profit/);
    state.section = "inventory";
    assert.match(
      api.render(state, { ...scope, locale }),
      locale === "es" ? /herramienta activa/ : /active toolbox tool/,
    );
  }
});
test("unknown inventory totals render unknown while known subtotal and coverage remain explicit", () => {
  const data = report();
  data.permissions.inventory = true;
  data.inventory = { flows: [], snapshots: {} };
  for (const key of ["previous_opening", "opening", "closing"])
    data.inventory.snapshots[key] = {
      currencies: [
        {
          currency: "EUR",
          known_value_cents: "800.123456",
          complete_value_cents: null,
          unknown_cost_rows: 1,
          unrecorded_rows: 2,
        },
      ],
    };
  api.validReport(data, "one");
  const html = api.render(
    { data, section: "inventory" },
    { ...scope, locale: "en" },
  );
  assert.match(html, /Known carrying value/);
  assert.match(html, /€8\.00/);
  assert.match(html, />—<\/td>/);
  assert.doesNotMatch(html, /Profit margin|Gross profit/);
});
test("staff names are escaped and employee-only report without permitted action sources withholds action figures", () => {
  const data = report();
  data.permissions.employees = true;
  data.staff = {
    sources: ["pos"],
    active_members: 2,
    totals: { current_actions: 1, previous_actions: 0 },
    actors: [
      {
        display_name: "<script>private</script>",
        current_actions: 1,
        previous_actions: 0,
        pos_actions: 1,
        inventory_actions: 0,
      },
    ],
  };
  let html = api.render({ data, section: "employees" }, scope);
  assert.ok(!html.includes("<script>private"));
  assert.match(html, /&lt;script&gt;/);
  data.staff.sources = [];
  data.staff.actors = [];
  html = api.render({ data, section: "employees" }, scope);
  assert.match(html, /No PoS or stock activity source/);
  assert.match(html, /<strong>—<\/strong>/);
});
test("load failure never falls back to local cached sales or fabricated zero metrics", async () => {
  const controller = api.create({
    getScope: () => scope,
    client: () => ({
      rpc: async () => ({ data: null, error: { code: "42501" } }),
    }),
    changed() {},
    download() {
      throw Error("No download");
    },
  });
  await controller.load();
  assert.equal(controller.state.data, null);
  assert.match(controller.render(), /Report unavailable/);
  assert.doesNotMatch(controller.render(), /€0\.00/);
});
test("late responses cannot overwrite a newer location, and scope changes hide old figures immediately", async () => {
  let current = { ...scope };
  const first = deferred(),
    second = deferred();
  let calls = 0;
  const controller = api.create({
    getScope: () => current,
    client: () => ({
      rpc: () => (++calls === 1 ? first.promise : second.promise),
    }),
    changed() {},
    download() {},
  });
  const one = controller.load();
  current = { ...scope, workspace: "two", name: "Other location" };
  const two = controller.load();
  second.resolve({ data: report("two"), error: null });
  await two;
  first.resolve({ data: report("one"), error: null });
  await one;
  assert.equal(controller.state.data.workspace_id, "two");
  current = { ...current, user: "other-user" };
  assert.doesNotMatch(controller.render(), /€10\.00/);
});
test("exports recheck backend permission instead of exporting the displayed cache, and stale results are discarded", async () => {
  let current = { ...scope };
  const pending = deferred();
  let calls = 0,
    downloads = [];
  const client = {
    rpc: async (name, args) => {
      calls++;
      assert.equal(name, "crm_operational_analytics");
      return args.p_export ? pending.promise : { data: report(), error: null };
    },
  };
  const controller = api.create({
    getScope: () => current,
    client: () => client,
    changed() {},
    download: (...args) => downloads.push(args),
  });
  await controller.load();
  const exported = controller.exportReport();
  await tick();
  assert.equal(calls, 2);
  current = { ...scope, workspace: "two" };
  controller.reset();
  pending.resolve({ data: report("one", true), error: null });
  await exported;
  assert.equal(downloads.length, 0);
});
test("successful JSON export retains source precision and denial invalidates displayed stale access", async () => {
  let deny = false,
    downloaded;
  const controller = api.create({
    getScope: () => scope,
    client: () => ({
      rpc: async (name, args) =>
        args.p_export
          ? deny
            ? { error: { code: "42501" } }
            : { data: report("one", true), error: null }
          : { data: report(), error: null },
    }),
    changed() {},
    download: (...args) => {
      downloaded = args;
    },
  });
  await controller.load();
  await controller.exportReport();
  assert.equal(downloaded[2], "application/json");
  assert.equal(JSON.parse(downloaded[1]).export, true);
  deny = true;
  await assert.rejects(controller.exportReport());
  assert.equal(controller.state.data, null);
});
test("feature defaults off without an RPC or fallback zero", async () => {
  let calls = 0;
  const controller = api.create({
    getScope: () => ({ ...scope, enabled: false }),
    client: () => ({
      rpc: async () => {
        calls++;
      },
    }),
    changed() {},
    download() {},
  });
  await controller.load();
  assert.equal(calls, 0);
  assert.match(controller.render(), /being prepared/);
});
test("app analytics entry loads owner/staff operational RPC while preserving platform-only administration", async () => {
  const source = await readFile(
    new URL("../assets/app-v32.js", import.meta.url),
    "utf8",
  );
  const block = source.slice(
    source.indexOf("  let operationalReportController = null;"),
    source.indexOf("  async function searchAnalyticsUsers()"),
  );
  const calls = [];
  const context = {
    window: {
      AKIHQ_CONFIG: { OPERATIONAL_ANALYTICS_ENABLED: true },
      AkiBusinessOperationalAnalytics: api,
    },
    state: {
      workspace: { id: "one", name: "One" },
      settings: { locale: "es" },
    },
    authUser: { id: "staff" },
    authRole: "consumer",
    ui: { route: "analytics", analyticsRange: "30" },
    isPlatformWorkspace: () => false,
    getSupabaseClient: () => ({
      rpc: async (name, args) => {
        calls.push({ name, args });
        return { data: report(), error: null };
      },
    }),
    render() {},
    downloadBlob() {},
    toast() {},
    console,
  };
  await vm.runInNewContext(block + "\nloadAnalyticsOverview(false)", context);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "crm_operational_analytics");
  assert.equal(calls[0].args.p_workspace, "one");
  context.isPlatformWorkspace = () => true;
  await vm.runInNewContext("loadAnalyticsOverview(false)", context);
  assert.equal(calls.length, 1);
});
test("production source includes both report assets without changing release transform sentinels", async () => {
  const html = await readFile(
      new URL("../login.html", import.meta.url),
      "utf8",
    ),
    sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  for (const name of [
    "operational-analytics.js?v=1",
    "operational-analytics.css?v=1",
  ]) {
    assert.ok(html.includes(name));
    assert.ok(sw.includes(name));
  }
  const config = await readFile(
    new URL("../config.js", import.meta.url),
    "utf8",
  );
  assert.match(config, /OPERATIONAL_ANALYTICS_ENABLED: true/);
});

test("management handoff uses the canonical locale contract and preserves referral context when installed", () => {
  for (const locale of ["en", "es"])
    assert.match(
      api.render({ data: report(), section: "sales" }, { ...scope, locale }),
      new RegExp(`https://akihq.app/${locale}/business`),
    );
  globalThis.AkiSuiteNavigation = {
    href: (product, locale) =>
      `https://akihq.app/${locale}/business?ref=AKIREFER01`,
  };
  try {
    assert.match(
      api.render({ data: report(), section: "sales" }, scope),
      /ref=AKIREFER01/,
    );
  } finally {
    delete globalThis.AkiSuiteNavigation;
  }
});
