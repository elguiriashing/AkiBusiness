import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setupKitchenDatabase,ids,item} from './pos-kds-fixture.mjs';
import {acknowledgeRecovery,withAgentLock} from '../tools/print-agent/recovery.mjs';
const {PGlite}=await import(process.env.PGLITE_MODULE||'../cloudflare/node_modules/@electric-sql/pglite/dist/index.js');
let db,paired,other;
async function asRole(role,sql,params=[]){
 await db.exec(`reset role;select set_config('test.user_id','${role==='authenticated'?ids.owner:''}',false);set role ${role};`);
 try{return await db.query(sql,params);}finally{await db.exec('reset role');}
}
const report=async(id,action='recover',pair=paired)=>(await asRole('anon','select public.crm_printer_report($1::uuid,$2::text,$3::uuid,$4::text) value',[pair.device_id,pair.token,id,action])).rows[0].value;
const next=async()=>(await asRole('anon','select public.crm_printer_next($1::uuid,$2::text) value',[paired.device_id,paired.token])).rows[0].value;
const command=async(data)=>(await asRole('authenticated','select public.crm_hospitality_command($1::text,$2::uuid,$3::jsonb) value',['tenant-a',crypto.randomUUID(),JSON.stringify(data)])).rows[0].value;
const row=async(id)=>(await db.query('select to_jsonb(t) value from akihq_hospitality.tickets t where id=$1',[id])).rows[0].value;
const audits=async(id)=>(await db.query("select metadata from akihq_hospitality.events where action='printer_recover' and metadata->>'ticket_id'=$1",[id])).rows;
async function fixture(status,workspace='tenant-a',station='kitchen'){
 const order=crypto.randomUUID(),id=crypto.randomUUID();
 await db.query('insert into akihq_hospitality.orders(id,workspace_id,label,opened_by) values($1,$2,$3,$4)',[order,workspace,'Synthetic recovery fixture',ids.owner]);
 await db.query("insert into akihq_hospitality.tickets(id,workspace_id,order_id,station,kind,payload,status,printer_id,claimed_by) values($1,$2,$3,$4,'preparation',$5::jsonb,$6,$7,$8)",[id,workspace,order,station,JSON.stringify({notice:'SYNTHETIC ONLY',current:[{name:'Coffee',quantity:1}]}),status,paired.device_id,ids.owner]);
 return id;
}
test.before(async()=>{
 db=new PGlite();await setupKitchenDatabase(db);
 // First reproduce the original PR regression against the unchanged backend.
 paired=(await asRole('authenticated',"select public.crm_printer_manage('tenant-a','pair',$1::jsonb) value",[JSON.stringify({name:'Recovery fixture',stations:['kitchen']})])).rows[0].value;
 const original=await fixture('spooled');
 await assert.rejects(report(original,'uncertain'),/Invalid print state/);
 assert.equal((await row(original)).status,'spooled');
 await db.exec(readFileSync(new URL('../supabase/migrations/20261031113907_printer_recovery_ack.sql',import.meta.url),'utf8'));
 other=(await asRole('authenticated',"select public.crm_printer_manage('tenant-a','pair',$1::jsonb) value",[JSON.stringify({name:'Other device',stations:['kitchen']})])).rows[0].value;
});
test.after(async()=>{await db?.close();});

for(const status of ['claimed','uncertain','spooled','confirmed'])test(`database recovery preserves ${status} evidence and audits only once`,async()=>{
 const id=await fixture(status),before=await row(id),expected=status==='claimed'?'uncertain':status;
 const first=await report(id);assert.deepEqual(first,{recovery_contract:1,device_id:paired.device_id,ticket_id:id,status:expected,reprint:false});
 assert.deepEqual(await report(id),first);const after=await row(id);assert.equal(after.status,expected);
 delete before.status;delete after.status;assert.deepEqual(after,before);
 const evidence=await audits(id);assert.equal(evidence.length,1);assert.equal(evidence[0].metadata.previous_status,status);
 await assert.rejects(report(id,'begin'),/already attempted/);assert.equal(await next(),null);
});

