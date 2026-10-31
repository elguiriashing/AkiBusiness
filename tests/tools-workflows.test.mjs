import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../cloudflare/package.json',import.meta.url));
const {JSDOM}=require('jsdom');
const source=await readFile(new URL('../assets/app-v32.js',import.meta.url),'utf8');
async function fixture() {
  const dom=new JSDOM('<div id="app"></div><div id="portal"></div><input id="import-file"><input id="media-file">',{url:'https://fixture.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window; w.scrollTo=()=>{};w.fetch=()=>{throw Error('No external network');};
  for(const name of ['suite-navigation','support-desk','company-manager','checkout-session','tool-guides','business-mail'])w.eval(await readFile(new URL(`../assets/${name}.js`,import.meta.url),'utf8'));
  w.eval(source.replace(/  boot\(\);\s*\}\)\(\);\s*$/,`
    authUser={id:'operator',email:'operator@example.invalid'};authRole='user';state=seedState();
    state.workspace={...state.workspace,id:'test-business',canOperate:true,canAdminister:true,toolKeys:['crm','inbox','tasks','calendar','inventory','pos','sales','marketing','automation','collaboration','employees','knowledge']};
    state.currentUserId='operator';state.employees=[{id:'operator',name:'Operator'}];
    render=()=>{};renderPortal=()=>{};persist=()=>{};toast=()=>{};syncCloudWorkspacePushNow=async()=>{};addActivity=()=>{};addAudit=()=>{};
    window.audit={state,ui,related:relatedRecords,controls:renderContextControls,config:entityFormConfig,validate:validateEntityRecord,save:saveEntityFromForm,preview:automationTaskPreview,action:handleAction,open:openEntityForm,parseCSV,planBitrixImport,commitBitrixImport,renderBitrixPreviewModal,calendarNewEventDefaults,recordedPaidDocuments,recordedPaidAmount,isUserOnline,render:{integrations:renderIntegrations,crm:renderCRM,tasks:renderTasks,calendar:renderCalendar,inventory:renderInventory,sales:renderSales,sites:renderSites,marketing:renderMarketing,knowledge:renderKnowledge,employees:renderEmployees,automation:renderAutomation,settings:renderSettingsPanel},setClient:c=>getSupabaseClient=()=>c};
  })();`));
  return {dom,w,a:w.audit};
}
function form(w,a,type,values,id='') {
  const f=w.document.createElement('form');f.dataset.entity=type;f.dataset.id=id;
  for(const field of a.config(type).fields) {const input=w.document.createElement('input');input.name=field.name;input.value=values[field.name]??field.value??'';f.append(input);}
  return f;
}

test('business integrations offer implemented email setup without placeholder API connectors',async()=>{
  const {dom,a}=await fixture();try {
    a.state.workspace.toolKeys=['crm'];a.ui.route='integrations';
    const html=a.render.integrations();assert.match(html,/Enable Inbox or Marketing/);
    assert.doesNotMatch(html,/Save & Connect|Mailchimp|generic webhook|REST API connectors|AkiPasa Mail/);
    a.ui.modal=null;await a.action({dataset:{action:'connect-integration',id:'mailchimp'}});assert.equal(a.ui.modal,null);
  }finally{dom.window.close();}
});

test('connection setup checks status without reading email and exposes real provider authorization buttons',async()=>{
  const {dom,w}=await fixture();try {
    const calls=[];let refreshed;
    const ready=new Promise(resolve=>refreshed=resolve);
    const mail=w.AkiBusinessMail.create({scope:()=>({route:'integrations',workspace:'test-business',locale:'en'}),escapeHtml:s=>String(s),refresh:()=>refreshed(),request:async path=>{calls.push(path);return {configured:true,connected:false,canManage:true,providers:['gmail','microsoft']};}});
    mail.render();await ready;const html=mail.render();
    assert.match(html,/Connect with Google/);assert.match(html,/Connect with Microsoft/);
    assert.deepEqual(calls,['/api/business-mail/status']);mail.dispose();
  }finally{dom.window.close();}
});

