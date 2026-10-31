import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '../cloudflare/node_modules/@electric-sql/pglite/dist/index.js';
import {setupKitchenDatabase,ids,item} from './pos-kds-fixture.mjs';

let db;
test.before(async()=>{
  db=new PGlite();
  await setupKitchenDatabase(db);
  await db.exec("insert into public.crm_role_template_tools values('10000000-0000-0000-0000-000000000001','pos')");
  for(const file of [
    '20261010223000_pos_trading_days_ledger.sql',
    '20261019222000_pos_cash_reconciliation.sql',
    '20261019224000_pos_cash_command_safety.sql',
    '20261031140000_pos_refund_evidence.sql'
  ]) await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
});
test.after(async()=>db?.close());
async function rpc(name,args,who='owner',workspace='tenant-a'){
  await db.exec("reset role");
  await db.exec("select set_config('test.user_id','"+(ids[who]||'')+"',false)");
  await db.exec("set role authenticated");
  try{return (await db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value}
  finally{await db.exec("reset role")}
}
const hospitality=async(command,who='owner')=>rpc('crm_hospitality_command',['tenant-a',crypto.randomUUID(),command],who);
async function sale(method='cash',reference=''){
  const opened=await hospitality({action:'open',label:'Refund test bill'});
  let current=(await rpc('crm_hospitality_overview',['tenant-a'])).orders.find(x=>x.id===opened.order_id);
  await hospitality({action:'add',order_id:current.id,version:current.version,item_id:item});
  current=(await rpc('crm_hospitality_overview',['tenant-a'])).orders.find(x=>x.id===opened.order_id);
  await hospitality({action:'payment',order_id:current.id,version:current.version,
    amount_cents:current.total_cents,method,...(method==='cash'?{}:{reference})});
  return (await db.query('select id,status,sale_id,payments from akihq_hospitality.orders where id=$1',[opened.order_id])).rows[0];
}
const record=(body,key=crypto.randomUUID(),who='owner',workspace='tenant-a')=>
  rpc('crm_pos_record_refund',[workspace,key,body],who,workspace);
const request=(bill,amount,extra={})=>({
  order_id:bill.id,original_payment_id:bill.payments.find(p=>p.amount_cents>0).id,
  method:bill.payments.find(p=>p.amount_cents>0).method,amount_cents:amount,
  reason:'Customer returned product after sale',...extra
});
test('a cash refund changes the current physical drawer but not original closed sales',async()=>{
  const day=await rpc('crm_pos_trading_day',['tenant-a','start',null,'Refund day']);
  const float=10000;
  await rpc('crm_pos_cash_command',['tenant-a',crypto.randomUUID(),{action:'opening_float',trading_day_id:day.day.id,amount_cents:float}]);
  const bill=await sale('cash');
  const original=(await rpc('crm_pos_ledger',['tenant-a',{}])).summary.active_cents;
  let cash=(await rpc('crm_pos_cash_overview',['tenant-a'])).active_shift;
  assert.equal(cash.cash_sales_cents,bill.payments[0].amount_cents);
  const body=request(bill,bill.payments[0].amount_cents,{cash_paid_out:true});
  const saved=await record(body);
  assert.equal(saved.status,'operator_attested');
  assert.equal(saved.fiscal_review_required,true);
  assert.equal(saved.cash_trading_day_id,day.day.id);
  cash=(await rpc('crm_pos_cash_overview',['tenant-a'])).active_shift;
  assert.equal(cash.cash_refunds_cents,bill.payments[0].amount_cents);
  assert.equal(cash.expected_cash_cents,float);
  assert.equal((await rpc('crm_pos_ledger',['tenant-a',{}])).summary.active_cents,original);
  const close=await rpc('crm_pos_cash_command',['tenant-a',crypto.randomUUID(),{action:'reconcile_close',trading_day_id:day.day.id,counted_cents:float,reason:''}]);
  assert.equal(close.discrepancy_cents,0);
});
test('recorded partial external refunds are idempotent and cannot exceed original tender',async()=>{
  const bill=await sale('card','captured-outside-terminal-1'),amount=bill.payments[0].amount_cents;
  const firstBody=request(bill,Math.max(1,Math.floor(amount/2)),{external_reference:'provider-refund-1',external_refund_completed:true});
  const key=crypto.randomUUID();
  const first=await record(firstBody,key);
  assert.deepEqual(await record(firstBody,key),first);
  await assert.rejects(record({...firstBody,amount_cents:1},key),/different details/);
  const rest=amount-firstBody.amount_cents;
  if(rest>0)await record(request(bill,rest,{external_reference:'provider-refund-2',external_refund_completed:true}));
  await assert.rejects(record(request(bill,1,{external_reference:'provider-refund-3',external_refund_completed:true})),/exceeds the remaining/);
  const overview=await rpc('crm_pos_refund_overview',['tenant-a',bill.id]);
  assert.equal(overview.refunds.reduce((sum,r)=>sum+r.amount_cents,0),amount);
  assert.equal(overview.fiscal_issuance_or_rectification_performed,false);
  assert.match(overview.notice,/fiscal rectification separately/);
});
test('refund requires affirmative external/cash completion and distinct provider reference',async()=>{
  const bill=await sale('card','captured-outside-terminal-2');
  await assert.rejects(record(request(bill,1,{external_reference:'provider-new-1'})),/Confirm the external refund/);
  await assert.rejects(record(request(bill,1,{external_refund_completed:true})),/Confirm the external refund/);
  const badCash=await sale('cash');
  await assert.rejects(record(request(badCash,1,{})),/Confirm that physical cash/);
  await assert.rejects(record(request(badCash,1,{cash_paid_out:true})),/Open a cash trading day/);
  const saved=await record(request(bill,1,{external_reference:'provider-new-1',external_refund_completed:true}));
  assert.equal(saved.amount_cents,1);
  const second=await sale('card','captured-outside-terminal-3');
  await assert.rejects(record(request(second,1,{external_reference:'provider-new-1',external_refund_completed:true})),/duplicate key|unique constraint/i);
});
test('manager, tenant and storage permissions remain isolated',async()=>{
  const bill=await sale('other','captured-outside-terminal-4');
  const body=request(bill,1,{external_reference:'provider-refund-4',external_refund_completed:true});
  await assert.rejects(record(body,undefined,'staff'),/Manager permission/);
  await assert.rejects(record(body,undefined,'outsider'),/access required|Manager permission/);
  await assert.rejects(record(body,undefined,'owner','tenant-b'),/access required/);
  await assert.rejects(rpc('crm_pos_refund_overview',['tenant-a',bill.id],'staff'),/Manager permission/);
  const grants=(await db.query("select has_function_privilege('anon','public.crm_pos_record_refund(text,uuid,jsonb)','execute') anon,has_function_privilege('authenticated','public.crm_pos_record_refund(text,uuid,jsonb)','execute') auth,has_table_privilege('authenticated','akihq_hospitality.refund_records','select') direct")).rows[0];
  assert.deepEqual(grants,{anon:false,auth:true,direct:false});
  const saved=await record(body);
  await assert.rejects(db.query('update akihq_hospitality.refund_records set reason=$1 where id=$2',['tampered',saved.refund_id]),/append-only/);
  await assert.rejects(db.query('delete from akihq_hospitality.refund_records where id=$1',[saved.refund_id]),/append-only/);
});
