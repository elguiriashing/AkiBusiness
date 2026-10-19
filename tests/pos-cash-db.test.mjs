import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {PGlite} from '../cloudflare/node_modules/@electric-sql/pglite/dist/index.js';
import {setupKitchenDatabase,ids,item} from './pos-kds-fixture.mjs';
let db;
test.before(async()=>{
 db=new PGlite();await setupKitchenDatabase(db);
 await db.exec("insert into public.crm_role_template_tools values('10000000-0000-0000-0000-000000000001','pos')");
 for(const file of ['20261010223000_pos_trading_days_ledger.sql','20261019222000_pos_cash_reconciliation.sql'])
  await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
});
test.after(async()=>db.close());
async function rpc(name,args,who='owner',workspace='tenant-a'){
 await db.exec(`reset role;select set_config('test.user_id','${ids[who]||''}',false);set role authenticated;`);
 try{return (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value}
 finally{await db.exec('reset role')}
}
const day=(action,id=null)=>rpc('crm_pos_trading_day',['tenant-a',action,id,'Synthetic service']);
const cash=(command,key=crypto.randomUUID(),who='owner',workspace='tenant-a')=>rpc('crm_pos_cash_command',[workspace,key,command],who,workspace);
const overview=()=>rpc('crm_pos_cash_overview',['tenant-a']);
const order=(command,key=crypto.randomUUID())=>rpc('crm_hospitality_command',['tenant-a',key,command]);
async function cashSale(){const opened=await order({action:'open',label:'Cash table'});let o=(await rpc('crm_hospitality_overview',['tenant-a'])).orders.find(x=>x.id===opened.order_id);await order({action:'add',order_id:o.id,version:o.version,item_id:item});o=(await rpc('crm_hospitality_overview',['tenant-a'])).orders.find(x=>x.id===o.id);await order({action:'payment',order_id:o.id,version:o.version,amount_cents:o.total_cents,method:'cash'});return o.total_cents}

test('opening float, cash sale and safe drop produce the expected drawer without changing revenue',async()=>{
 await day('start');await cash({action:'opening_float',amount_cents:5000});const sale=await cashSale();
 await cash({action:'movement',kind:'cash_drop',amount_cents:1000,reason:'Safe drop'});
 const before=await overview();assert.equal(before.contract_version,1);assert.equal(before.active_shift.expected_cash_cents,5000+sale-1000);assert.equal(before.active_shift.cash_sales_cents,sale);
 const closed=await cash({action:'reconcile_close',counted_cents:5000+sale-1000,reason:''});assert.equal(closed.discrepancy_cents,0);
 assert.equal((await overview()).active_shift,null);
});
test('retries are idempotent and changed or cross-actor reuse is rejected',async()=>{
 await day('start');const key=crypto.randomUUID(),command={action:'movement',kind:'pay_in',amount_cents:500,reason:'Change top up'};
 const first=await cash(command,key);assert.deepEqual(await cash(command,key),first);
 await assert.rejects(cash({...command,amount_cents:600},key),/already used/);
 await assert.rejects(cash(command,key,'staff'),/Manager permission|already used/);
 await cash({action:'reconcile_close',counted_cents:500,reason:''});
});
test('a discrepancy needs a reason and legacy end cannot bypass the count',async()=>{
 const opened=await day('start');await cash({action:'opening_float',amount_cents:2000});
 await assert.rejects(day('end',opened.day.id),/Count and reconcile/);
 await assert.rejects(cash({action:'reconcile_close',counted_cents:1999,reason:''}),/Explain the cash discrepancy/);
 const result=await cash({action:'reconcile_close',counted_cents:1999,reason:'One cent short'});assert.equal(result.discrepancy_cents,-1);
});
test('drawer close serializes with service and refuses an open bill',async()=>{
 await day('start');
 const opened=await order({action:'open',label:'Still serving'});
 await assert.rejects(cash({action:'reconcile_close',counted_cents:0,reason:''}),/Close or cancel every open bill/);
 const live=(await rpc('crm_hospitality_overview',['tenant-a'])).orders.find(x=>x.id===opened.order_id);
 await order({action:'cancel',order_id:live.id,version:live.version,reason:'End of service'});
 await cash({action:'reconcile_close',counted_cents:0,reason:''});
});
test('tenant, role and direct ACL boundaries are enforced',async()=>{
 await day('start');
 await assert.rejects(cash({action:'opening_float',amount_cents:1},undefined,'staff'),/Manager permission/);
 await assert.rejects(cash({action:'opening_float',amount_cents:1},undefined,'outsider'),/access required|Manager permission/);
 await assert.rejects(cash({action:'opening_float',amount_cents:1},undefined,'owner','tenant-b'),/access required/);
 const grants=(await db.query("select has_function_privilege('anon','public.crm_pos_cash_command(text,uuid,jsonb)','execute') anon,has_function_privilege('authenticated','public.crm_pos_cash_command(text,uuid,jsonb)','execute') auth,has_table_privilege('authenticated','akihq_hospitality.cash_shifts','select') direct")).rows[0];
 assert.deepEqual(grants,{anon:false,auth:true,direct:false});
 await cash({action:'reconcile_close',counted_cents:0,reason:''});
});