test('related records connect real workspace records and suppress absent or unavailable destinations',async()=>{
  const {dom,w,a}=await fixture();try {
    a.state.companies=[{id:'co',name:'Customer'}];a.state.contacts=[{id:'c',name:'Buyer',companyId:'co'}];
    a.state.invoices=[{id:'i',number:'INV-1',companyId:'co'}];a.state.tasks=[];
    assert(a.related('company',a.state.companies[0]).some(row=>row.type==='invoice'));
    await a.action({dataset:{action:'follow-up-record',entity:'contact',id:'c'}});
    await a.save(form(w,a,'task',{title:'Call buyer',status:'todo',priority:'medium'}));
    const task=a.state.tasks[0];assert.equal(task.sourceRecord.id,'c');
    assert(a.related('task',task).some(row=>row.id==='c'));
    assert(a.related('contact',a.state.contacts[0]).some(row=>row.id===task.id));
    a.state.workspace.toolKeys=['tasks'];assert.equal(a.related('task',task).length,0);
    a.ui.drawer=null;await a.action({dataset:{action:'view-entity',entity:'contact',id:'c'}});assert.equal(a.ui.drawer,null);
    a.state.workspace.toolKeys=['crm','tasks'];a.state.contacts=[];assert.equal(a.related('task',task).length,0);
  }finally{dom.window.close();}
});
test('empty pipelines no longer break unrelated forms and CRM offers a working setup action',async()=>{
  const {dom,a}=await fixture();try {
    a.state.pipelines=[];
    for(const type of ['task','product','article','event','invoice','conversation'])assert(a.config(type).fields.length);
    a.ui.crmTab='deals';assert.match(a.render.crm(),/add-pipeline/);
    await a.action({dataset:{action:'add-pipeline'}});assert.equal(a.state.pipelines.length,1);assert.equal(a.state.pipelines[0].stages.length,5);
    await a.action({dataset:{action:'add-pipeline'}});assert.equal(a.state.pipelines.length,1);
  }finally{dom.window.close();}
});
test('editing a project retains all its linked task records',async()=>{
  const {dom,w,a}=await fixture();try {
    a.state.projects=[{id:'p1',name:'Launch',ownerId:'operator',members:['operator']}];a.state.tasks=[{id:'t1',projectId:'p1',title:'Publish'}];
    await a.save(form(w,a,'project',{name:'Launch edited',status:'Active',ownerId:'operator',dueDate:'2026-11-02'},'p1'));
    assert.equal(a.state.projects[0].name,'Launch edited');assert.equal(a.state.tasks[0].projectId,'p1');
  }finally{dom.window.close();}
});
test('new inventory items preserve safety stock and zero lead time',async()=>{
  const {dom,w,a}=await fixture();try {
    let payload;a.setClient({from:()=>({insert:p=>{payload=p;return{select:()=>({single:async()=>({data:{id:'item',on_hand:0}})})};}})});
    await a.save(form(w,a,'product',{name:'Coffee',sku:'SKU-1',safetyStock:9,leadTimeDays:0}));
    assert.equal(payload.safety_stock,9);assert.equal(payload.lead_time_days,0);assert.equal(a.state.products[0].inventoryItemId,'item');
  }finally{dom.window.close();}
});
test('invalid dates, duplicate references and invalid amounts are rejected before writes',async()=>{
  const {dom,a}=await fixture();try{
    assert.throws(()=>a.validate('event',{title:'Meeting',start:'2026-11-01T12:00Z',end:'2026-11-01T11:00Z'}),/end after/);
    a.state.products=[{id:'old',sku:'ABC'}];
    assert.throws(()=>a.validate('product',{name:'Other',sku:' abc ',price:1,cost:0,reorderAt:0,safetyStock:0,leadTimeDays:0}),/already exists/);
    assert.throws(()=>a.validate('invoice',{number:'I1',companyId:'c',total:5,tax:6}),/Tax cannot/);
    assert.throws(()=>a.validate('product',{name:'P',sku:'P',price:-1}),/range/);
  }finally{dom.window.close();}
});
test('sales totals exclude quotes and cancelled invoices and derive overdue from dates',async()=>{
  const {dom,a}=await fixture();try{
    a.state.invoices=[{id:'i',number:'real',type:'Invoice',status:'Sent',total:10,dueDate:'2000-01-01'},{id:'q',number:'quote',type:'Quote',status:'Sent',total:999},{id:'c',number:'cancelled',type:'Invoice',status:'Cancelled',total:999}];
    a.ui.route='sales';a.ui.salesFilter='overdue';const html=a.render.sales();assert.match(html,/real/);assert.doesNotMatch(html,/data-id="[qc]"|1,?998/);
    const rendered=new JSDOM(html);try {
      const outstanding=[...rendered.window.document.querySelectorAll('.metric-card')].find(card=>card.querySelector('.metric-label')?.textContent==='Marked outstanding');
      assert.equal(Number(outstanding.querySelector('.metric-value').textContent.replace(/[^0-9.]/g,'')),10);
    }finally{rendered.window.close();}
  }finally{dom.window.close();}
});
test('task filters, calendar agenda and knowledge search select actual records',async()=>{
  const {dom,a}=await fixture();try{
    a.state.tasks=[{id:'mine',title:'My job',assigneeId:'operator',status:'todo',priority:'high',dueDate:'2000-01-01'},{id:'other',title:'Other job',assigneeId:'someone',status:'done',priority:'low'}];
    a.ui.route='tasks';a.ui.tasksFilter='mine';a.ui.taskView='list';assert.match(a.render.tasks(),/My job/);assert.doesNotMatch(a.render.tasks(),/Other job/);
    a.ui.route='calendar';a.ui.calendarFilter='agenda';a.ui.calendarDate=new Date('2026-11-01T12:00Z');a.state.events=[{id:'meet',title:'November meeting',start:'2026-11-03T12:00Z',end:'2026-11-03T13:00Z'}];assert.match(a.render.calendar(),/November meeting/);
    a.ui.route='knowledge';a.ui.workflowSearch={knowledge:'coffee'};a.state.knowledge=[{id:'one',title:'Coffee guide',category:'Bar',content:'Brew coffee'},{id:'two',title:'Payroll',category:'Admin',content:'Pay staff'}];assert.match(a.render.knowledge(),/Coffee guide/);assert.doesNotMatch(a.render.knowledge(),/Payroll/);
  }finally{dom.window.close();}
});
test('reviewed automation creates one follow-up per source per day and denies unauthorized execution',async()=>{
  const {dom,a}=await fixture();try{
    const rule={id:'rule',name:'Overdue',recipe:'overdue',status:'Active'};a.state.automations=[rule];a.state.tasks=[{id:'source',title:'Original',status:'todo',dueDate:'2000-01-01'}];
    assert.equal(a.preview(rule).length,1);await a.action({dataset:{action:'automation-preview',id:'rule'}});await a.action({dataset:{action:'automation-run',id:'rule'}});
    assert.equal(a.state.tasks.length,2);assert.equal(a.preview(rule).length,0);
    a.state.workspace.canOperate=false;assert.throws(()=>a.preview(rule),/access/);
  }finally{dom.window.close();}
});
test('conversation creation initializes note storage and read-only saves fail closed',async()=>{
  const {dom,w,a}=await fixture();try{
    await a.save(form(w,a,'conversation',{name:'Customer call',channel:'Phone',status:'Open'}));assert.equal(a.state.conversations[0].messages.length,0);
    a.state.workspace.canOperate=false;await assert.rejects(a.save(form(w,a,'task',{title:'Forbidden'})),/read-only/);
  }finally{dom.window.close();}
});
test('company first-use action uses a valid form and follow-up defaults keep their context',async()=>{
  const {dom,a}=await fixture();try{
    a.ui.route='crm';a.ui.crmTab='companies';assert.match(a.controls(),/data-entity="company"/);assert.doesNotMatch(a.controls(),/data-entity="companie"/);
    a.state.contacts=[{id:'c',name:'Buyer'}];await a.action({dataset:{action:'follow-up-record',entity:'contact',id:'c'}});assert.equal(a.ui.formDefaults.title,'Follow up: Buyer');assert.match(a.ui.formDefaults.description,/Reference: c/);
  }finally{dom.window.close();}
});


