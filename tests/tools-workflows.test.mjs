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
    window.audit={state,ui,related:relatedRecords,controls:renderContextControls,config:entityFormConfig,validate:validateEntityRecord,save:saveEntityFromForm,preview:automationTaskPreview,action:handleAction,open:openEntityForm,render:{integrations:renderIntegrations,crm:renderCRM,tasks:renderTasks,calendar:renderCalendar,sales:renderSales,knowledge:renderKnowledge,employees:renderEmployees,automation:renderAutomation},setClient:c=>getSupabaseClient=()=>c};
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
    a.ui.route='sales';a.ui.salesFilter='overdue';const html=a.render.sales();assert.match(html,/real/);assert.doesNotMatch(html,/data-id="[qc]"|1,?998/);assert.match(html,/metric-value">€10</);
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
