import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('integrated app preserves eligibility, analytics and suite scripts before main runtime',()=>{
 const html=read('login.html'),sw=read('sw.js');
 const main=html.indexOf('assets/app-v32.js?');
 for(const asset of ['suite-navigation.js?v=2','account-eligibility.js?v=3','operational-analytics.js?v=1']){
  assert(html.indexOf(asset)>0&&html.indexOf(asset)<main,asset);assert(sw.includes(asset),asset);
 }
 assert(html.includes('operational-analytics.css?v=1'));assert(read('assets/app-v32.js').includes('toolbox.html'));
});
test('integrated release advances offline caches while enabling accepted read-only views and preserving backend gates',()=>{
 const manifest=JSON.parse(read('tools/operations-product-release.json'));
 assert.equal(read('sw.js').match(/const CACHE = "([^"]+)"/)[1],'akihq-v146');
 assert(manifest['sw.js'].some(x=>x.from.includes('akihq-v146')&&x.to.includes('akihq-v150')));
 assert(read('config.js').includes('OPERATIONAL_ANALYTICS_ENABLED: true'));
 assert(read('config.js').includes('TOOLBOX_NOTIFICATIONS_ENABLED: true'));
 assert(read('cloudflare/wrangler.toml').includes('AKIBUSINESS_TOOLBOX_NOTIFICATIONS_ENABLED = \"false\"'));
 assert(read('cloudflare/wrangler.toml').includes('AKIBUSINESS_TOOLBOX_ENABLED = \"false\"'));
 assert(read('config.example.js').includes('ONBOARDING_SCHEMA_READY: false'));
 assert(read('config.example.js').includes('OPERATIONAL_ANALYTICS_ENABLED: false'));
 assert(read('cloudflare/toolbox.js').includes('reconcileOperationsBinding'));
 assert(read('cloudflare/toolbox.js').includes("AKIBUSINESS_OPERATIONS_BILLING_READY==='true'"));
 assert(read('toolbox.html').includes('operations-checkout-link.js'));
});
