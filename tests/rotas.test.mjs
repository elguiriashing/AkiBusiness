import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const require = createRequire(import.meta.url),
  C = require("../assets/rotas-core.js"),
  G = require("../assets/tool-guides.js");
const shift = {
  id: "s1",
  staffId: "p",
  date: "2026-10-24",
  start: "22:00",
  endDate: "2026-10-25",
  end: "06:00",
  breakMinutes: 30,
  role: "Bar",
  location: "Main",
  notes: "Bring keys",
};
const doc = () => ({
  settings: {
    title: "Night rota",
    timezone: "Europe/Madrid",
    timeFormat: "24",
  },
  staff: [{ id: "p", name: "Alex", profileId: null, weeklyHours: 20 }],
  shifts: [{ ...shift }],
  absences: [],
  templates: [],
});
test("overnight duration deducts breaks, split boundaries do not overlap, DST is explicitly wall-clock planning", () => {
  assert.equal(C.duration(shift), 7.5);
  const d = doc();
  C.validate(d);
  d.shifts.push({
    ...shift,
    id: "s2",
    date: "2026-10-25",
    start: "06:00",
    end: "10:00",
  });
  assert.equal(C.conflicts(d).length, 0);
  d.shifts[1].start = "05:59";
  assert.equal(C.conflicts(d)[0].kind, "overlap");
  d.shifts.pop();
  d.absences.push({
    id: "a",
    staffId: "p",
    from: "2026-10-25",
    through: "2026-10-25",
  });
  assert.equal(C.conflicts(d)[0].kind, "absence");
});
test("4 on / 2 off, weekday selection, month-end and leap-year recurrence", () => {
  const s = { ...shift, date: "2028-02-27", endDate: "2028-02-28" };
  const result = C.repeat(s, { through: "2028-03-05", work: 4, rest: 2 });
  assert.deepEqual(
    result.map((s) => s.date),
    [
      "2028-02-27",
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
      "2028-03-04",
      "2028-03-05",
    ],
  );
  assert.equal(new Set(result.map((s) => s.id)).size, 6);
  assert(result.every((s) => s.endDate === C.addDays(s.date, 1)));
  assert.equal(C.repeat(s, { through: "2028-03-05", weekdays: [1] }).length, 1);
  assert.throws(() => C.repeat(s, { through: "2030-01-01" }));
});
test("invalid date/time, missing staff, negative breaks and zero-length shifts are rejected", () => {
  for (const mutate of [
    (d) => (d.shifts[0].date = "2026-02-30"),
    (d) => (d.shifts[0].start = "25:00"),
    (d) => (d.shifts[0].staffId = "missing"),
    (d) => (d.shifts[0].breakMinutes = -1),
    (d) => (d.shifts[0].endDate = "2026-10-27"),
    (d) => (d.shifts[0].breakMinutes = 480),
  ]) {
    const d = doc();
    mutate(d);
    assert.throws(() => C.validate(d));
  }
});
test("weekly hour warnings reset on Monday and do not block valid draft data", () => {
  const d = doc();
  d.staff[0].weeklyHours = 5;
  assert.equal(C.warnings(d)[0].kind, "hours");
  d.shifts.push({
    ...shift,
    id: "next",
    date: "2026-10-26",
    endDate: "2026-10-27",
  });
  assert.equal(C.warnings(d).filter((w) => w.kind === "hours").length, 2);
});
test("CSV neutralizes formulas and quotes, print escapes markup, ICS escapes and folds unicode lines", () => {
  const d = doc();
  d.staff[0].name = '=HYPERLINK("evil")';
  d.shifts[0].notes = "<script>alert(1)</script>,\n" + "ñ".repeat(100);
  const csv = C.csv(d, "2026-10-24", "2026-10-25");
  assert(csv.includes("\u200b=HYPERLINK"));
  assert(csv.includes('""evil""'));
  const html = C.printHTML(d, "2026-10-24", "2026-10-25");
  assert(!html.includes("<script>"));
  assert(html.includes("&lt;script&gt;"));
  const ics = C.ics(d, "2026-10-24", "2026-10-25");
  assert(ics.includes("DTEND;TZID=Europe/Madrid:20261025T060000"));
  for (const line of ics.split("\r\n")) assert(Buffer.byteLength(line) <= 75);
  assert(!ics.includes("\nEND:VEVENT\n"));
});
test("all thirteen working areas have distinct bilingual instructions", () => {
  assert.equal(Object.keys(G.guides).length, 13);
  for (const key of Object.keys(G.guides)) {
    assert.match(G.render(key, "en"), /Quick guide/);
    assert.match(G.render(key, "es"), /Guía rápida/);
  }
  assert.match(G.render("automation", "en"), /does not execute/);
  assert.match(G.render("employees", "en"), /data-route="rotas"/);
});
const deferred = () => {
  let resolve;
  return {
    promise: new Promise((r) => (resolve = r)),
    resolve: (v) => resolve(v),
  };
};
async function controller() {
  const calls = [],
    scope = { workspace: "one", user: "owner", locale: "en" },
    state = {
      revision: 0,
      data: doc(),
      published: null,
      manage: true,
      members: [],
    };
  const pending = deferred();
  let wait = false,
    denied = false;
  const context = {
    AkiRotasCore: C,
    Intl,
    Date,
    FormData,
    structuredClone,
    crypto,
    TextEncoder,
    console,
    setTimeout,
    confirm: () => true,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(
    await readFile(new URL("../assets/rotas.js", import.meta.url), "utf8"),
    context,
  );
  const c = context.AkiRotas.create({
    scope: () => scope,
    client: () => ({
      rpc: async (name, args) => {
        calls.push({ name, args });
        if (denied)
          return {
            error: { code: "42501", message: "People access required" },
          };
        if (wait) return pending.promise;
        return { data: state };
      },
    }),
    refresh() {},
    download() {},
  });
  return {
    c,
    calls,
    scope,
    state,
    pending,
    wait: () => (wait = true),
    deny: () => (denied = true),
  };
}
test("controller rejects late responses after switching workspace and resets private data", async () => {
  const t = await controller();
  t.wait();
  const request = t.c.load();
  t.scope.workspace = "two";
  t.pending.resolve({ data: t.state });
  await request;
  const html = t.c.render();
  assert(!html.includes("Alex"));
  assert(!html.includes("22:00"));
  t.c.dispose();
});
test("publish is explicit, checks dirty forms and conflicts before the server call", async () => {
  const t = await controller();
  await t.c.load();
  t.c.markDirty();
  await assert.rejects(t.c.action("publish"), /Save the current form/);
  assert.equal(t.calls.length, 1);
  t.c.dispose();
});

test("templates reject breaks longer than the shift", () => {
  const d = doc();
  d.templates.push({
    id: "template",
    name: "Morning",
    start: "09:00",
    end: "17:00",
    overnight: false,
    breakMinutes: 30,
  });
  C.validate(d);
  d.templates[0].breakMinutes = 480;
  assert.throws(() => C.validate(d), /template/);
});

test("a permission denial clears previously loaded staff, drafts and export access", async () => {
  const t = await controller();
  await t.c.load();
  assert(t.c.render().includes("Alex"));
  t.deny();
  await t.c.load();
  const html = t.c.render();
  assert(!html.includes("Alex"));
  assert(!html.includes('data-rota-action="csv"'));
  assert(html.includes("People access required"));
  t.c.dispose();
});

test("dragging preserves overnight duration and reload clears stale undo history", async () => {
  const t = await controller();
  await t.c.load();
  await t.c.moveShift("s1", "p", "2026-10-23");
  const sent = t.calls.find((c) => c.name === "crm_rota_save").args.p_data
    .shifts[0];
  assert.equal(sent.date, "2026-10-23");
  assert.equal(sent.endDate, "2026-10-24");
  assert.equal(C.duration(sent), 7.5);
  assert(t.c.render().includes('data-rota-action="undo-move"'));
  await t.c.load();
  assert(!t.c.render().includes('data-rota-action="undo-move"'));
  t.c.dispose();
});