test('Bitrix CSV import rejects malformed input and preserves escaped quoted text',async()=>{
  const {dom,a}=await fixture();try{
    const parsed=a.parseCSV('\uFEFFcompany,email,notes\r\n"Señor, & Co",team@example.invalid,"said ""hello"""\r\n');
    assert.equal(parsed.length,1);
    assert.equal(parsed[0].company,'Señor, & Co');
    assert.equal(parsed[0].notes,'said "hello"');
    for(const csv of [
      'company,email\n"Unclosed,value',
      'company,email\nValue,one,extra',
      'company,company\nOne,Two',
      'company,email\n"Value"wrong,example.invalid',
      'company,email\n"Value,example.invalid'
    ])assert.throws(()=>a.parseCSV(csv),/CSV|quote|quoted/i);
    assert.throws(()=>a.parseCSV('company\n'+('A\n'.repeat(1001))),/Maximum 1000/);
    assert.throws(()=>a.parseCSV('company\n'+('x'.repeat(1048577))),/1 MB/);
  }finally{dom.window.close()}
});

test('CRM CSV preview skips duplicates and invalid rows without mutating records until explicit commit',async()=>{
  const {dom,a}=await fixture();try{
    a.state.companies=[{id:'existing',name:'Existing Bar'}];
    const csv='name,city,employees\nExisting Bar,Fuengirola,2\nPizzeria Luna,Mijas,5\nPizzeria Luna,Mijas,5\nUnverified Shop,Marbella,not-a-number\n';
    const rows=a.parseCSV(csv),old=JSON.stringify(a.state.companies);
    const plan=a.planBitrixImport('companies',rows);
    assert.equal(plan.sourceCount,4);
    assert.equal(plan.additions.length,1);
    assert.equal(plan.skipped.length,3);
    assert.equal(JSON.stringify(a.state.companies),old);
    a.ui.modal={kind:'bitrix-preview',type:'companies',rows,plan,workspace:'test-business',actor:'operator'};
    const html=a.renderBitrixPreviewModal();
    assert.match(html,/CRM import preview/);
    assert.match(html,/Pizzeria Luna/);
    assert.match(html,/Import 1 records/);
    await a.action({dataset:{action:'commit-bitrix-import'}});
    assert.equal(a.state.companies.length,2);
    assert.equal(a.state.companies[0].name,'Pizzeria Luna');
    assert.equal(a.state.companies[0].employees,5);
    assert.equal(a.ui.modal,null);
  }finally{dom.window.close()}
});