test('end-to-end client recovery after committed spool response loss preserves the server state',async()=>{
 const opened=await command({action:'open',label:'Synthetic client recovery'});
 await command({action:'add',order_id:opened.order_id,version:0,item_id:item});
 await command({action:'send',order_id:opened.order_id,version:1});
 const ticket=await next();assert.equal(ticket.order_id,opened.order_id);
 await report(ticket.id,'begin');await report(ticket.id,'spooled');
 const dir=await mkdtemp(join(tmpdir(),'aki-recovery-db-')),journal=join(dir,'pending.json'),lock=join(dir,'agent.lock');
 const config={device_id:paired.device_id,supabase_url:'https://fixture.supabase.co'};
 await writeFile(journal,JSON.stringify({device_id:paired.device_id,ticket_id:ticket.id}));
 let loseReply=true;
 const rpc=async(name,args)=>{
  assert.equal(name,'crm_printer_report');const value=await report(args.p_ticket,args.p_action);
  if(loseReply){loseReply=false;throw Error('Lost recovery reply after commit');}return value;
 };
 try{
  await assert.rejects(withAgentLock(lock,()=>acknowledgeRecovery(ticket.id,{config,journal,rpc})),/Lost recovery reply/);
  assert.equal(JSON.parse(await readFile(journal,'utf8')).ticket_id,ticket.id);
  const result=await withAgentLock(lock,()=>acknowledgeRecovery(ticket.id,{config,journal,rpc}));
  assert.equal(result.status,'spooled');await assert.rejects(access(journal),{code:'ENOENT'});
  assert.equal((await audits(ticket.id)).length,1);assert.equal(await next(),null);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('wrong token, device, workspace, station and unclaimed tickets cannot recover',async()=>{
 const id=await fixture('claimed');
 await assert.rejects(report(id,'recover',{...paired,token:'b'.repeat(64)}),/authorization/);
 await assert.rejects(report(id,'recover',other),/not found/);
 const foreign=await fixture('claimed','tenant-b');await assert.rejects(report(foreign),/not found/);
 const wrongStation=await fixture('claimed','tenant-a','bar');await assert.rejects(report(wrongStation),/not found/);
 const queued=await fixture('queued');await assert.rejects(report(queued),/Invalid printer recovery state/);
 assert.equal((await row(queued)).status,'queued');
 for(const ticket of [id,foreign,wrongStation,queued])assert.equal((await audits(ticket)).length,0);
 // Fixture cleanup changes only the synthetic queued ticket's state.
 await db.query("update akihq_hospitality.tickets set status='confirmed' where id=$1",[queued]);
});

for(const type of ['revoked','expired','membership','entitlement'])test(`recovery rechecks ${type} authorization before any mutation`,async()=>{
 const id=await fixture('claimed');
 const changes={
  revoked:["update akihq_hospitality.printers set revoked_at=now() where id=$1","update akihq_hospitality.printers set revoked_at=null where id=$1",paired.device_id],
  expired:["update akihq_hospitality.printers set expires_at=now()-interval '1 day' where id=$1","update akihq_hospitality.printers set expires_at=now()+interval '90 days' where id=$1",paired.device_id],
  membership:["update public.crm_workspace_members set status='suspended' where workspace_id='tenant-a' and profile_id=$1","update public.crm_workspace_members set status='active' where workspace_id='tenant-a' and profile_id=$1",ids.owner],
  entitlement:["update public.crm_workspace_entitlements set active=false where workspace_id=$1 and tool_key='pos'","update public.crm_workspace_entitlements set active=true where workspace_id=$1 and tool_key='pos'",'tenant-a'],
 };
 const [disable,restore,arg]=changes[type];await db.query(disable,[arg]);
 try{await assert.rejects(report(id),/authorization/);assert.equal((await row(id)).status,'claimed');assert.equal((await audits(id)).length,0);}
 finally{await db.query(restore,[arg]);}
});

test('legacy begin/spooled contract and private table restrictions remain intact',async()=>{
 const id=await fixture('claimed');
 assert.deepEqual(await report(id,'begin'),{status:'uncertain'});
 await assert.rejects(report(id,'begin'),/already attempted/);
 assert.deepEqual(await report(id,'spooled'),{status:'spooled'});
 assert.deepEqual(await report(id,'spooled'),{status:'spooled'});
 await assert.rejects(report(id,'uncertain'),/Invalid print state/);
 await assert.rejects(asRole('anon','select * from akihq_hospitality.tickets'),/permission denied/);
 await assert.rejects(asRole('authenticated','select * from akihq_hospitality.events'),/permission denied/);
 const permissions=(await db.query("select count(*)::int n from pg_proc p cross join lateral aclexplode(p.proacl) a where p.oid='public.crm_printer_report(uuid,text,uuid,text)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE'")).rows[0];
 assert.equal(permissions.n,0);
});
