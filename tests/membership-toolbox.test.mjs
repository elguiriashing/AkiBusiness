import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require=createRequire(new URL('../cloudflare/package.json',import.meta.url));
const{JSDOM}=require('jsdom');
const page=readFileSync(new URL('../membership.html',import.meta.url),'utf8');
const navigation=readFileSync(new URL('../assets/suite-navigation.js',import.meta.url),'utf8');
const script=readFileSync(new URL('../assets/membership.js',import.meta.url),'utf8');
function fixture(t,query='?locale=en'){
 const dom=new JSDOM(page,{url:'https://akibusiness.com/membership.html'+query,runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;w.fetch=()=>{throw Error('Payment/network must not run from this page');};w.eval(navigation);w.eval(script);return w;
}
const planIds=['basico','standard','pro'];
test('approved monthly tiers are Standard24.99 Plus44.99 Pro64.99 with4/8/12 tools',t=>{
 const w=fixture(t);const cards=[...w.document.querySelectorAll('[data-plan]')];assert.deepEqual(cards.map(x=>x.dataset.plan),planIds);assert.deepEqual(cards.map(x=>x.querySelector('h2').textContent),['Standard','Plus','Pro']);assert.deepEqual(cards.map(x=>x.querySelector('.price strong').dataset.monthly),['24.99','44.99','64.99']);assert.deepEqual(cards.map(x=>x.querySelector('.tool-count strong').textContent),['4/12','8/12','12/12']);assert.match(cards[0].textContent,/1 tool replacement/);assert.match(cards[1].textContent,/2 tool replacements/);assert.match(cards[2].textContent,/Unrestricted tool access/);
});
test('only approved monthly prices are offered; annual billing remains unavailable',t=>{
 const w=fixture(t);assert.equal(w.document.querySelectorAll('[data-cycle],[data-yearly]').length,0);assert.doesNotMatch(page+script,/239\.90|431\.90|623\.90|20%|Annual comparison|Comparación anual/);assert.deepEqual([...w.document.querySelectorAll('[data-copy=period]')].map(n=>n.textContent),['/month','/month','/month']);assert.equal(w.document.querySelectorAll('form,[data-checkout],[data-staged]').length,0);
});
test('tool catalogue retains twelve canonical parent keys and explains active/saved/staff semantics',t=>{
 const w=fixture(t);assert.deepEqual([...w.document.querySelectorAll('[data-tool]')].map(x=>x.dataset.tool),['crm','inbox','tasks','calendar','inventory','pos','sales','marketing','automation','collaboration','employees','knowledge']);assert.match(w.document.querySelector('[data-copy=activeBody]').textContent,/does not activate it early/);assert.match(w.document.querySelector('[data-copy=nextBody]').textContent,/repeated saves do not increase/);assert.match(w.document.querySelector('[data-copy=staffBody]').textContent,/whenever you need/);assert.match(w.document.querySelector('[data-copy=annualRotation]').textContent,/Annual subscribers also rotate monthly/);assert.match(w.document.querySelector('[data-copy=notice]').textContent,/does not include personal Premium or Premium listing upgrades/);
});
test('account handoff retains safe location and language but no arbitrary redirects or credentials',t=>{
 const w=fixture(t,'?locale=es&workspace=ws_example&ref=ALEX1234&next=https://evil.test&access_token=secret');const link=w.document.getElementById('operations-subscription-link');assert.equal(link.href,'https://akipasa.com/es/account/subscription/operations?ref=ALEX1234&workspace=ws_example');assert.equal(w.document.querySelector('[data-copy=back]').getAttribute('href'),'/?locale=es&workspace=ws_example');w.document.getElementById('language').click();assert.equal(link.href,'https://akipasa.com/en/account/subscription/operations?ref=ALEX1234&workspace=ws_example');assert.equal(w.document.getElementById('free-management-link').href,'https://akihq.app/en/business?ref=ALEX1234');assert.equal(link.search.includes('secret'),false);
});
for(const query of['?workspace=ws_example&workspace=ws_other','?workspace=%2F%2Fevil.test','?workspace=aa','?workspace='+ 'a'.repeat(81)])test('invalid or duplicate workspace is never forwarded '+query,t=>{const w=fixture(t,query);assert.equal(new URL(w.document.getElementById('operations-subscription-link').href).searchParams.has('workspace'),false);});
test('EN/ES prices, language controls and theme choices remain accessible',t=>{
 const w=fixture(t,'?locale=es');assert.equal(w.document.documentElement.lang,'es');assert.equal(w.document.querySelector('[data-plan=basico] .price strong').textContent.replaceAll('\u00a0',' '),'24,99 €');assert.match(w.document.getElementById('language').getAttribute('aria-label'),/English/);w.document.getElementById('theme').click();assert.equal(w.document.documentElement.dataset.theme,'light');assert.match(w.document.getElementById('theme').getAttribute('aria-label'),/oscuro/);w.document.getElementById('language').click();assert.equal(w.document.documentElement.lang,'en');assert.match(w.document.getElementById('theme').getAttribute('aria-label'),/dark/);assert.equal(w.document.querySelector('.billing'),null);
});
