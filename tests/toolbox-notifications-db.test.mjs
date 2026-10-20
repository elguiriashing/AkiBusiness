import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '../cloudflare/node_modules/@electric-sql/pglite/dist/index.js';
const db=new PGlite(),owner='00000000-0000-4000-8000-000000000001',staff='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const scalar=async q=>Object.values((await db.query(q)).rows[0])[0];
before(async()=>{const fixture=await readFile(new URL('./toolbox-db.test.mjs',import.meta.url),'utf8');await db.exec(fixture.match(/await db\.exec\(`([\s\S]*?)`\);/)[1]);
 await db.exec(await readFile(new URL('../supabase/migrations/20261020170509_subscription_toolbox.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261020181233_toolbox_owner_notifications.sql',import.meta.url),'utf8'));
 await db.exec(`insert into public.profiles values('${owner}',null,'Owner',null),('${staff}',null,'<Stock manager>',null),('${other}',null,'Other',null);
 insert into public.crm_workspaces values('w','active','${owner}'),('other','active','${other}');
 insert into public.crm_workspace_members values('w','${owner}','active','owner',null),('w','${staff}','active','admin',null),('other','${other}','active','owner',null);
 insert into akibusiness_private.toolbox_history(workspace_id,action,rotation,old_tools,new_tools,evidence)values('w','rotation',1,array['crm','pos','inventory','calendar'],array['crm','inbox','inventory','calendar'],'monthly-anniversary');
 insert into akibusiness_private.toolbox_notifications(history_id,workspace_id)values(1,'w');`);
});after(()=>db.close());
test('delivery defaults off; private rows are not available to browsers',async()=>{
 assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications()'),{enabled:false});assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_owner_inbox'),0);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select public.crm_toolbox_deliver_notifications()'),/permission denied/);await assert.rejects(db.query('select * from akibusiness_private.toolbox_owner_inbox'),/permission denied/);await db.exec('reset role');}
});
test('service delivery snapshots real active tools and affected staff once',async()=>{
 await db.exec('update akibusiness_private.toolbox_notification_settings set enabled=true;set role service_role');
 assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications()'),{enabled:true,completed:1,failed:0});assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications()'),{enabled:true,completed:0,failed:0});await db.exec('reset role');
 const n=(await db.query('select * from akibusiness_private.toolbox_owner_inbox')).rows[0];assert.equal(n.recipient,owner);assert.deepEqual(n.active_tools,['crm','inbox','inventory','calendar']);assert.deepEqual(n.removed_tools,['pos']);assert.equal(n.affected_staff[0].profile_id,staff);assert.deepEqual(n.affected_staff[0].tools,['pos']);assert.equal(await scalar('select attempts from akibusiness_private.toolbox_notifications where history_id=1'),1);
});
test('authenticated owner RPC isolates recipients and current membership',async()=>{
 await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);assert.equal((await scalar("select public.crm_toolbox_owner_notifications('w')")).length,1);await assert.rejects(db.query("select public.crm_toolbox_owner_notifications('other')"),/Owner access required/);await db.exec('reset role');
 await db.exec(`select set_config('request.jwt.claim.sub','${staff}',false);set role authenticated`);await assert.rejects(db.query("select public.crm_toolbox_owner_notifications('w')"),/Owner access required/);await db.exec('reset role');
 await db.exec(`update public.crm_workspace_members set status='suspended' where profile_id='${owner}';select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated`);await assert.rejects(db.query("select public.crm_toolbox_owner_notifications('w')"),/Owner access required/);await db.exec(`reset role;update public.crm_workspace_members set status='active' where profile_id='${owner}'`);
});
test('new outbox events deliver atomically and recipient conflicts cannot duplicate',async()=>{
 await db.exec(`insert into akibusiness_private.toolbox_history(workspace_id,action,rotation,old_tools,new_tools,evidence)values('w','rotation',2,array['crm','inbox','inventory','calendar'],array['crm','pos','inventory','calendar'],'monthly-anniversary');insert into akibusiness_private.toolbox_notifications(history_id,workspace_id)values(2,'w');`);
 assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_owner_inbox'),2);assert.equal(await scalar('select delivered_at is not null from akibusiness_private.toolbox_notifications where history_id=2'),true);
 await db.exec('update akibusiness_private.toolbox_notifications set delivered_at=null where history_id=2;select public.crm_toolbox_deliver_notifications()');assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_owner_inbox'),2);
});
test('missing owner is retried without losing rotation or leaking to staff',async()=>{
 await db.exec(`update public.crm_workspace_members set status='suspended' where workspace_id='w' and role='owner';insert into akibusiness_private.toolbox_history(workspace_id,action,rotation,old_tools,new_tools,evidence)values('w','rotation',3,array['crm','pos','inventory','calendar'],array['crm','inbox','inventory','calendar'],'monthly-anniversary');insert into akibusiness_private.toolbox_notifications(history_id,workspace_id)values(3,'w');`);
 assert.equal(await scalar('select delivered_at is null from akibusiness_private.toolbox_notifications where history_id=3'),true);assert.equal(await scalar('select attempts from akibusiness_private.toolbox_notifications where history_id=3'),1);
 await db.exec(`update public.crm_workspace_members set status='active' where workspace_id='w' and role='owner';set role service_role;select public.crm_toolbox_deliver_notifications();reset role;`);assert.equal(await scalar('select delivered_at is not null from akibusiness_private.toolbox_notifications where history_id=3'),true);assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_owner_inbox'),3);
});