test('deal importer never starts without a pipeline, and rejects ambiguous amount formats',async()=>{
  const {dom,a}=await fixture();try{
    a.state.pipelines=[];
    const source=a.parseCSV('title,amount,probability\nNew contract,300.25,50\n');
    assert.throws(()=>a.planBitrixImport('deals',source),/Create a CRM pipeline/);
    assert.equal(a.state.deals.length,0);
    a.state.pipelines=[{id:'pipeline',stages:[{id:'new'}]}];
    const rows=a.parseCSV('title,amount,probability\nFirst deal,"3,000.50",20\nSecond deal,125.50,30\nBad odds,10,900\n');
    const plan=a.planBitrixImport('deals',rows);
    assert.equal(plan.additions.length,1);
    assert.equal(plan.skipped.length,2);
    assert.equal(plan.additions[0].record.value,125.50);
    assert.equal(a.state.deals.length,0);
  }finally{dom.window.close()}
});

test('CRM import confirmation rejects a switched workspace or changed review data',async()=>{
  const {dom,a}=await fixture();try{
    const rows=a.parseCSV('name,city\nTown Cafe,Málaga');
    const plan=a.planBitrixImport('companies',rows);
    a.ui.modal={kind:'bitrix-preview',type:'companies',rows,plan,workspace:'test-business',actor:'operator'};
    a.state.workspace.id='different-business';
    await assert.rejects(a.commitBitrixImport(),/permission or workspace changed/);
    assert.equal(a.state.companies.some(x=>x.name==='Town Cafe'),false);
    a.state.workspace.id='test-business';
    a.state.companies.push({id:'other',name:'Town Cafe'});
    await assert.rejects(a.commitBitrixImport(),/changed since the import preview/);
    assert.equal(a.state.companies.length,1);
  }finally{dom.window.close()}
});

