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
  assert.equal(host.querySelectorAll('button.aks-selector__browse').length,2);
  assert.equal(host.querySelector('.aks-selector__footer, .aki-workspace-picker__action'),null);
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
test('swipe compatibility clicks are blocked but later keyboard activation is allowed',()=>{
 const {dom,host,document}=fixture('en'),scene=host.querySelector('.aks-selector__scene'),outcomes=[];
 const swipe=()=>{for(const [type,x] of [['pointerdown',220],['pointerup',100]]){const event=new dom.window.Event(type,{bubbles:true});Object.assign(event,{pointerType:'touch',pointerId:1,clientX:x,clientY:100});scene.dispatchEvent(event);}};
 document.addEventListener('click',event=>{outcomes.push(event.defaultPrevented);event.preventDefault();});
 swipe();host.querySelector('[aria-label=AkiBusiness]').click();
 swipe();const icon=host.querySelector('[data-selected=true]');icon.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));icon.click();
 assert.deepEqual(outcomes,[true,false]);dom.window.close();
});
test('mouse energy previews crossfade independently from link selection and touch',()=>{
 const {dom,host,document}=fixture('en');
 const initial=host.querySelector('[data-selected=true]'),pasa=host.querySelector('[aria-label=AkiPasa]');
 initial.focus();const left=pasa.style.left;
 const enter=type=>{const event=new dom.window.Event('pointerenter');Object.assign(event,{pointerType:type});pasa.dispatchEvent(event);};
 enter('touch');assert.equal(initial.dataset.energized,'true');
 enter('mouse');assert.equal(pasa.dataset.energized,'true');assert.equal(initial.dataset.energized,'false');
 assert.equal(initial.dataset.selected,'true');assert.equal(document.activeElement,initial);assert.equal(pasa.style.left,left);
 assert.equal(initial.querySelectorAll('.aks-selector__particles i').length,10);
 assert(initial.querySelector('.aks-selector__ignition'));
 host.querySelector('.aks-selector__scene').dispatchEvent(new dom.window.Event('pointerleave'));
 assert.equal(initial.dataset.energized,'true');assert.equal(pasa.dataset.energized,'false');
 assert.equal(document.querySelector('input').value,'fixture@example.invalid');dom.window.close();
});
test('each login icon has its own decorative one-shot story and separate idle material',()=>{
 const {dom,host}=fixture('en');
 for(const id of ['pasa','duermo','coches','hq','business']){
  const card=host.querySelector(`[data-arrival="${id}"]`);assert(card);
  assert.equal(card.querySelector('.aks-selector__arrival').getAttribute('aria-hidden'),'true');
  assert(card.querySelector('.aks-selector__arrival-actor'));assert(card.querySelector('.aks-selector__sustain'));
 }
 assert.equal(host.querySelectorAll('[data-energized=true]').length,1);dom.window.close();
});
test('mouse drag and circular controls browse in place, cancel safely, and preserve direct clicks',()=>{
 const {dom,host,document}=fixture('en'),scene=host.querySelector('.aks-selector__scene');
 const send=(type,x)=>{const event=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerType:'mouse',pointerId:4,clientX:x,clientY:100,button:0,isPrimary:true});scene.dispatchEvent(event);};
 send('pointerdown',220);send('pointermove',140);assert.equal(scene.dataset.dragging,'true');send('pointerup',100);
 assert.equal(host.querySelector('[data-selected=true]').getAttribute('aria-label'),'AkiPasa');assert.equal(scene.dataset.dragging,undefined);
 const outcomes=[];document.addEventListener('click',event=>{if(event.target.closest('a')){outcomes.push(event.defaultPrevented);event.preventDefault();}});
 host.querySelector('[aria-label=AkiDuermo]').click();send('pointerdown',200);send('pointerup',202);host.querySelector('[aria-label=AkiDuermo]').click();assert.deepEqual(outcomes,[true,false]);
 host.querySelector('[aria-label="Next option"]').click();assert.equal(host.querySelector('[data-selected=true]').getAttribute('aria-label'),'AkiDuermo');
 send('pointerdown',220);send('pointermove',140);send('pointercancel',140);assert.equal(scene.dataset.dragging,undefined);assert.equal(scene.style.getPropertyValue('--aks-drag-offset'),'');
 host.querySelector('[aria-label="Previous option"]').click();assert.equal(host.querySelector('[data-selected=true]').getAttribute('aria-label'),'AkiPasa');
 assert.equal(document.querySelector('input').value,'fixture@example.invalid');dom.window.close();
});
