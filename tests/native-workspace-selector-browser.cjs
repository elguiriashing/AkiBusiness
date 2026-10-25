"use strict";
const { chromium, expect } = require(process.env.AKIBUSINESS_PLAYWRIGHT_PATH || require('node:path').resolve(__dirname,'../../akipasa/node_modules/@playwright/test'));
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test-results/native-account/workspace-selector');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://fixture');
 if(url.pathname==='/selector'){
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html data-theme="${url.searchParams.get('theme')==='light'?'light':'dark'}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/aki-selector.css"><link rel="stylesheet" href="/assets/workspace-selector.css"><style>*{box-sizing:border-box}html{--surface:#17213a;--ink:#f6f4f1;--muted:#b4bfd1;--line:#ffffff30;background:#11192e;color:var(--ink)}html[data-theme=light]{--surface:#fff;--ink:#172238;--muted:#526078;--line:#d5dce6;background:#f8f9fc}body{margin:0;padding:24px;font:16px system-ui}main{max-width:480px;margin:auto}input{width:100%;min-height:44px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:8px}</style></head><body><main><input aria-label="Draft email" value="fixture@example.invalid"><aside id="picker"></aside></main><script src="/assets/suite-navigation.js"></script><script src="/assets/workspace-selector.js"></script><script>AkiWorkspaceSelector.mount(document.getElementById('picker'),new URLSearchParams(location.search).get('locale'),'business')</script></body></html>`);return;
 }
 const target=path.resolve(root,'.'+url.pathname);if(!target.startsWith(root+path.sep)){res.writeHead(404).end();return;}
 try{res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'image/svg+xml');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.AKIBUSINESS_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const locale of ['en','es'])for(const theme of ['light','dark'])for(const width of [390,820,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:theme==='dark'?'reduce':'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/selector?locale=${locale}&theme=${theme}&ref=AKI12345`);
   await expect(page.getByRole('radio')).toHaveCount(5);await expect(page.getByRole('radio',{name:'AkiBusiness',exact:true})).toHaveAttribute('aria-checked','true');
   await page.getByRole('radio',{name:'AkiBusiness',exact:true}).focus();await page.keyboard.press('Home');
   for(const name of ['AkiPasa','AkiDuermo','AkiCoches','AkiHQ','AkiBusiness']){
    await expect(page.getByRole('radio',{name,exact:true})).toHaveAttribute('aria-checked','true');await expect(page.getByRole('radio',{name,exact:true})).toBeFocused();
    await expect(page.getByRole('textbox',{name:'Draft email'})).toHaveValue('fixture@example.invalid');const link=page.locator('.aki-workspace-picker__action a');if(await link.count())expect(new URL(await link.getAttribute('href')).searchParams.get('ref')).toBe('AKI12345');await page.keyboard.press('ArrowRight');
   }
   await page.keyboard.press('End');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(await page.locator('.aks-selector__symbol img').evaluateAll(nodes=>nodes.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);expect(errors).toEqual([]);
   for(const bounds of await page.locator('.aks-selector__nav').evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})))){expect(bounds.width).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeGreaterThanOrEqual(44);}
   if(theme==='dark')expect(await page.locator('.aks-selector__effect-orbit').first().evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
   await page.screenshot({path:path.join(output,`business-${locale}-${theme}-${width}.png`),fullPage:true});await page.close();
  }
  console.log(JSON.stringify({cases:12,status:'passed',scope:'Static AkiSelector login adapter; language/theme/viewport/keyboard/referral/draft/reduced-motion fixtures'}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
