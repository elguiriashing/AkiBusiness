import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../cloudflare/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
function fixture(locale) {
  const dom = new JSDOM('<input aria-label="Draft email" value="fixture@example.invalid"><aside id="picker"></aside>', {url:`https://akibusiness.com/login?locale=${locale}&ref=AKI12345&access_token=must-not-cross`,runScripts:'outside-only'});
  for (const name of ['suite-navigation','workspace-selector']) dom.window.eval(readFileSync(new URL(`../assets/${name}.js`,import.meta.url),'utf8'));
  const host=dom.window.document.getElementById('picker');dom.window.AkiWorkspaceSelector.mount(host,locale,'business');
  return {dom,host,document:dom.window.document};
}
for (const locale of ['en','es']) test(`five-product icons are direct localized links in ${locale}`,()=>{
  const {dom,host,document}=fixture(locale);
  assert.equal(host.querySelectorAll('a.aks-selector__card').length,5);
  assert.equal(host.querySelector('[data-selected="true"]').getAttribute('aria-label'),'AkiBusiness');
  assert.equal(host.querySelector('[aria-current="page"]').getAttribute('aria-label'),'AkiBusiness');
  assert.equal(host.querySelector('.aks-selector__footer, .aki-workspace-picker__action, button'),null);
  for (const [name,origin,path] of [['AkiPasa','https://akipasa.com',`/${locale}/auth`],['AkiDuermo','https://akiduermo.com','/account'],['AkiCoches','https://akicoches.com','/account'],['AkiHQ','https://akihq.app',`/${locale}/auth`],['AkiBusiness','https://akibusiness.com','/login']]) {
    const target=new URL(host.querySelector(`[aria-label="${name}"]`).href);
    assert.equal(target.origin,origin);assert.equal(target.pathname,path);assert.equal(target.searchParams.get('ref'),'AKI12345');assert.equal(target.searchParams.has('access_token'),false);
    if (['AkiDuermo','AkiCoches'].includes(name)) assert.equal(target.searchParams.get('lang'),locale);
    assert.equal(document.querySelector('input').value,'fixture@example.invalid');assert.equal(dom.window.location.pathname,'/login');
  }
  dom.window.close();
});
test('keyboard browsing keeps the draft and focuses the icon itself',()=>{
  const {dom,host,document}=fixture('en');
  const initial=host.querySelector('[aria-label="AkiBusiness"]');initial.focus();
  initial.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
  const first=host.querySelector('[aria-label="AkiPasa"]');
  assert.equal(document.activeElement,first);
  first.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(document.activeElement.getAttribute('aria-label'),'AkiDuermo');
  assert.equal(host.querySelector('[data-selected="true"]').getAttribute('aria-label'),'AkiDuermo');
  assert.match(document.activeElement.href,/akiduermo.com/);
  assert.equal(dom.window.location.pathname,'/login');
  dom.window.close();
});
