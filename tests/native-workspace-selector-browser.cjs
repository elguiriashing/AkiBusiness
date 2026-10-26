"use strict";
const { chromium, expect } = require(process.env.AKIBUSINESS_PLAYWRIGHT_PATH || require('node:path').resolve(__dirname,'../../akipasa/node_modules/@playwright/test'));
const exercisePointerBrowsing=require("./selector-pointer-acceptance.cjs");
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test-results/native-account/workspace-selector');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://fixture');
 if(url.pathname==='/selector'){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html data-theme="${url.searchParams.get('theme')==='light'?'light':'dark'}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/aki-selector.css"><link rel="stylesheet" href="/assets/workspace-selector.css"><style>*{box-sizing:border-box}html{--surface:#17213a;--ink:#f6f4f1;--muted:#b4bfd1;--line:#ffffff30;background:#11192e;color:var(--ink)}html[data-theme=light]{--surface:#fff;--ink:#172238;--muted:#526078;--line:#d5dce6;background:#f8f9fc}body{margin:0;padding:24px;font:16px system-ui}main{max-width:480px;margin:auto}input{width:100%;min-height:44px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:8px}</style></head><body><main><input aria-label="Draft email" value="fixture@example.invalid"><aside id="picker"></aside></main><script src="/assets/suite-navigation.js"></script><script src="/assets/workspace-selector.js"></script><script>AkiWorkspaceSelector.mount(document.getElementById('picker'),new URLSearchParams(location.search).get('locale'),'business')</script></body></html>`);return;
 }
 const target=path.resolve(root,'.'+(url.pathname==='/account'?'/account.html':url.pathname));if(!target.startsWith(root+path.sep)){res.writeHead(404).end();return;}
 try{res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.svg')?'image/svg+xml':url.pathname.endsWith('.woff2')?'font/woff2':'text/html');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.AKIBUSINESS_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const locale of ['en','es'])for(const theme of ['light','dark'])for(const width of [390,820,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:theme==='dark'?'reduce':'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/selector?locale=${locale}&theme=${theme}&ref=AKI12345`);
   await expect(page.locator('.aki-workspace-picker').getByRole('link')).toHaveCount(5);await expect(page.getByRole('link',{name:'AkiBusiness',exact:true})).toHaveAttribute('data-selected','true');
   await exercisePointerBrowsing(page,expect,locale);
   await page.getByRole('link',{name:'AkiBusiness',exact:true}).focus();await page.keyboard.press('Home');
   for(const name of ['AkiPasa','AkiDuermo','AkiCoches','AkiHQ','AkiBusiness']){
    await expect(page.getByRole('link',{name,exact:true})).toHaveAttribute('data-selected','true');await expect(page.getByRole('link',{name,exact:true})).toBeFocused();
    await expect(page.getByRole('textbox',{name:'Draft email'})).toHaveValue('fixture@example.invalid');const link=page.getByRole('link',{name,exact:true});expect(new URL(await link.getAttribute('href')).searchParams.get('ref')).toBe('AKI12345');
    if(locale==='en'&&theme==='light'&&width===820){
     const actor=link.locator('.aks-selector__arrival-actor');
     await expect.poll(()=>actor.evaluate(node=>+getComputedStyle(node).opacity)).toBeGreaterThan(.4);
     expect(await actor.evaluate(node=>getComputedStyle(node).animationIterationCount)).toBe('1');
     await expect.poll(()=>actor.evaluate(node=>+getComputedStyle(node).opacity)).toBe(0);
     await expect.poll(()=>link.locator('.aks-selector__sustain').evaluate(node=>+getComputedStyle(node).opacity)).toBe(1);
    }
    await page.keyboard.press('ArrowRight');
   }
   await page.keyboard.press('End');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(await page.locator('.aks-selector__symbol img').evaluateAll(nodes=>nodes.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);expect(await page.locator(".aks-selector__scene").evaluate(node=>node.scrollLeft)).toBe(0);expect(errors).toEqual([]);
   for(const bounds of await page.locator('.aks-selector__card[data-selected=true]').evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})))){expect(bounds.width).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeGreaterThanOrEqual(44);}
   if(theme==='dark')expect(await page.locator('.aks-selector__effect-orbit').first().evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
   await page.screenshot({path:path.join(output,`business-${locale}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});
   await page.route('**/config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.AKIHQ_CONFIG={SUPABASE_URL:"https://fixture.invalid",SUPABASE_ANON_KEY:"disposable"}'}));
   await page.route('**/assets/supabase.js',route=>route.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null}})}})}'}));
   await page.addInitScript(value=>localStorage.setItem('akipasa.theme',value),theme);
   await page.goto(`http://127.0.0.1:${server.address().port}/account?locale=${locale}&ref=AKI12345`);
   await expect(page.locator('.aki-workspace-picker').getByRole('link')).toHaveCount(5);
   const draft=page.locator('#signin input[name=email]');await draft.fill('draft@example.invalid');
   await page.getByRole('link',{name:'AkiBusiness',exact:true}).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
   await expect(draft).toHaveValue('draft@example.invalid');await expect(page.getByRole('link',{name:'AkiDuermo',exact:true})).toHaveAttribute('href',`https://akiduermo.com/account?lang=${locale}&ref=AKI12345`);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   if(width<800){const picker=await page.locator('.aki-workspace-picker').boundingBox(),forms=await page.locator('.auth-forms').boundingBox();expect(picker.y).toBeGreaterThanOrEqual(forms.y+forms.height);}
   expect(await page.locator(".aks-selector__scene").evaluate(node=>node.scrollLeft)).toBe(0);expect(errors).toEqual([]);await page.screenshot({path:path.join(output,`account-guest-${locale}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});await expect(page.locator('.aks-selector__footer, .aki-workspace-picker__action')).toHaveCount(0);
   const opened=[];await page.route(/^https:\/\/(akipasa\.com|akiduermo\.com|akicoches\.com|akihq\.app|akibusiness\.com)\//,route=>{opened.push(route.request().url());return route.fulfill({contentType:'text/html',body:'<h1>Workspace destination</h1>'});});
   const scene=page.locator('.aks-selector__scene');
   await scene.dispatchEvent('pointerdown',{pointerType:'touch',isPrimary:true,pointerId:7,clientX:240,clientY:80,bubbles:true});
   await scene.dispatchEvent('pointerup',{pointerType:'touch',isPrimary:true,pointerId:7,clientX:130,clientY:82,bubbles:true});
   await expect(page.getByRole('link',{name:'AkiCoches',exact:true})).toHaveAttribute('data-selected','true');
   await page.getByRole('link',{name:'AkiDuermo',exact:true}).dispatchEvent('click',{bubbles:true,cancelable:true});
   await expect(draft).toHaveValue('draft@example.invalid');expect(opened).toEqual([]);
   await page.getByRole('link',{name:'AkiHQ',exact:true}).click();
   await expect(page).toHaveURL(`https://akihq.app/${locale}/auth?ref=AKI12345`);expect(opened).toHaveLength(1);
   await page.close();
  }
  console.log(JSON.stringify({cases:12,status:'passed',scope:'Static AkiSelector login adapter; language/theme/viewport/keyboard/referral/draft/reduced-motion fixtures'}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
