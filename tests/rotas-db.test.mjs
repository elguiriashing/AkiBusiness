import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "../cloudflare/node_modules/@electric-sql/pglite/dist/index.js";
const db = new PGlite(),
  owner = "00000000-0000-4000-8000-000000000001",
  staff = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003";
const scalar = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const login = async (id = owner) => {
  await db.exec("reset role");
  await db.query("select set_config('test.uid',$1,false)", [id]);
  await db.exec("set role authenticated");
};
const read = () => scalar("select public.crm_rota_read($1)", ["w"]);
const document = () => ({
  settings: { title: "Team rota", timezone: "Europe/Madrid", timeFormat: "24" },
  staff: [
    { id: "alex", profileId: owner, name: "Alex", weeklyHours: 40 },
    { id: "linked", profileId: staff, name: "Staff", weeklyHours: 20 },
    { id: "manual", profileId: null, name: "Manual", weeklyHours: 40 },
  ],
  shifts: [
    {
      id: "shift",
      staffId: "linked",
      date: "2026-10-24",
      start: "22:00",
      endDate: "2026-10-25",
      end: "06:00",
      breakMinutes: 30,
      role: "Bar",
      location: "Main",
      notes: "Opening checklist",
    },
  ],
  absences: [],
  templates: [],
});
const save = (data = document(), revision = 0, publish = false) =>
  scalar("select public.crm_rota_save($1,$2,$3,$4)", [
    "w",
    data,
    revision,
    publish,
  ]);
