import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/fiscal-compliance.js',import.meta.url),'utf8');
const scope={window:{}};vm.runInNewContext(source,scope);
const policy=scope.window.AkiFiscalCompliance;
const baseline={territory:'common_territory',entity_type:'legal_entity',
  subject_to_corporation_tax:true,sii:false,previous_year_iva_turnover:'over_8m',
  tax_regime:'general',currency:'EUR'};
test('2027 corporate SIF and large B2B obligations are separate; issuance stays shut',()=>{
  const result=policy.classify(baseline);
  assert.equal(result.sif_deadline,'2027-01-01');
  assert.equal(result.b2b_issue_deadline,'2027-10-06');
  assert.equal(result.b2b_payment_status_deadline,'2027-10-06');
  assert.equal(result.state_sif_applies,true);
  assert.equal(result.first_release_eligible,true);
  assert.equal(result.fiscal_issuance_enabled,false);
});
test('autónomos have different SIF, B2B, and payment-status dates',()=>{
  const result=policy.classify({...baseline,entity_type:'individual',subject_to_corporation_tax:false,previous_year_iva_turnover:'not_over_8m'});
  assert.deepEqual([result.sif_deadline,result.b2b_issue_deadline,result.b2b_payment_status_deadline],['2027-07-01','2028-10-06','2029-10-06']);
});
test('small legal entities report B2B payment status from 2028',()=>{
  const result=policy.classify({...baseline,previous_year_iva_turnover:'not_over_8m'});
  assert.equal(result.b2b_payment_status_deadline,'2028-10-06');
});
test('SII is outside RRSIF but not outside electronic B2B invoicing',()=>{
  const result=policy.classify({...baseline,sii:true});
  assert.equal(result.state_sif_excluded,true);
  assert.equal(result.sif_deadline,null);
  assert.equal(result.b2b_issue_deadline,'2027-10-06');
  assert.equal(result.first_release_eligible,false);
});
test('Basque and Navarra rules never masquerade as common-territory VERI*FACTU',()=>{
  for(const territory of ['basque_foral','navarra_foral']){
    const result=policy.classify({...baseline,territory});
    assert.equal(result.sif_deadline,null);
    assert.equal(result.state_sif_excluded,true);
    assert.equal(result.first_release_eligible,false);
    assert.match(result.needs_review.join(' '),/Different fiscal/);
  }
});
test('IGIC and IPSI territories are within state SIF scope but outside IVA adapter',()=>{
  for(const territory of ['canary_islands','ceuta','melilla']){
    const result=policy.classify({...baseline,territory});
    assert.equal(result.sif_deadline,'2027-01-01');
    assert.equal(result.first_release_eligible,false);
  }
});
test('unknown tax/turnover/organisation details must not invent deadlines',()=>{
  const result=policy.classify({});
  assert.equal(result.sif_deadline,null);
  assert.equal(result.b2b_issue_deadline,null);
  assert.equal(result.b2b_payment_status_deadline,null);
  assert.equal(result.first_release_eligible,false);
  assert.equal(result.fiscal_issuance_enabled,false);
  assert.ok(result.needs_review.length>=4);
});
test('invalid jurisdiction or inconsistent field types fail without guessing',()=>{
  assert.throws(()=>policy.classify({territory:'neverland'}),/Unknown tax territory/);
  assert.throws(()=>policy.classify({...baseline,previous_year_iva_turnover:'maybe'}),/Turnover band/);
  assert.throws(()=>policy.classify({...baseline,sii:'false'}),/SII status/);
  assert.throws(()=>policy.classify({...baseline,subject_to_corporation_tax:'true'}),/Corporation tax status/);
});
test('versioned official sources and read-only API exposed',()=>{
  assert.match(policy.SOURCES.b2b,/agenciatributaria/);
  assert.equal(policy.DATES.b2b_status_individual,'2029-10-06');
  assert.equal(Object.isFrozen(policy.DATES),true);
});
