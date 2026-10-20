import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('integrated app preserves eligibility, analytics and suite scripts before main runtime',()=>{
 const html=read('index.html'),sw=read('sw.js');
 const main=html.indexOf('assets/app-v32.js?');
 for(const asset of ['suite-navigation.js?v=1','account-eligibility.js?v=2','operational-analytics.js?v=1']){
  assert(html.indexOf(asset)>0&&html.indexOf(asset)<main,asset);assert(sw.includes(asset),asset);
 }
 assert(html.includes('operational-analytics.css?v=1'));assert(read('assets/app-v32.js').includes('toolbox.html'));
});
test('integrated release advances offline caches without enabling paid or account gates',()=>{
 const manifest=JSON.parse(read('tools/operations-product-release.json'));
 assert.equal(read('sw.js').match(/const CACHE = "([^"]+)"/)[1],'akihq-v136');
 assert(manifest['sw.js'].some(x=>x.from.includes('akihq-v136')&&x.to.includes('akihq-v137')));
 assert(read('config.js').includes('OPERATIONAL_ANALYTICS_ENABLED: false'));
 assert(read('config.example.js').includes('ONBOARDING_SCHEMA_READY: false'));
 assert(read('config.example.js').includes('OPERATIONAL_ANALYTICS_ENABLED: false'));
 assert(read('cloudflare/toolbox.js').includes('reconcileOperationsBinding'));
 assert(read('cloudflare/toolbox.js').includes("AKIBUSINESS_OPERATIONS_BILLING_READY==='true'"));
 assert(read('toolbox.html').includes('operations-checkout-link.js'));
});
