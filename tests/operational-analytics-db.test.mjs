import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const entry = process.env.PGLITE_MODULE
  ? pathToFileURL(resolve(process.env.PGLITE_MODULE)).href
  : new URL(
      "../cloudflare/node_modules/@electric-sql/pglite/dist/index.js",
      import.meta.url,
    ).href;
const { PGlite } = await import(entry);
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001",
  worker = "00000000-0000-4000-8000-000000000002",
  outsider = "00000000-0000-4000-8000-000000000003";
const item = "10000000-0000-4000-8000-000000000001",
  unknown = "10000000-0000-4000-8000-000000000002",
  untracked = "10000000-0000-4000-8000-000000000003",
  location = "20000000-0000-4000-8000-000000000001";
const migration = await readFile(
  new URL(
    "../supabase/migrations/20261020173202_operational_analytics.sql",
    import.meta.url,
  ),
  "utf8",
);
const valuationSource = await readFile(
  new URL(
    "../supabase/migrations/20260923001331_inventory_operations.sql",
    import.meta.url,
  ),
  "utf8",
);
const valuation = valuationSource.slice(
  valuationSource.indexOf("create function public.crm_inventory_valuation("),
  valuationSource.indexOf("revoke all on function akihq_inventory.ensure_item"),
);
before(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema akihq_security;create schema akihq_hospitality;
 grant usage on schema public,auth,akihq_security to authenticated,anon;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.profiles(id uuid primary key,display_name text);
 create table public.crm_workspaces(id text primary key,currency text default 'EUR',status text default 'active',timezone text default 'Europe/Madrid');
 create table public.crm_workspace_members(workspace_id text,profile_id uuid,status text default 'active',role text default 'staff');
 create table public.test_tools(workspace_id text,profile_id uuid,tool_key text,active boolean default true);
 create table public.test_entitlements(workspace_id text,tool_key text,active boolean default true);
 create function public.crm_can_access_workspace(w text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.crm_workspace_members where workspace_id=w and profile_id=auth.uid() and status='active')$$;
 create function public.crm_has_tool(w text,t text) returns boolean language sql stable security definer set search_path='' as $$select public.crm_can_access_workspace(w) and exists(select 1 from public.test_tools where workspace_id=w and profile_id=auth.uid() and tool_key=t and active) and exists(select 1 from public.test_entitlements where workspace_id=w and tool_key=t and active)$$;
 create function akihq_security.can_tool(w text,t text) returns boolean language sql stable security definer set search_path='' as $$select public.crm_has_tool(w,t)$$;
 create function akihq_security.can_export(w text,t text) returns boolean language sql stable security definer set search_path='' as $$select public.crm_has_tool(w,t) and exists(select 1 from public.crm_workspace_members where workspace_id=w and profile_id=auth.uid() and status='active' and role='owner')$$;
 create table public.crm_pos_sales(id uuid default gen_random_uuid(),workspace_id text,status text,total_cents integer,currency text default 'EUR',sold_at timestamptz);
 create table public.crm_inventory_items(id uuid primary key,workspace_id text,sku text,name text,unit text default 'unit');
 create table public.crm_inventory_value_events(id bigint generated always as identity primary key,workspace_id text,item_id uuid,location_id uuid,event_type text,quantity_delta numeric,quantity_after numeric,value_delta_cents numeric,carrying_value_cents numeric,currency text,sku text,item_name text,unit text,actor_id uuid,recorded_at timestamptz);
 create table public.crm_inventory_operations(id uuid default gen_random_uuid(),workspace_id text,actor_id uuid,operation_type text,recorded_at timestamptz);
 create table akihq_hospitality.events(id bigint generated always as identity,workspace_id text,actor uuid,action text,created_at timestamptz);
 alter table public.crm_pos_sales enable row level security;alter table public.crm_inventory_items enable row level security;alter table public.crm_inventory_value_events enable row level security;alter table public.crm_inventory_operations enable row level security;alter table akihq_hospitality.events enable row level security;
 revoke all on all tables in schema public,akihq_hospitality from public,authenticated,anon;`);
  await db.exec(valuation);
  await db.exec(migration);
}, 30000);
after(() => db.close());
beforeEach(async () => {
  await db.exec(
    "reset role;truncate public.profiles,public.crm_workspaces,public.crm_workspace_members,public.test_tools,public.test_entitlements,public.crm_pos_sales,public.crm_inventory_items,public.crm_inventory_value_events,public.crm_inventory_operations,akihq_hospitality.events;",
  );
  await db.exec(`insert into public.profiles values('${owner}','Owner'),('${worker}','<script>Worker</script>'),('${outsider}','Private other tenant');
 insert into public.crm_workspaces(id) values('one'),('other');
 insert into public.crm_workspace_members(workspace_id,profile_id,role) values('one','${owner}','owner'),('one','${worker}','staff'),('other','${outsider}','owner');
 insert into public.test_entitlements(workspace_id,tool_key) select w,t from unnest(array['one','other']) w cross join unnest(array['pos','inventory','employees']) t;
 insert into public.test_tools(workspace_id,profile_id,tool_key) select 'one','${owner}',t from unnest(array['pos','inventory','employees']) t;
 insert into public.test_tools(workspace_id,profile_id,tool_key) values('one','${worker}','pos'),('other','${outsider}','pos');
 insert into public.crm_pos_sales(workspace_id,status,total_cents,currency,sold_at) values
 ('one','completed',1000,'EUR','2026-03-29T00:00:00Z'),('one','completed',2000,'EUR','2026-03-28T22:59:59Z'),
 ('one','completed',9999,'EUR','2026-03-29T22:00:00Z'),('one','refunded',5000,'EUR','2026-03-29T01:00:00Z'),
 ('one','voided',6000,'EUR','2026-03-29T02:00:00Z'),('one','completed',3000,'USD','2026-03-29T03:00:00Z'),
 ('other','completed',999999,'EUR','2026-03-29T01:00:00Z');
 insert into public.crm_inventory_items(id,workspace_id,sku,name) values('${item}','one','A','Coffee'),('${unknown}','one','B','Legacy stock'),('${untracked}','one','C','Untracked');
 insert into public.crm_inventory_value_events(workspace_id,item_id,location_id,event_type,quantity_delta,quantity_after,value_delta_cents,carrying_value_cents,currency,sku,item_name,unit,actor_id,recorded_at) values
 ('one','${item}','${location}','receive',10,10,1000,1000,'EUR','A','Coffee','unit','${owner}','2026-03-28T12:00:00Z'),
 ('one','${unknown}','${location}','opening',2,2,null,null,'EUR','B','Legacy stock','unit','${owner}','2026-03-28T12:00:00Z'),
 ('one','${item}','${location}','sale',-2,8,-200,800,'EUR','A','Coffee','unit','${worker}','2026-03-29T01:00:00Z'),
 ('one','${unknown}','${location}','waste',-1,1,null,null,'EUR','B','Legacy stock','unit','${owner}','2026-03-29T02:00:00Z');
 insert into akihq_hospitality.events(workspace_id,actor,action,created_at) values('one','${worker}','payment','2026-03-29T01:00:00Z'),('one','${owner}','open','2026-03-28T12:00:00Z'),('other','${outsider}','payment','2026-03-29T01:00:00Z');
 insert into public.crm_inventory_operations(workspace_id,actor_id,operation_type,recorded_at) values('one','${owner}','waste','2026-03-29T02:00:00Z');`);
});
async function as(user, sql, role = "authenticated") {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('test.uid',$1,false)", [user]);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
async function report(
  user = owner,
  extra = "1,'2026-03-29',false",
  workspace = "one",
) {
  return (
    await as(
      user,
      `select public.crm_operational_analytics('${workspace}',${extra}) as report`,
    )
  ).rows[0].report;
}
test("anonymous and cross-location/removed membership are denied by server", async () => {
  await assert.rejects(
    as("", "select public.crm_operational_analytics('one')", "anon"),
    /permission denied/,
  );
  await assert.rejects(report(outsider), /Active location membership/);
  await db.exec(
    `update public.crm_workspace_members set status='removed' where profile_id='${owner}'`,
  );
  await assert.rejects(report(), /Active location membership/);
});
test("completed sales use their own location, currency and half-open local DST boundaries", async () => {
  const r = await report();
  assert.equal(r.period.from_at, "2026-03-28T23:00:00+00:00");
  assert.equal(r.period.until_at, "2026-03-29T22:00:00+00:00");
  assert.equal(
    new Date(r.period.until_at) - new Date(r.period.from_at),
    23 * 3600000,
  );
  const eur = r.sales.summary.find(
    (row) => row.currency === "EUR" && row.period === "current",
  );
  assert.deepEqual(eur, {
    currency: "EUR",
    period: "current",
    completed_sales: 1,
    recorded_sales_cents: "1000",
    refunded_sales: 1,
    voided_sales: 1,
  });
  assert.equal(
    r.sales.summary.find(
      (row) => row.currency === "EUR" && row.period === "previous",
    ).recorded_sales_cents,
    "2000",
  );
  assert.equal(
    r.sales.summary.find((row) => row.currency === "USD").recorded_sales_cents,
    "3000",
  );
  assert.equal(r.sitewide_discovery_included, false);
  assert.equal(r.profitability_available, false);
});
test("inventory reuses actual historical valuation and preserves unknown costs and pretracking quantities", async () => {
  const r = await report();
  const opening = r.inventory.snapshots.opening.currencies[0],
    closing = r.inventory.snapshots.closing.currencies[0];
  assert.equal(opening.known_value_cents, "1000");
  assert.equal(closing.known_value_cents, "800");
  assert.equal(closing.complete_value_cents, null);
  assert.equal(closing.unknown_cost_rows, 1);
  assert.equal(closing.unrecorded_rows, 1);
  const flow = r.inventory.flows.find((row) => row.period === "current");
  assert.equal(flow.known_sale_consumption_cents, "200");
  assert.equal(flow.unknown_outflow_cost_rows, 1);
  assert.equal(flow.known_waste_cents, "0");
});
test("PoS-only permission cannot expose stock cost or staff identity, including direct RPC and export", async () => {
  const r = await report(worker);
  assert.ok(r.sales);
  assert.equal(r.inventory, null);
  assert.equal(r.staff, null);
  assert.deepEqual(r.permissions.export_tools, []);
  assert.ok(!JSON.stringify(r).includes("Legacy stock"));
  assert.ok(!JSON.stringify(r).includes(worker));
  await assert.rejects(
    report(worker, "1,'2026-03-29',true"),
    /export permission/,
  );
  await assert.rejects(
    as(worker, "select * from akihq_hospitality.events"),
    /permission denied/,
  );
});
test("employees report intersects accessible source tools, has no sitewide/private other-tenant activity", async () => {
  await db.exec(
    `insert into public.test_tools(workspace_id,profile_id,tool_key) values('one','${worker}','employees')`,
  );
  const r = await report(worker);
  assert.deepEqual(r.staff.sources, ["pos"]);
  assert.equal(r.staff.totals.current_actions, 1);
  assert.equal(
    r.staff.actors.find((a) => a.actor_id === worker).inventory_actions,
    0,
  );
  assert.ok(!JSON.stringify(r).includes("Private other tenant"));
});
test("immediate role and active-tool revocation removes sections on the next RPC", async () => {
  await db.exec(
    "update public.test_entitlements set active=false where workspace_id='one' and tool_key='inventory'",
  );
  let r = await report();
  assert.equal(r.inventory, null);
  assert.deepEqual(r.staff.sources, ["pos"]);
  await db.exec(
    `update public.test_tools set active=false where workspace_id='one' and profile_id='${owner}' and tool_key='pos'`,
  );
  r = await report();
  assert.equal(r.sales, null);
  assert.equal(r.staff.totals.current_actions, 0);
  assert.deepEqual(r.staff.sources, []);
});
test("export recalculates permissions and returns one bounded aggregate snapshot", async () => {
  const r = await report(owner, "1,'2026-03-29',true");
  assert.equal(r.export, true);
  assert.deepEqual(r.permissions.export_tools, [
    "pos",
    "inventory",
    "employees",
  ]);
  assert.equal(r.sales.summary.length, 3);
  assert.ok(!JSON.stringify(r).includes("external_id"));
});
test("empty recorded activity is explicit and unknown inventory is never reported as profit", async () => {
  const r = await report(owner, "7,'2026-04-20',false");
  assert.deepEqual(r.sales.summary, []);
  assert.deepEqual(r.staff.actors, []);
  assert.equal(r.staff.totals.current_actions, 0);
  assert.equal(r.inventory.profitability_available, false);
});
test("range, future and timezone errors fail closed instead of returning zeros", async () => {
  await assert.rejects(report(owner, "367,'2026-03-29',false"), /1 to 366/);
  await assert.rejects(report(owner, "0,'2026-03-29',false"), /1 to 366/);
  await assert.rejects(
    report(owner, "7,(now()::date+2),false"),
    /recorded date/,
  );
  await db.exec(
    "update public.crm_workspaces set timezone='Invalid/Timezone' where id='one'",
  );
  await assert.rejects(report(), /timezone must be corrected/);
});
test("current-day reports disclose partial periods and default reports use complete local days", async () => {
  const r = await report(owner, "7,null,false");
  assert.equal(r.period.partial, false);
  assert.equal(r.period.days, 7);
  const current = await report(
    owner,
    "1,(now() at time zone 'Europe/Madrid')::date,false",
  );
  assert.equal(current.period.partial, true);
});
test("private helper and public wrapper have explicit grants and an empty search path", async () => {
  const f = (
    await db.query(
      "select prosecdef,proconfig from pg_proc where proname='operational_analytics'",
    )
  ).rows[0];
  assert.equal(f.prosecdef, true);
  assert.deepEqual(f.proconfig, ['search_path=""']);
  assert.match(migration, /security invoker/);
  assert.match(
    migration,
    /revoke all on function public.crm_operational_analytics/,
  );
  assert.doesNotMatch(migration, /grant select on.*akihq_hospitality/i);
});

test("autumn DST, leap day and month-end comparisons retain actual calendar boundaries", async () => {
  const autumn = await report(owner, "1,'2025-10-26',false");
  assert.equal(
    new Date(autumn.period.until_at) - new Date(autumn.period.from_at),
    25 * 3600000,
  );
  const leap = await report(owner, "1,'2024-02-29',false");
  assert.equal(leap.period.from_date, "2024-02-29");
  assert.equal(leap.period.previous_through_date, "2024-02-28");
  const month = await report(owner, "30,'2026-03-31',false");
  assert.equal(month.period.from_date, "2026-03-02");
  assert.equal(month.period.previous_from_date, "2026-01-31");
});
test("staff rows are bounded without truncating aggregate action totals", async () => {
  await db.exec(
    "insert into akihq_hospitality.events(workspace_id,actor,action,created_at) select 'one',('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'open','2026-03-29T01:00:00Z'::timestamptz from generate_series(100,151) i",
  );
  const r = await report();
  assert.equal(r.staff.actors.length, 50);
  assert.equal(r.staff.actors_truncated, true);
  assert.equal(r.staff.totals.current_actions, 54);
});
test("currency fanout fails explicitly before a report can exceed its bounded shape", async () => {
  await db.exec(
    "insert into public.crm_pos_sales(workspace_id,status,total_cents,currency,sold_at) select 'one','completed',10,'AA'||chr(65+i),'2026-03-29T01:00:00Z'::timestamptz from generate_series(0,16) i",
  );
  await assert.rejects(report(), /Too many historical currencies/);
});
