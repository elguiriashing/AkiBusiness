import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '../cloudflare/node_modules/@electric-sql/pglite/dist/index.js';
const db=new PGlite(),owner='00000000-0000-4000-8000-000000000001',staff='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const scalar=async q=>Object.values((await db.query(q)).rows[0])[0];
before(async()=>{const fixture=await readFile(new URL('./toolbox-db.test.mjs',import.meta.url),'utf8');await db.exec(fixture.match(/await db\.exec\(`([\s\S]*?)`\);/)[1]);
 await db.exec(await readFile(new URL('../supabase/migrations/20261020170509_subscription_toolbox.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261020181233_toolbox_owner_notifications.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261020183515_toolbox_notification_retry_backoff.sql',import.meta.url),'utf8'));
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
 await db.exec(`update public.crm_workspace_members set status='active' where workspace_id='w' and role='owner';update akibusiness_private.toolbox_notifications set retry_after=now()-interval '1 second' where history_id=3;set role service_role;select public.crm_toolbox_deliver_notifications();reset role;`);assert.equal(await scalar('select delivered_at is not null from akibusiness_private.toolbox_notifications where history_id=3'),true);assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_owner_inbox'),3);
});

test('101 unavailable-owner events cannot starve a later valid event and failures back off with a cap',async()=>{
 await db.exec(`reset role;update akibusiness_private.toolbox_notification_settings set enabled=false;truncate akibusiness_private.toolbox_owner_inbox,akibusiness_private.toolbox_notifications,akibusiness_private.toolbox_history restart identity cascade;
 insert into public.crm_workspaces values('missing-owner','active','${owner}');
 insert into akibusiness_private.toolbox_history(workspace_id,action,rotation,old_tools,new_tools,evidence)select 'missing-owner','rotation',g,array['crm','pos','inventory','calendar'],array['crm','inbox','inventory','calendar'],'queue-proof' from generate_series(1,101)g;
 insert into akibusiness_private.toolbox_history(workspace_id,action,rotation,old_tools,new_tools,evidence)values('w','rotation',102,array['crm','pos','inventory','calendar'],array['crm','inbox','inventory','calendar'],'queue-proof');
 insert into akibusiness_private.toolbox_notifications(history_id,workspace_id)select id,workspace_id from akibusiness_private.toolbox_history order by id;
 update akibusiness_private.toolbox_notification_settings set enabled=true;set role service_role;`);
 assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications(100)'),{enabled:true,completed:0,failed:100});
 assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications(100)'),{enabled:true,completed:1,failed:1});
 assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications(100)'),{enabled:true,completed:0,failed:0});
 await db.exec('reset role');assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_owner_inbox'),1);
 assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_notifications where delivered_at is null and retry_after>statement_timestamp()'),101);
 assert.equal(await scalar("select bool_and(retry_after between statement_timestamp()+interval '20 seconds' and statement_timestamp()+interval '31 seconds') from akibusiness_private.toolbox_notifications where delivered_at is null"),true);
 await db.exec("update akibusiness_private.toolbox_notifications set attempts=100,retry_after=statement_timestamp()-interval '1 second' where history_id=1;set role service_role;");
 assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications(100)'),{enabled:true,completed:0,failed:1});await db.exec('reset role');
 assert.equal(await scalar("select retry_after between statement_timestamp()+interval '3590 seconds' and statement_timestamp()+interval '3601 seconds' from akibusiness_private.toolbox_notifications where history_id=1"),true);
 await db.exec(`insert into public.crm_workspace_members values('missing-owner','${owner}','active','owner',null);update akibusiness_private.toolbox_notifications set retry_after=statement_timestamp()-interval '1 second' where history_id=1;set role service_role;`);
 assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications(100)'),{enabled:true,completed:1,failed:0});
 assert.deepEqual(await scalar('select public.crm_toolbox_deliver_notifications(100)'),{enabled:true,completed:0,failed:0});await db.exec('reset role');
 assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_owner_inbox'),2);
});

test('profile deletion removes its private inbox without deleting financial or rotation audit',async()=>{
 const recipient='00000000-0000-4000-8000-000000000004';await db.exec('reset role');
 const histories=await scalar('select count(*)::int from akibusiness_private.toolbox_history'),outbox=await scalar('select count(*)::int from akibusiness_private.toolbox_notifications');
 await db.exec(`insert into public.profiles values('${recipient}',null,'Deleted owner',null);
 insert into akibusiness_private.toolbox_owner_inbox(history_id,recipient,workspace_id,active_tools,removed_tools,affected_staff,created_at)
 select history_id,'${recipient}',workspace_id,active_tools,removed_tools,affected_staff,created_at from akibusiness_private.toolbox_owner_inbox limit 1;`);
 assert.equal(await scalar(`select count(*)::int from akibusiness_private.toolbox_owner_inbox where recipient='${recipient}'`),1);
 await db.exec(`delete from public.profiles where id='${recipient}'`);
 assert.equal(await scalar(`select count(*)::int from akibusiness_private.toolbox_owner_inbox where recipient='${recipient}'`),0);
 assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_history'),histories);assert.equal(await scalar('select count(*)::int from akibusiness_private.toolbox_notifications'),outbox);
});
