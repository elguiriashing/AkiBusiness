const {chromium}=require(process.env.AKIBUSINESS_PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.env.AKIBUSINESS_SITE_ROOT || path.join(__dirname,'..')),output=process.env.AKIBUSINESS_BROWSER_ARTIFACTS || path.join(root,'..','business-audit-browser');
fs.mkdirSync(output,{recursive:true});
const app=fs.readFileSync(path.join(root,'assets/app-v32.js'),'utf8');
const seam=`
  authUser={id:'00000000-0000-4000-8000-000000000001',email:'operator@example.invalid'};authRole='user';state=seedState();
  state.workspace={...state.workspace,id:'fixture',name:'Luna Coffee & Kitchen',role:'owner',canOperate:true,canAdminister:true,canExport:true,toolKeys:['dashboard','crm','inbox','tasks','calendar','inventory','pos','sales','marketing','automation','collaboration','employees','knowledge','integrations'],exportToolKeys:['inventory','sales']};
  state.currentUserId=authUser.id;state.employees=[{id:authUser.id,name:'Sofia Martin',email:'operator@example.invalid',role:'Owner',department:'Operations',location:'Madrid'}];
  state.contacts=[{id:'contact',name:'Oliver Torres',email:'oliver@example.invalid',role:'Buyer',companyId:'company'}];
  state.companies=[{id:'company',name:'Sunday Studio',city:'Madrid',status:'Customer'}];
  state.tasks=[{id:'task',title:'Confirm Friday delivery',description:'Check coffee order with our supplier.',status:'todo',priority:'high',assigneeId:authUser.id,dueDate:'2026-10-20',projectId:'project'}];
  state.projects=[{id:'project',name:'Autumn menu',status:'Active',ownerId:authUser.id,dueDate:'2026-11-01'}];
  state.events=[{id:'event',title:'Team briefing',start:'2026-10-27T09:00:00Z',end:'2026-10-27T10:00:00Z',location:'Main kitchen',type:'Team'}];
  state.invoices=[{id:'invoice',number:'INV-2026-0042',companyId:'company',type:'Invoice',status:'Sent',issueDate:'2026-10-01',dueDate:'2026-10-15',total:450,tax:50}];
  state.products=[{id:'product',inventoryItemId:'00000000-0000-4000-8000-000000000002',name:'House coffee',sku:'COFFEE-1',status:'Active',stock:8,price:3.5,reorderAt:10,safetyStock:5,leadTimeDays:2,category:'Coffee',unit:'bag'}];
  state.knowledge=[{id:'article',title:'Opening the coffee bar',category:'Operations',authorId:authUser.id,content:'## Before service\\n\\nCheck the grinder, prepare the counter and review today’s reservations.',reviewDate:'2026-11-01',updatedAt:new Date().toISOString()}];
  state.campaigns=[{id:'campaign',name:'Autumn tasting evening',channel:'Email',audience:'Opted-in regulars',status:'Draft',subject:'Join our autumn tasting',content:'A new menu, familiar faces. Join us on Friday.',sent:0,opened:0,clicked:0,conversions:0}];
  state.automations=[{id:'rule',name:'Daily follow-up',recipe:'overdue',status:'Active',trigger:'Overdue task',conditions:['Open work'],actions:['Create follow-up task']}];
  state.teamChat={workspaceId:'fixture',activeChannelId:'general',channels:[{id:'general',name:'general',description:'Daily service updates'}],messages:{general:[{id:'message',authorId:authUser.id,authorName:'Sofia',text:'The new menu is ready for review.',at:new Date().toISOString()}]}};
  state.settings.locale=new URLSearchParams(location.search).get('locale')||'en';state.settings.theme=new URLSearchParams(location.search).get('theme')||'dark';ui.calendarDate=new Date('2026-10-01T12:00Z');
  getSupabaseClient=()=>({rpc:async(name)=>name==='crm_rota_overview'?{data:{manage:true,data:{settings:{title:'Luna',timezone:'Europe/Madrid',timeFormat:'24'},staff:[],shifts:[],absences:[],templates:[]},revision:0,members:[]}}:{data:null,error:{message:'Isolated fixture: no provider writes'}}});
  window.mailConnected=false;window.mailSends=0;
  socialGatewayRequest=async(path)=>{
    if(path.endsWith('/messages'))return {messages:[{id:'mail-one',subject:'Delivery question',from:'customer@example.invalid',text:'Can we collect on Friday?'}]};
    if(path.includes('/message?'))return {message:{id:'mail-one',subject:'Delivery question',from:'customer@example.invalid',text:'Can we collect on Friday? <script>window.mailInjection=true</script>'}};
    if(path.endsWith('/reply')){window.mailSends++;return {status:'accepted'};}
    return {ok:true,connected:window.mailConnected,configured:true,email:'luna@example.invalid',providers:['gmail','outlook'],canManage:true,canSend:true};
  };
  persist=()=>{};syncCloudWorkspacePushNow=async()=>{};upsertDurableRecord=async()=>{};
  window.__tools={route:value=>{ui.route=value;render();},empty:()=>{for(const key of ['contacts','companies','deals','tasks','projects','events','products','invoices','campaigns','automations','knowledge'])state[key]=[];render();},state,ui};
  ui.route='tasks';render();
})();`;
const testApp=app.replace(/  boot\(\);\s*\}\)\(\);\s*$/,seam);
let server,browser;
(async()=>{
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://local'),p=url.pathname==='/'?'/login.html':url.pathname;
    if(p==='/assets/app-v32.js'){res.setHeader('content-type','text/javascript');return res.end(testApp);}
    if(p==='/config.js'||p==='/assets/supabase.js'){res.setHeader('content-type','text/javascript');return res.end('window.AKIHQ_CONFIG={};window.supabase={createClient:()=>null};');}
    const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
    try{res.setHeader('content-type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
  }).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
  const results=[];
  for(const width of [390,768,1440])for(const locale of ['en','es'])for(const theme of ['dark','light']){
    const page=await browser.newPage({viewport:{width,height:960},serviceWorkers:'block'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(base+'/?locale='+locale+'&theme='+theme);await page.locator('[data-tool="tasks"]').waitFor();
    for(const tool of ['crm','inbox','tasks','calendar','inventory','pos','sales','marketing','automation','collaboration','employees','knowledge','rotas']){
      await page.evaluate(tool=>window.__tools.route(tool),tool);await page.locator('[data-tool="'+tool+'"]').waitFor();
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      results.push({tool,width,locale,theme,overflow,errors:[...errors]});
      if(locale==='en'&&theme==='dark')await page.screenshot({path:path.join(output,tool+'-'+width+'.png'),fullPage:true});
    }
    await page.evaluate(()=>window.__tools.route('tasks'));await page.locator('[data-workflow-search]').fill('does not exist');assert.equal(await page.locator('.task-card').count(),0);
    await page.locator('[data-workflow-search]').fill('Confirm');assert.equal(await page.locator('.task-card').count(),1);
    await page.evaluate(()=>window.__tools.route('calendar'));await page.locator('[data-action="workflow-filter"][data-value="agenda"]').click();assert.equal(await page.locator('.agenda-row').count(),1);
    await page.evaluate(()=>window.__tools.route('knowledge'));await page.locator('[data-workflow-search]').fill('Opening');assert.equal(await page.locator('.knowledge-item').count(),1);
    await page.evaluate(()=>{window.mailConnected=true;window.__tools.route('inbox');});await page.locator('[data-action="business-mail-refresh"]').click();
    await page.locator('[data-action="business-mail-open"]').click();await page.locator('[data-form="business-mail-reply"] textarea').fill('Friday works.');
    assert.equal(await page.evaluate(()=>window.mailInjection),undefined);
    if(width===390){await page.locator('[data-action="business-mail-back"]').click();assert(await page.locator('[data-action="business-mail-open"]').isVisible());await page.locator('[data-action="business-mail-open"]').click();await page.locator('[data-form="business-mail-reply"] textarea').fill('Friday works.');}
    await page.locator('[data-form="business-mail-reply"] button[type="submit"]').click();await page.getByRole('status').filter({hasText:locale==='es'?'Aceptado':'Accepted'}).waitFor();assert.equal(await page.evaluate(()=>window.mailSends),1);
    await page.evaluate(()=>{window.__tools.empty();window.__tools.state.pipelines=[];window.__tools.route('crm');});assert.equal(await page.locator('[data-action="add-pipeline"]').count(),1);
    await page.locator('[data-action="add-pipeline"]').click();assert.equal(await page.locator('.kanban-column').count(),5);
    await page.close();
  }
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
  const failed=results.filter(r=>r.overflow||r.errors.length);console.log(JSON.stringify({checks:results.length,failed},null,2));assert.equal(failed.length,0);
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