test('calendar creates valid one-hour slots from both empty days and day popovers',async()=>{
  const {dom,a}=await fixture();try{
    a.state.events=[];
    const chosen='2026-10-31T00:00:00Z';
    const defaults=a.calendarNewEventDefaults(chosen);
    assert.equal(new Date(defaults.end)-new Date(defaults.start),3600000);
    assert.equal(new Date(defaults.start).getHours(),9);
    await a.action({dataset:{action:'calendar-day',date:chosen}});
    assert.equal(a.ui.modal.kind,'form');
    assert.equal(a.ui.formDefaults.start,defaults.start);
    assert.equal(a.ui.formDefaults.end,defaults.end);
    a.ui.modal={kind:'calendar-day',date:chosen};
    await a.action({dataset:{action:'calendar-add-event',date:chosen}});
    assert.equal(a.ui.formDefaults.end,defaults.end);
    assert.throws(()=>a.calendarNewEventDefaults('invalid'),/valid calendar/);
  }finally{dom.window.close()}
});

test('paid legacy documents are not collected revenue and paid quotes cannot inflate totals',async()=>{
  const {dom,a}=await fixture();try{
    a.state.invoices=[
      {id:'paid',type:'Invoice',status:'Paid',total:105.50},
      {id:'quote',type:'Quote',status:'Paid',total:9999},
      {id:'draft',type:'Invoice',status:'Draft',total:4000},
      {id:'wrong',type:'Invoice',status:'Paid',total:-100},
      {id:'sent',type:'Invoice',status:'Sent',total:15,dueDate:'2026-01-01'}
    ];
    assert.equal(a.recordedPaidDocuments().length,1);
    assert.equal(a.recordedPaidAmount(),105.50);
    const sales=a.render.sales();
    assert.match(sales,/Marked paid/);
    assert.match(sales,/not bank verified/);
    assert.match(sales,/Editable operational records only/);
    assert.doesNotMatch(sales,/collected across invoices/);
  }finally{dom.window.close()}
});

test('marketing and sites are explicitly planning records rather than public promises',async()=>{
  const {dom,a}=await fixture();try{
    a.state.pages=[{id:'page',name:'Campaign',slug:'summer',status:'Published',visitors:120,conversions:12}];
    a.state.forms=[{id:'form',name:'Guest list',status:'Live',fields:['email'],submissions:13,conversionRate:8}];
    a.state.campaigns=[{id:'campaign',name:'Launch party',channel:'Email',audience:'Customers',status:'Running',sent:0,opened:0,clicked:0,conversions:0}];
    const sites=a.render.sites(),marketing=a.render.marketing();
    assert.match(sites,/Landing page plans|Draft metadata only/);
    assert.match(sites,/Plan: Published|Plan: Live/);
    assert.match(sites,/Recorded visitors|Recorded submissions/);
    assert.match(marketing,/Plan: Running/);
    assert.match(marketing,/Recorded sends/);
    assert.doesNotMatch(marketing,/Refresh<\/span><strong>Live/);
  }finally{dom.window.close()}
});