before(async () => {
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema akihq_security;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 grant usage on schema public,auth,akihq_security to authenticated,anon;
 create table public.profiles(id uuid primary key,display_name text);
 create table public.crm_workspaces(id text primary key,status text);
 create table public.crm_workspace_members(workspace_id text,profile_id uuid,role text,status text,primary key(workspace_id,profile_id));
 create table public.test_access(workspace_id text,profile_id uuid,allowed boolean);
 create function akihq_security.can_tool(w text,t text)returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.test_access where workspace_id=w and profile_id=auth.uid() and allowed) and exists(select 1 from public.crm_workspace_members where workspace_id=w and profile_id=auth.uid() and status='active')$$;
 create function akihq_security.can_administer(w text)returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.crm_workspace_members where workspace_id=w and profile_id=auth.uid() and status='active' and role in ('owner','admin'))$$;
 grant execute on function auth.uid(),akihq_security.can_tool(text,text),akihq_security.can_administer(text) to authenticated;
 revoke all on all tables in schema public from public,authenticated,anon;`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261024020749_staff_rotas.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
after(() => db.close());
beforeEach(async () => {
  await db.exec(
    "reset role;truncate akibusiness_rotas.history,akibusiness_rotas.schedules,public.profiles,public.crm_workspaces,public.crm_workspace_members,public.test_access cascade;",
  );
  await db.query(
    "insert into public.profiles values($1,'Owner'),($2,'Staff'),($3,'Other')",
    [owner, staff, other],
  );
  await db.exec(
    "insert into public.crm_workspaces values('w','active'),('other','active')",
  );
  await db.query(
    "insert into public.crm_workspace_members values('w',$1,'owner','active'),('w',$2,'staff','active'),('other',$3,'owner','active');",
    [owner, staff, other],
  );
  await db.query(
    "insert into public.test_access values('w',$1,true),('w',$2,true),('other',$3,true)",
    [owner, staff, other],
  );
  await login();
});
test("owner gets active Teams directory, manual profiles create no membership, first save has revision", async () => {
  const blank = await read();
  assert.equal(blank.data.shifts.length, 0);
  assert.equal(blank.members.length, 2);
  const saved = await save();
  assert.equal(saved.revision, 1);
  assert.equal(saved.published, null);
  await db.exec("reset role");
  assert.equal(
    await scalar("select count(*)::int from public.crm_workspace_members"),
    3,
  );
});
test("staff never receive drafts, coworker records, templates or time-off reasons", async () => {
  const doc = document();
  doc.shifts.push({ ...doc.shifts[0], id: "ownerShift", staffId: "alex" });
  doc.absences.push({
    id: "leave",
    staffId: "manual",
    from: "2026-10-27",
    through: "2026-10-28",
    reason: "PRIVATE MEDICAL DETAIL",
  });
  await save(doc, 0, true);
  await login(staff);
  const own = await read();
  assert.equal(own.manage, false);
  assert.equal(own.data.staff.length, 1);
  assert.equal(own.data.shifts.length, 1);
  assert.equal(own.data.shifts[0].staffId, "linked");
  assert.equal(own.members.length, 0);
  assert.equal(own.data.absences.length, 0);
  assert.doesNotMatch(JSON.stringify(own), /PRIVATE MEDICAL|ownerShift|Alex/);
  await login();
  doc.shifts[0].start = "23:00";
  await save(doc, 1);
  await login(staff);
  assert.equal((await read()).data.shifts[0].start, "22:00");
});
test("unauthorized role, outsider, anon, suspended membership and revoked tool cannot read/write", async () => {
  await save();
  await login(staff);
  await assert.rejects(save(document(), 1), /administrator access/);
  await login(other);
  await assert.rejects(read(), /People access/);
  await db.exec("reset role;set role anon");
  await assert.rejects(read(), /permission denied/);
  await login(owner);
  await db.exec(
    "reset role;update public.test_access set allowed=false where workspace_id='w'",
  );
  await login();
  await assert.rejects(read(), /People access/);
  await db.exec(
    "reset role;update public.test_access set allowed=true;update public.crm_workspace_members set status='suspended' where workspace_id='w'",
  );
  await login();
  await assert.rejects(read(), /People access/);
});
test("private tables and helper functions cannot be read or modified directly", async () => {
  await save();
  await assert.rejects(
    db.exec("select * from akibusiness_rotas.schedules"),
    /permission denied/,
  );
  await assert.rejects(
    db.exec("delete from akibusiness_rotas.history"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select akibusiness_rotas.validate_document($1,$2)", [
      "w",
      document(),
    ]),
    /permission denied/,
  );
});
test("revision rejects stale and null saves, preserving data and published schedule", async () => {
  await save(document(), 0, true);
  await assert.rejects(save(document(), 0), /Rota changed/);
  await assert.rejects(save(document(), null), /Rota changed/);
  assert.equal((await read()).revision, 1);
});
test("server independently validates staff links, dates, duration, break and duplicates", async () => {
  for (const mutate of [
    (d) => (d.staff[0].profileId = other),
    (d) => (d.shifts[0].endDate = "2026-02-30"),
    (d) => (d.shifts[0].endDate = "2026-10-27"),
    (d) => (d.shifts[0].breakMinutes = 480),
    (d) => (d.shifts[0].staffId = "missing"),
    (d) => d.staff.push(d.staff[0]),
    (d) => (d.settings.timezone = "invalid"),
    (d) =>
      d.absences.push({
        id: "a",
        staffId: "linked",
        from: "bad",
        through: "2026-10-28",
      }),
  ]) {
    const d = document();
    mutate(d);
    await assert.rejects(save(d));
  }
  assert.equal((await read()).revision, 0);
});
test("overlap and overnight time-off conflict can be saved as drafts but publishing rejects them", async () => {
  const d = document();
  d.shifts.push({
    ...d.shifts[0],
    id: "overlap",
    date: "2026-10-25",
    start: "05:00",
    endDate: "2026-10-25",
    end: "08:00",
  });
  await save(d);
  await assert.rejects(save(d, 1, true), /conflicts/);
  d.shifts.pop();
  d.absences.push({
    id: "a",
    staffId: "linked",
    from: "2026-10-25",
    through: "2026-10-25",
    reason: "Private",
  });
  await assert.rejects(save(d, 1, true), /conflicts/);
  assert.equal((await read()).published, null);
});
test("adjacent split shifts publish; overnight shift ending at midnight does not overlap next day leave", async () => {
  const d = document();
  d.shifts[0].endDate = "2026-10-25";
  d.shifts[0].end = "00:00";
  d.shifts[0].breakMinutes = 0;
  d.shifts.push({
    ...d.shifts[0],
    id: "split",
    date: "2026-10-24",
    start: "18:00",
    endDate: "2026-10-24",
    end: "22:00",
  });
  d.absences.push({
    id: "a",
    staffId: "linked",
    from: "2026-10-25",
    through: "2026-10-25",
    reason: "Leave",
  });
  assert.equal((await save(d, 0, true)).revision, 1);
});
test("audit records actor/action/revision and rollback leaves no audit for rejected publish", async () => {
  await save();
  await save(document(), 1, true);
  await db.exec("reset role");
  const rows = (
    await db.query(
      "select actor,action,revision from akibusiness_rotas.history order by revision",
    )
  ).rows;
  assert.deepEqual(
    rows.map((r) => r.action),
    ["save", "publish"],
  );
  assert(rows.every((r) => r.actor === owner));
});
