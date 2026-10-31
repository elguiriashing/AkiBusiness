import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../assets/pos-settlement.js',import.meta.url),'utf8');
const scope={window:{}};vm.runInNewContext(code,scope);
const {parseProviderCSV,compare}=scope.window.AkiPosSettlement;
const feed={currency:'EUR',payments:[
  {id:'p1',kind:'payment',method:'card',reference:'T-001',amount_cents:1250,status:'closed'},
  {id:'p2',kind:'payment',method:'card',reference:'T-002',amount_cents:500,status:'open'},
  {id:'p3',kind:'reversal_note',method:'card',reference:'T-003',amount_cents:100,status:'closed'}
],refunds:[
  {id:'r1',kind:'refund',method:'card',reference:'R-001',amount_cents:300,status:'operator_attested',fiscal_correction_reference:'R2026-8'}
]};
test('provider CSV handles BOM, quoted values and semicolon separators without floating amounts',()=>{
 const parsed=parseProviderCSV('\uFEFFreference;kind;amount;currency;fee\r\n"T;1";payment;12.50;EUR;0.15\r\nR-2;refund;3;EUR;0');
 assert.equal(parsed.length,2);
 assert.deepEqual({...parsed[0]},{reference:'T;1',kind:'payment',amount_cents:1250,fee_cents:15});
 assert.equal(parsed[1].amount_cents,300);
});
test('exact matching never claims that card capture or bank settlement has been verified',()=>{
 const result=compare(feed,parseProviderCSV('reference,kind,amount,currency,fee\nT-001,payment,12.50,EUR,0.20\nT-002,payment,5,EUR,0.10\nR-001,refund,3.00,EUR,0.00'));
 assert.equal(result.matched_statement_only,2);
 assert.equal(result.needs_review,2); // unposted order plus unverifiable reversal note
 assert.equal(result.provider_verified,false);
 assert.equal(result.bank_settlement_verified,false);
 assert.equal(result.totals.expected_net_from_provider_csv_cents,1420);
 assert.equal(result.differences.find(x=>x.reference==='T-002').status,'open_order_requires_review');
});
test('missing, duplicated and altered provider amounts produce explicit reconciliation exceptions',()=>{
 const statement=parseProviderCSV('reference,kind,amount,currency\nT-001,payment,11.00,EUR\nT-001,payment,12.50,EUR\nUNSEEN,payment,7.00,EUR\nR-001,refund,4.00,EUR');
 const result=compare(feed,statement);
 assert.equal(result.differences.find(x=>x.reference==='T-001').status,'duplicate_provider_reference');
 assert.equal(result.differences.find(x=>x.reference==='T-002').status,'missing_in_provider_statement');
 assert.equal(result.differences.find(x=>x.reference==='UNSEEN').status,'not_found_in_pos');
 assert.equal(result.differences.find(x=>x.reference==='R-001').status,'amount_mismatch');
});
test('recorded matching refund still requires fiscal review without a correction reference',()=>{
 const bad={...feed,refunds:[{...feed.refunds[0],fiscal_correction_reference:null}]};
 const result=compare(bad,parseProviderCSV('reference,kind,amount,currency\nR-001,refund,3.00,EUR'));
 assert.equal(result.differences.find(x=>x.reference==='R-001').status,'fiscal_correction_requires_review');
});
test('statement refuses unsupported FX, malformed quote, negative floats and column surprises',()=>{
 for(const contents of [
  'reference,kind,amount,currency\nREF,payment,12.00,USD',
  'reference,kind,amount,currency\nREF,payment,-12.00,EUR',
  'reference,kind,amount,currency\nREF,payment,12.001,EUR',
  'reference,kind,amount,currency\n"REF,payment,12.00,EUR',
  'reference,kind,amount,currency\nREF,payment,12.00,EUR,unexpected',
  'reference,kind,amount,currency,mystery\nREF,payment,12.00,EUR,test'
 ])assert.throws(()=>parseProviderCSV(contents));
});
test('duplicate POS references cannot be silently counted twice',()=>{
 const duplicated={...feed,payments:[feed.payments[0],{...feed.payments[0],id:'p-other'}]};
 const result=compare(duplicated,parseProviderCSV('reference,kind,amount,currency\nT-001,payment,12.50,EUR'));
 assert.equal(result.differences.filter(x=>x.reference==='T-001').length,2);
 assert.ok(result.differences.filter(x=>x.reference==='T-001').every(x=>x.status==='duplicate_pos_reference'));
});