test('People presence cannot be forged by recently editing an identically named contact',async()=>{
  const {dom,a}=await fixture();try{
    const operator={id:'operator',email:'operator@example.invalid',name:'Operator'};
    const another={id:'other',name:'Ghost Person',email:'ghost@example.invalid'};
    a.state.employees=[operator,another];
    a.state.contacts=[{id:'other',name:'Ghost Person',updatedAt:new Date().toISOString()}];
    assert.equal(a.isUserOnline(another),false);
    assert.equal(a.isUserOnline(operator),true);
    assert.match(a.render.employees(),/People records|Recently active/);
    another.lastActiveAt=new Date().toISOString();
    assert.equal(a.isUserOnline(another),true);
  }finally{dom.window.close()}
});

test('business About and snapshot UI describe the real commercial product and its limitations',async()=>{
  const {dom,a}=await fixture();try{
    a.ui.settingsTab='about';
    const html=a.render.settings();
    assert.match(html,/AkiBusiness/);
    assert.match(html,/Not yet accepted|Feature readiness/);
    assert.doesNotMatch(html,/built for Alex|Bitrix24 source-code copy|adapter UI included|true realtime collaboration/);
  }finally{dom.window.close()}
});


test('inactive, archived and digital products cannot generate manual replenishment prompts',async()=>{
  const {dom,w,a}=await fixture();try{
    w.AkiHQInventoryOps={renderPanel:()=>'<div>Inventory controls</div>',readPending:()=>null};
    a.state.products=[
      {id:'active',name:'Active Coffee',sku:'AC',status:'Active',warehouse:'Main',stock:0,reorderAt:6,safetyStock:2,cost:1,price:2,unit:'bag'},
      {id:'archived',name:'Archived stock',sku:'AR',status:'Archived',warehouse:'Main',stock:0,reorderAt:100,safetyStock:5,cost:1,price:2},
      {id:'digital',name:'Digital voucher',sku:'DG',status:'Active',warehouse:'Digital',stock:0,reorderAt:10,safetyStock:5,cost:0,price:5}
    ];
    const html=a.render.inventory(),view=new JSDOM(html);
    try{
      const cards=[...view.window.document.querySelectorAll('.inventory-recommendation')];
      assert.equal(cards.length,1);
      assert.match(cards[0].textContent,/Active Coffee/);
      assert.doesNotMatch(cards[0].textContent,/Archived stock|Digital voucher/);
      assert.match(html,/Planning estimate|Stock replenishment suggestions/);
      assert.match(html,/1 active physical SKUs/);
    }finally{view.window.close();}
  }finally{dom.window.close();}
});

test('Knowledge review task preserves an article source link instead of creating an orphan reminder',async()=>{
  const {dom,w,a}=await fixture();try{
    a.state.knowledge=[{id:'article',title:'Opening checklist',category:'Operations',authorId:'operator',content:'Check premises',reviewDate:'2026-11-02'}];
    a.ui.selectedArticleId='article';a.ui.route='knowledge';
    assert.match(a.render.knowledge(),/Review task/);
    await a.action({dataset:{action:'follow-up-record',entity:'article',id:'article'}});
    assert.equal(a.ui.modal.kind,'form');
    assert.equal(a.ui.formDefaults.sourceRecord.id,'article');
    await a.save(form(w,a,'task',{title:'Review opening checklist',status:'todo',priority:'medium',assigneeId:'operator'}));
    assert.equal(a.state.tasks[0].sourceRecord.type,'article');
    assert.equal(a.state.tasks[0].sourceRecord.id,'article');
    a.state.workspace.toolKeys=['knowledge'];a.ui.modal=null;
    assert.doesNotMatch(a.render.knowledge(),/Review task/);
  }finally{dom.window.close()}
});
