/* Inert real-browser suite navigation acceptance; no backend, payments or messages. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.AKIHQ_PLAYWRIGHT_PATH || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets/app-v32.js'),'utf8');
const seam=`
  authUser={id:'navigation-fixture',email:'fixture@example.invalid'};authRole='administrator';
  state.workspace.canAdminister=true;state.workspace.canOperate=true;state.currentUserId=authUser.id;
  state.employees=[{id:authUser.id,name:'Disposable operator',role:'Administrator'}];
  getSupabaseClient=()=>null;
  window.__suiteAudit={settings:()=>{ui.route='settings';render();}};
  render();
})();`;
assert.match(source,/  boot\(\);\s*\}\)\(\);\s*$/);
const app=source.replace(/  boot\(\);\s*\}\)\(\);\s*$/,seam);
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://fixture.invalid');const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}if(url.pathname==='/assets/app-v32.js'){res.setHeader('Content-Type','text/javascript');res.end(app);return;}if(url.pathname==='/config.js'||url.pathname==='/assets/supabase.js'){res.setHeader('Content-Type','text/javascript');res.end('window.AKIHQ_CONFIG={};window.supabase={createClient:()=>null};');return;}try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;let browser;
try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/tmp/akisuite-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 let cases=0;const output=path.join(root,'test-results/suite-navigation');fs.mkdirSync(output,{recursive:true});
 for(const [width,height] of [[390,844],[768,1024],[1024,768],[1440,900]]) for(const locale of ['en','es']) {
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/?locale=${locale}&ref=ALEX1234`);await page.waitForFunction(()=>window.__suiteAudit);assert.equal(await page.locator('html').getAttribute('lang'),locale);
 const menu=page.locator('.suite-app-menu');await menu.locator('summary').click();
 for(const [product,expected] of Object.entries({AkiPasa:`https://akipasa.com/${locale}`,AkiDuermo:`https://akiduermo.com/?lang=${locale}`,AkiCoches:`https://akicoches.com/?lang=${locale}`,AkiHQ:`https://akihq.app/${locale}/business`,AkiBusiness:`https://akibusiness.com/?locale=${locale}`})) {
 const link=menu.getByRole('link',{name:new RegExp(`^${product}(?:\\s*Current)?$`)});const href=new URL(await link.getAttribute('href'));assert.equal(href.searchParams.get('ref'),'ALEX1234');href.searchParams.delete('ref');assert.equal(href.toString(),expected);
 }
 assert.equal(await menu.getByRole('link',{name:locale==='es'?'Aplicar invitación de referido':'Apply referral invitation'}).getAttribute('href'),`https://akipasa.com/${locale}/referrals?ref=ALEX1234`);
 await page.screenshot({path:path.join(output,`selector-${locale}-${width}.png`)});
 await page.goto(`${base}/membership.html?locale=${locale}`);await page.waitForFunction(()=>document.querySelector('[data-copy=back]').getAttribute('href').includes('locale='));assert.equal(await page.locator('[data-copy=back]').getAttribute('href'),`/?locale=${locale}`);
 await page.locator('#language').click();const other=locale==='en'?'es':'en';assert.equal(await page.locator('html').getAttribute('lang'),other);assert.equal(await page.locator('[data-copy=back]').getAttribute('href'),`/?locale=${other}`);
 assert.deepEqual(errors,[]);await context.close();cases++;
 }
 console.log(JSON.stringify({cases,status:'passed',scope:'inert static navigation, real Chromium, EN/ES, mobile/tablet/desktop'}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
