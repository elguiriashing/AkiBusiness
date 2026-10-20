import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '../cloudflare/node_modules/@electric-sql/pglite/dist/index.js';
const db=new PGlite();
const owner='00000000-0000-4000-8000-000000000001',staff='00000000-0000-4000-8000-000000000002';
const all=['crm','inbox','tasks','calendar','inventory','pos','sales','marketing','automation','collaboration','employees','knowledge'];
const tools=all.slice(0,4);
const testAnchor=new Date(Date.now()-86400000).toISOString();
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
async function login(id=owner){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
async function enroll(tier='basico',active=tools,anchor=testAnchor,paid=new Date(Date.now()+366*86400000).toISOString(),revision=1,status='active'){
 await db.query('select public.crm_toolbox_billing_sync($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',['w',tier,active,anchor,paid,status,'stripe','sub_test',revision,'test-invoice',true]);
}
async function snap(){return scalar('select public.crm_toolbox($1)',['w']);}
async function save(next,revision){return scalar('select public.crm_toolbox_save($1,$2,$3)',['w',next,revision??(await snap()).revision]);}
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;
 create table public.profiles(id uuid primary key,app_role text,display_name text,username text);
 create table public.crm_workspaces(id text primary key,status text,owner_profile_id uuid);
 create table public.crm_workspace_members(workspace_id text,profile_id uuid,status text,role text,role_template_id uuid,primary key(workspace_id,profile_id));
 create table public.crm_role_templates(id uuid primary key,workspace_id text);
 create table public.crm_role_template_tools(template_id uuid,tool_key text);
 create table public.crm_tool_catalog(tool_key text primary key,active boolean);
 create table public.crm_workspace_entitlements(workspace_id text,tool_key text,active boolean,source text,starts_at timestamptz,ends_at timestamptz,primary key(workspace_id,tool_key));
 create function public.has_active_entitlement(uuid,text) returns boolean language sql stable as $$select true$$;
 create function public.crm_can_access_workspace(text) returns boolean language sql stable as $$select true$$;
 create function public.crm_has_tool(text,text) returns boolean language sql stable as $$select true$$;
 grant usage on schema public to anon,authenticated,service_role;
 `);
 await db.exec(await readFile(new URL('../supabase/migrations/20261020170509_subscription_toolbox.sql',import.meta.url),'utf8'));
});
after(()=>db.close());
beforeEach(async()=>{
 await db.exec('reset role;truncate akibusiness_private.toolbox_notifications,akibusiness_private.toolbox_history,akibusiness_private.toolboxes,akibusiness_private.member_tool_limits,public.crm_workspace_entitlements,public.crm_workspaces,public.crm_workspace_members,public.crm_role_template_tools,public.crm_role_templates,public.crm_tool_catalog cascade;');
 await login();
 await db.query("insert into public.crm_workspaces values('w','active',$1),('other','active',$1)",[owner]);
 await db.query("insert into public.crm_workspace_members values('w',$1,'active','owner',null),('w',$2,'active','staff','10000000-0000-4000-8000-000000000001')",[owner,staff]);
 await db.exec("insert into public.crm_role_templates values('10000000-0000-4000-8000-000000000001','w');insert into public.crm_role_template_tools values('10000000-0000-4000-8000-000000000001','crm'),('10000000-0000-4000-8000-000000000001','pos');");
 for(const t of [...all,'dashboard','crm-social','support','sites'])await db.query('insert into public.crm_tool_catalog values($1,true)',[t]);
});
test('Basico exactly four, one replacement compared with active across repeated saves',async()=>{
 await enroll();await assert.rejects(save(all.slice(0,3)),/Invalid selection/);
 await save(['crm','inbox','tasks','pos']);await assert.rejects(save(['crm','inbox','pos','inventory']),/allowance/);
 assert.deepEqual((await snap()).active_tools,tools);await save(['crm','inbox','tasks','inventory']);assert.equal((await snap()).pending_replacements,1);
 await assert.rejects(save(['crm','inbox','tasks','pos'],1),/Configuration changed/);
});
test('Standard eight and two replacements, Pro all twelve',async()=>{
 await enroll('standard',all.slice(0,8));await save([...all.slice(0,6),'automation','collaboration']);
 await assert.rejects(save([...all.slice(0,5),'automation','collaboration','knowledge']),/allowance/);
 await enroll('pro',all,undefined,undefined,2);assert.equal((await snap()).active_tools.length,12);
});
test('rotation applies once, recovers missed months, annual billing rotates monthly',async()=>{
 const anchor=new Date();anchor.setUTCMonth(anchor.getUTCMonth()-4);anchor.setUTCDate(1);
 await enroll('basico',tools,anchor.toISOString());
 // saved selection is prepared before boundary, persisted transactionally as owner
 await db.query("update akibusiness_private.toolboxes set saved_tools=$1 where workspace_id='w'",[['crm','inbox','tasks','pos']]);
 assert.equal(await scalar("select public.crm_toolbox_rotate('w')"),true);
 assert.equal(await scalar("select public.crm_toolbox_rotate('w')"),false);
 assert.ok((await snap()).active_tools.includes('pos'));assert.equal(await scalar("select count(*)::int from akibusiness_private.toolbox_history where action='rotation'"),1);
});
test('UTC anniversaries clamp February, restore month-end and handle leap year',async()=>{
 for(const [a,m,want] of [['2027-01-31T23:30:00Z',1,'2027-02-28T23:30:00.000Z'],['2027-01-31T23:30:00Z',2,'2027-03-31T23:30:00.000Z'],['2028-01-31T09:15:00Z',1,'2028-02-29T09:15:00.000Z'],['2024-02-29T00:30:00Z',12,'2025-02-28T00:30:00.000Z']]){
 await db.exec("set timezone='Europe/Madrid'");assert.equal((await scalar('select akibusiness_private.anniversary($1,$2)',[a,m])).toISOString(),want);
 }
});
test('instant individual restriction is intersected with active licence and role, revoked staff denied',async()=>{
 await enroll();await login(staff);assert.equal(await scalar("select public.crm_has_tool('w','crm')"),true);assert.equal(await scalar("select public.crm_has_tool('w','pos')"),false);
 await login();await db.query('select public.crm_toolbox_delegate($1,$2,$3)',['w',staff,[]]);await login(staff);assert.equal(await scalar("select public.crm_has_tool('w','crm')"),false);
 await login();await db.query('select public.crm_toolbox_delegate($1,$2,$3)',['w',staff,['crm']]);await login(staff);assert.equal(await scalar("select public.crm_has_tool('w','crm')"),true);assert.equal(await scalar("select public.crm_has_tool('other','crm')"),false);
 await db.query("update public.crm_workspace_members set status='removed' where profile_id=$1",[staff]);assert.equal(await scalar("select public.crm_has_tool('w','crm')"),false);
});
test('unauthenticated/employee cannot save, sync, rotate or alter private data',async()=>{
 await enroll();await login(staff);await db.exec('set role authenticated');await assert.rejects(save(tools,1),/Owner access/);
 await assert.rejects(enroll(),/permission denied/);await assert.rejects(db.exec("select public.crm_toolbox_rotate('w')"),/permission denied/);
 await assert.rejects(db.exec('select * from akibusiness_private.toolboxes'),/permission denied/);
 await db.exec('reset role');await login('');await assert.rejects(snap(),/Owner access/);
});
test('failed payment and expired paid period cannot grant access; no early pending activation',async()=>{
 await enroll('basico',tools,undefined,undefined,1,'incomplete');assert.equal(await scalar("select public.crm_has_tool('w','crm')"),false);
 await enroll('basico',tools,undefined,undefined,2);await save(['crm','inbox','tasks','pos']);assert.equal(await scalar("select public.crm_has_tool('w','pos')"),false);
 await db.exec("update akibusiness_private.toolboxes set paid_until=now()-interval '1 second'");assert.equal(await scalar("select public.crm_has_tool('w','crm')"),false);
});
test('upgrade immediate, effective downgrade fits lower capacity; duplicate/stale billing cannot overwrite',async()=>{
 const anchor=testAnchor;await enroll('basico',tools,anchor);await enroll('pro',all,anchor,undefined,2);assert.equal(await scalar("select public.crm_has_tool('w','pos')"),true);
 await enroll('basico',tools,anchor,undefined,3);assert.equal(await scalar("select public.crm_has_tool('w','pos')"),false);
 await enroll('pro',all,anchor,undefined,2);assert.equal((await snap()).tier,'basico');
});
