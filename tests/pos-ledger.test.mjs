import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from '../cloudflare/node_modules/jsdom/lib/api.js';
const names=['pos-v4.js','pos-v4-dialogs.js','pos-printer-station.js','pos-ledger.js','hospitality-pos.js'];
const scripts=names.map(n=>readFileSync(new URL('../assets/'+n,import.meta.url),'utf8'));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function harness(can_manage=true,cashFault=null){
 const dom=new JSDOM('<main></main>',{url:'https://hq.example/',runScripts:'outside-only'}),w=dom.window;let ctrl,seq=0;
 const events=[],calls=[],entry={id:'bill-1',sale_id:'sale-1',label:'Table 7',table_id:'table-7',closed_at:'2026-10-11T02:15:00Z',opened_at:'2026-10-10T22:30:00Z',closed_by:'staff-1',closed_by_name:'Closer Staff',total_cents:1250,trading_day_id:null,lines:[{id:'l1',name:'Coke',quantity:3,unit_price_cents:250},{id:'l2',name:'Fries',quantity:1,unit_price_cents:500}],payments:[{amount_cents:600,method:'cash'},{amount_cents:650,method:'card'}],history:[{action:'open',at:'2026-10-10T22:30:00Z',actor:'Waiter'},{action:'payment',at:'2026-10-11T02:15:00Z',actor:'Closer Staff'}]};
 let active=null,closed=[],filters={},lastLookup=null,cash={active_shift:null,recent:[],contract_version:1,can_manage};
 const cloned=x=>JSON.parse(JSON.stringify(x));
 Object.defineProperty(w.crypto,'randomUUID',{configurable:true,value:()=> '00000000-0000-4000-a000-'+String(++seq).padStart(12,'0')});
 w.navigator.locks={request:async(_k,_opt,fn)=>fn({})};
 for(const source of scripts)w.eval(source);
 const overview=()=>({layout:{mode:'restaurant',pages:[{id:'f',name:'Floor'}],tables:[{id:'table-7',name:'7',page:'f',shape:'rectangle',x:5,y:5,width:15,height:15,seats:4}]},layout_version:0,can_manage,can_export:true,orders:[],tickets:[],recent:[],catalogue:[]});
 const ledger=()=>({
   rows:[{...entry,trading_day_id:active?.id||closed[0]?.id||null}],total_count:1,limit:30,offset:Number(filters.offset||0),
   trading_days:closed.concat(active?[active]:[]),active_day:active,
   staff:[{actor_id:'staff-1',actor_name:'Closer Staff'}],timezone:'Europe/Madrid',
   summary:{calendar_cents:1250,calendar_count:1,week_cents:1250,week_count:1,active_cents:active?1250:0,active_count:active?1:0,unassigned_count:active?0:1}
 });
 const ctx={actor:'manager',workspace:{id:'workspace',currency:'EUR',timezone:'Europe/Madrid',name:'Night Club'},isActive:()=>true,toast:(...x)=>events.push(x),refresh:()=>{w.document.querySelector('main').innerHTML=ctrl.render()},client:{rpc:async(name,args)=>{
  calls.push({name,args:cloned(args)});
  if(name==='crm_hospitality_overview')return{data:cloned(overview())};
  if(name==='crm_pos_ledger'){filters=args.p_filters;lastLookup=cloned(filters);return{data:cloned(ledger())}}
  if(name==='crm_pos_cash_overview')return{data:cloned(cash)};
  if(name==='crm_pos_trading_day'){
    if(!can_manage)return{error:{message:'Manager permission required'}};
    if(args.p_action==='start'){if(!active){active={id:'day-1',label:'Saturday service',started_at:'2026-10-10T22:00:00Z',ended_at:null,started_by:'manager',total_cents:1250,bill_count:1};cash.active_shift={trading_day_id:'day-1',opening_float_cents:0,cash_sales_cents:1250,movement_cents:0,expected_cash_cents:1250,movements:[]};}}
    if(args.p_action==='end'){assert.equal(args.p_day,active.id);closed=[{...active,ended_at:'2026-10-11T04:00:00Z'}];active=null;}
    return{data:{day:active||closed[0],open_bills:0}};
  }
  if(name==='crm_pos_cash_command'){
    if(!can_manage)return{error:{message:'Manager permission required'}};
    const c=args.p_command;
    if(cashFault){const result=await cashFault(c,args.p_key,calls);if(result)return result;}
    if(c.action==='opening_float'){cash.active_shift.opening_float_cents=c.amount_cents;cash.active_shift.expected_cash_cents=1250+c.amount_cents;}
    if(c.action==='movement'){const signed=c.kind==='pay_in'?c.amount_cents:-c.amount_cents;cash.active_shift.movement_cents+=signed;cash.active_shift.expected_cash_cents+=signed;cash.active_shift.movements.push(c);}
    if(c.action==='reconcile_close'){const day=active;closed=[{...day,ended_at:'2026-10-11T04:00:00Z'}];cash.recent=[{trading_day_id:day.id,expected_cash_cents:cash.active_shift.expected_cash_cents,counted_cash_cents:c.counted_cents,discrepancy_cents:c.counted_cents-cash.active_shift.expected_cash_cents}];cash.active_shift=null;active=null;}
    return{data:{ok:true}};
  }
  return{error:{message:'Unexpected RPC: '+name}};
 }}};
 ctrl=w.AkiHospitality.create(ctx);ctx.refresh();await wait(15);
 return{w,ctrl,dom,calls,events,get lookup(){return lastLookup},get active(){return active},get closed(){return closed},close(){ctrl.dispose();dom.window.close()}};
}
test('ledger provides closed-bill lookup, account/date/product/price filters and bill trail',async()=>{
 const h=await harness();try{
  await h.ctrl.action({dataset:{action:'hp-switch-view',id:'ledger'}});
  let body=h.w.document.body.textContent;
  assert.match(body,/Sales lookup/);assert.match(body,/Table 7/);
  assert.match(body,/This week/);assert.match(body,/Current trading day/);
  assert.match(body,/Closer Staff/);
  const form=h.w.document.querySelector('[data-form="hp-ledger-search"]');
  form.elements.from_date.value='2026-10-10';form.elements.to_date.value='2026-10-11';
  form.querySelector('[name="item"]').value='Coke';form.elements.table.value='7';form.elements.account.value='staff-1';
  form.elements.min_eur.value='10.00';form.elements.max_eur.value='20.00';
  await h.ctrl.submit(form);
  assert.equal(h.lookup.item,'Coke');assert.equal(h.lookup.min_cents,1000);assert.equal(h.lookup.max_cents,2000);
  assert.equal(h.lookup.from_date,'2026-10-10');assert.equal(h.lookup.to_date,'2026-10-11');
  assert.equal(h.lookup.account,'staff-1');
  await h.ctrl.action({dataset:{action:'hp-ledger-bill',id:'bill-1'}});
  body=h.w.document.body.textContent;
  assert.match(body,/Closed bill/);assert.match(body,/Recorded payments/);assert.match(body,/Activity trail/);
  assert.match(body,/Closer Staff/);
 }finally{h.close()}
});
test('manager starts and ends cross-midnight trading day without calendar midnight reset',async()=>{
 const h=await harness();try{
  await h.ctrl.action({dataset:{action:'hp-switch-view',id:'ledger'}});
  assert.match(h.w.document.body.textContent,/No trading day started/);
  await h.ctrl.action({dataset:{action:'hp-day-start'}});
  assert.equal(h.active.id,'day-1');
  let form=h.w.document.querySelector('[data-form="hp-cash-opening"]');
  form.elements.amount.value='50.00';await h.ctrl.submit(form);
  assert.match(h.w.document.body.textContent,/Saturday service/);
  assert.match(h.w.document.body.textContent,/62.50/);
  await h.ctrl.action({dataset:{action:'hp-cash-open',mode:'cash_drop'}});
  form=h.w.document.querySelector('[data-form="hp-cash-movement"]');form.elements.amount.value='10.00';form.elements.reason.value='Safe drop';await h.ctrl.submit(form);
  await h.ctrl.action({dataset:{action:'hp-day-end'}});
  assert.match(h.w.document.body.textContent,/Count & close trading day/);
  form=h.w.document.querySelector('[data-form="hp-cash-close"]');form.elements.counted.value='52.50';await h.ctrl.submit(form);
  assert.equal(h.closed[0].ended_at,'2026-10-11T04:00:00Z');
  await h.ctrl.action({dataset:{action:'hp-ledger-mode',mode:'days'}});
  assert.match(h.w.document.body.textContent,/Saturday service/);
  await h.ctrl.action({dataset:{action:'hp-ledger-open-day',id:'day-1'}});
  assert.equal(h.lookup.trading_day,'day-1');
  assert.match(h.w.document.body.textContent,/Table 7/);
 }finally{h.close()}
});
test('cash movements are distinct from revenue and mismatches carry a reason',async()=>{
 const h=await harness();try{
  await h.ctrl.action({dataset:{action:'hp-switch-view',id:'ledger'}});await h.ctrl.action({dataset:{action:'hp-day-start'}});
  let form=h.w.document.querySelector('[data-form="hp-cash-opening"]');form.elements.amount.value='20.00';await h.ctrl.submit(form);
  await h.ctrl.action({dataset:{action:'hp-cash-open',mode:'pay_in'}});form=h.w.document.querySelector('[data-form="hp-cash-movement"]');form.elements.amount.value='5.00';form.elements.reason.value='Change top up';await h.ctrl.submit(form);
  await h.ctrl.action({dataset:{action:'hp-day-end'}});form=h.w.document.querySelector('[data-form="hp-cash-close"]');form.elements.counted.value='36.00';form.elements.reason.value='One euro over';await h.ctrl.submit(form);
  const commands=h.calls.filter(x=>x.name==='crm_pos_cash_command').map(x=>x.args.p_command);
  assert.deepEqual(commands.map(x=>x.action),['opening_float','movement','reconcile_close']);
  assert.ok(commands.every(x=>x.trading_day_id==='day-1'));
  assert.equal(commands[1].kind,'pay_in');assert.equal(commands[2].reason,'One euro over');
  assert.equal(h.closed.length,1);
 }finally{h.close()}
});
test('an ambiguous cash response is retried with the same durable key and trading day',async()=>{
 let first=true;
 const h=await harness(true,async command=>{if(command.action==='movement'&&first){first=false;throw Error('Network response lost')}});
 try{
  await h.ctrl.action({dataset:{action:'hp-switch-view',id:'ledger'}});await h.ctrl.action({dataset:{action:'hp-day-start'}});
  let form=h.w.document.querySelector('[data-form="hp-cash-opening"]');form.elements.amount.value='0.00';await h.ctrl.submit(form);
  await h.ctrl.action({dataset:{action:'hp-cash-open',mode:'pay_in'}});form=h.w.document.querySelector('[data-form="hp-cash-movement"]');form.elements.amount.value='5.00';form.elements.reason.value='Change top up';await h.ctrl.submit(form);
  const storageKey='akihq:hospitality:manager:workspace:cash';
  const saved=JSON.parse(h.w.localStorage.getItem(storageKey));assert.equal(saved.command.trading_day_id,'day-1');
  assert.match(h.w.document.body.textContent,/Cash request awaiting confirmation/);
  await h.ctrl.action({dataset:{action:'hp-cash-retry'}});
  assert.equal(h.w.localStorage.getItem(storageKey),null);
  const attempts=h.calls.filter(x=>x.name==='crm_pos_cash_command'&&x.args.p_command.action==='movement');
  assert.equal(attempts.length,2);assert.equal(attempts[0].args.p_key,attempts[1].args.p_key);
  await h.ctrl.action({dataset:{action:'hp-day-end'}});form=h.w.document.querySelector('[data-form="hp-cash-close"]');form.elements.counted.value='5.00';await h.ctrl.submit(form);
 }finally{h.close()}
});
test('staff without manager permission can lookup but cannot start or end day',async()=>{
 const h=await harness(false);try{
  await h.ctrl.action({dataset:{action:'hp-switch-view',id:'ledger'}});
  assert.equal(h.w.document.querySelector('[data-action="hp-day-start"]'),null);
  await h.ctrl.action({dataset:{action:'hp-day-start'}});
  assert.equal(h.calls.filter(x=>x.name==='crm_pos_trading_day').length,0);
  assert.match(h.events.at(-1).join(' '),/Manager permission/);
 }finally{h.close()}
});
test('ledger display escapes product, operator and account details',()=>{
 const w={};new Function('window','globalThis',scripts[3])(w,w);
 const html=w.AkiPosLedger.render({data:{rows:[{id:'evil',label:'<img src=x onerror=alert(1)>',closed_by_name:'<script>',closed_at:'2026-10-10T12:00:00Z',total_cents:100,lines:[{quantity:1,name:'<svg onload=bad()>',unit_price_cents:100}],payments:[]}],total_count:1,limit:30,offset:0,staff:[],trading_days:[],summary:{},timezone:'Europe/Madrid'},currency:'EUR',mode:'bills'});
 assert.doesNotMatch(html,/<img src=/);
 assert.doesNotMatch(html,/<svg onload=/);
 assert.doesNotMatch(html,/<script>/);
});
test('cash reconciliation runtime assets have exact cache versions',()=>{
 const html=readFileSync(new URL('../login.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 for(const asset of ['pos-ledger.js?v=2','pos-ledger.css?v=2','hospitality-pos.js?v=19']){
  assert.match(html,new RegExp(asset.replace(/[.?]/g,'\\$&')));
  assert.match(sw,new RegExp(asset.replace(/[.?]/g,'\\$&')));
 }
 assert.match(sw,/const CACHE = "akihq-v144"/);
});
