import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BusinessMailbox,handleBusinessMail} from './business-mail.js';
const actor='00000000-0000-4000-8000-000000000001';
const access={tool_keys:['inbox','marketing'],can_administer:true,can_operate:true};
function fixture(t) {
  const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
  const objects=new Map(),stores=new Map(),calls=[];
  const env={SUPABASE_URL:'https://db.invalid',SUPABASE_PUBLISHABLE_KEY:'test-public',BUSINESS_MAIL_KEY:btoa('01234567890123456789012345678901'),BUSINESS_GOOGLE_CLIENT_ID:'test-id',BUSINESS_GOOGLE_CLIENT_SECRET:'test-secret',BUSINESS_MICROSOFT_CLIENT_ID:'test-id',BUSINESS_MICROSOFT_CLIENT_SECRET:'test-secret'};
  env.BUSINESS_MAIL={idFromName:name=>name,get:name=>{
    if(!objects.has(name)) {
      const data=new Map();stores.set(name,data);
      let queue=Promise.resolve();
      const ctx={blockConcurrencyWhile:fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;},storage:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>Array.isArray(k)?k.forEach(v=>data.delete(v)):data.delete(k)}};
      objects.set(name,new BusinessMailbox(ctx,env));
    }
    return objects.get(name);
  }};
  let authAccess={...access},failSend=false,sends=0,consent=false;
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).endsWith('/auth/v1/user'))return Response.json({id:actor});
    if(String(url).endsWith('/rpc/crm_workspace_access'))return Response.json(authAccess);
    if(String(url).endsWith('/rpc/crm_marketing_prepare'))return consent ? Response.json({id:'delivery',token:'00000000-0000-4000-8000-000000000002',settings:{controller_name:'Test business',controller_address:'Test address',policy_url:'https://business.invalid/privacy',privacy_email:'privacy@example.invalid'}}) : Response.json({code:'42501'},{status:403});
    if(String(url).endsWith('/rpc/crm_marketing_finish'))return Response.json({});
    if(String(url).includes('/token'))return Response.json({access_token:'provider-access',refresh_token:'provider-refresh',expires_in:3600});
    if(String(url).endsWith('/profile'))return Response.json({emailAddress:'owner@example.invalid'});
    if(String(url).includes('graph.microsoft.com/v1.0/me?$select'))return Response.json({mail:'owner@example.invalid'});
    if(String(url).includes('/messages/send') || String(url).endsWith('/reply')){sends++;if(failSend)throw Error('timeout');return Response.json({id:'provider-message'});}
    if(String(url).includes('/messages/message-1'))return Response.json({id:'message-1',threadId:'thread',internalDate:'1793000000000',payload:{mimeType:'text/plain',headers:[{name:'From',value:'Customer <customer@example.invalid>'},{name:'Subject',value:'Hello'},{name:'Message-ID',value:'<original@example.invalid>'}],body:{data:btoa('Hello <script>unsafe</script>')}}});
    if(String(url).includes('/messages?'))return Response.json({messages:[]});
    throw Error('Unexpected request '+url);
  };
  const request=async(action,data,workspace='one')=>handleBusinessMail(new Request(`https://gateway.invalid/api/business-mail/${action}`,{method:data===undefined?'GET':'POST',headers:{authorization:'Bearer fixture','x-workspace-id':workspace,'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})}),env);
  const connect=async(workspace='one',provider='gmail')=>{
    const response=await request('start',{provider},workspace),start=await response.json();assert.equal(response.status,200,JSON.stringify(start));
    const completed=await request('complete',{state:start.state,code:'test-code'},workspace);assert.equal(completed.status,200,await completed.clone().text());return start;
  };
  return {env,request,connect,stores,calls,setAccess:v=>authAccess=v,failSend:()=>failSend=true,sends:()=>sends,consent:()=>consent=true};
}
test('mailbox requires authenticated workspace access and denies role escalation',async t=>{
  const f=fixture(t);f.setAccess({...access,tool_keys:[]});assert.equal((await f.request('status')).status,403);
  f.setAccess({...access,can_administer:false});assert.equal((await f.request('start',{provider:'gmail'})).status,403);
  f.setAccess({...access,can_operate:false});assert.equal((await f.request('reply',{id:'x',text:'x',requestId:crypto.randomUUID()})).status,403);
});
test('OAuth binds state to actor/workspace, uses PKCE and consumes it once',async t=>{
  const f=fixture(t),start=await (await f.request('start',{provider:'gmail'})).json();
  assert.match(start.url,/code_challenge_method=S256/);
  assert.equal((await f.request('complete',{state:start.state,code:'test'},'two')).status,409);
  assert.equal((await f.request('complete',{state:'wrong',code:'test'})).status,409);
  assert.equal((await f.request('complete',{state:start.state,code:'test'})).status,200);
  assert.equal((await f.request('complete',{state:start.state,code:'test'})).status,409);
});
test('credentials are encrypted at rest and cannot appear in another tenant status',async t=>{
  const f=fixture(t);await f.connect();
  const stored=JSON.stringify([...f.stores.get('one')]);assert.doesNotMatch(stored,/provider-access|provider-refresh|owner@example/);
  const status=await (await f.request('status')).json();assert.equal(status.email,'owner@example.invalid');assert.doesNotMatch(JSON.stringify(status),/provider-access|provider-refresh/);
  assert.equal((await (await f.request('status',undefined,'two')).json()).connected,false);
  await f.request('disconnect',{});assert.equal((await (await f.request('status')).json()).connected,false);
});
test('same reply reference is sent once, rejects changed payload, including concurrent requests',async t=>{
  const f=fixture(t);await f.connect();const body={id:'message-1',text:'Hello back',requestId:crypto.randomUUID()};
  const results=await Promise.all([f.request('reply',body),f.request('reply',body)]);for(const response of results)assert.equal(response.status,200);
  assert.equal(f.sends(),1);assert.equal((await f.request('reply',{...body,text:'Different'})).status,409);
  const sent=JSON.parse(f.calls.find(c=>c.url.endsWith('/messages/send')).options.body);
  const mime=atob(sent.raw.replace(/-/g,'+').replace(/_/g,'/'));assert.match(mime,/To: customer@example.invalid/);assert.match(mime,/In-Reply-To: <original@example.invalid>/);
});
test('an uncertain provider reply is never sent twice',async t=>{
  const f=fixture(t);await f.connect();f.failSend();const body={id:'message-1',text:'Keep draft',requestId:crypto.randomUUID()};
  assert.equal((await f.request('reply',body)).status,503);
  const retry=await (await f.request('reply',body)).json();assert.equal(retry.status,'unknown');assert.equal(f.sends(),1);
});
test('missing infrastructure and inactive marketing fail without invoking a provider',async t=>{
  const f=fixture(t);await f.connect();assert.equal((await f.request('campaign',{email:'a@example.invalid',subject:'a',text:'a',requestId:crypto.randomUUID()})).status,503);assert.equal(f.sends(),0);
  delete f.env.BUSINESS_MAIL;assert.equal((await f.request('reply',{})).status,503);assert.equal((await f.request('status')).status,200);
});
test('callback returns only to the fixed product origin and carries no token',async t=>{
  const f=fixture(t);const result=await handleBusinessMail(new Request('https://gateway.invalid/api/business-mail/callback?code=one&state=two&return=https://evil.invalid'),f.env);
  const url=new URL(result.headers.get('location'));assert.equal(url.origin,'https://akibusiness.com');assert.equal(url.searchParams.get('mail_code'),'one');assert.equal(url.searchParams.has('return'),false);
});
test('campaign delivery checks consent and adds an unsubscribe footer before sending once',async t=>{
  const f=fixture(t);await f.connect();Object.assign(f.env,{BUSINESS_MARKETING_ENABLED:'true',SUPABASE_SERVICE_ROLE_KEY:'test-service',PRIVACY_PUBLIC_ORIGIN:'https://gateway.invalid'});
  const body={email:'customer@example.invalid',subject:'A reviewed offer',text:'Approved content',requestId:crypto.randomUUID()};
  assert.equal((await f.request('campaign',body)).status,403);assert.equal(f.sends(),0);
  f.consent();const response=await f.request('campaign',body);assert.equal(response.status,200,await response.clone().text());
  await f.request('campaign',body);assert.equal(f.sends(),1);
  const send=f.calls.find(c=>c.url.endsWith('/messages/send'));
  const mime=atob(JSON.parse(send.options.body).raw.replace(/-/g,'+').replace(/_/g,'/'));
  assert.match(mime,/From: owner@example.invalid/);assert.match(mime,/List-Unsubscribe: <https:\/\/gateway.invalid\/api\/privacy\/unsubscribe\?token=/);
  const text=atob(mime.split('\r\n\r\n')[1]);assert.match(text,/Test business/);assert.match(text,/Unsubscribe/);
});
test('Microsoft connection is isolated and refresh tokens stay server-side',async t=>{
  const f=fixture(t);await f.connect('microsoft-business','outlook');
  const status=await (await f.request('status',undefined,'microsoft-business')).json();assert.equal(status.provider,'outlook');
  assert.equal((await (await f.request('status')).json()).connected,false);
  assert.doesNotMatch(JSON.stringify([...f.stores.get('microsoft-business')]),/provider-refresh/);
});
test('Marketing can connect its sender without buying Inbox, but cannot read mailbox messages',async t=>{
  const f=fixture(t);f.setAccess({...access,tool_keys:['marketing']});await f.connect();
  assert.equal((await f.request('status')).status,200);
  assert.equal((await f.request('messages')).status,403);
  assert.equal((await f.request('message')).status,403);
  assert.equal((await f.request('reply',{id:'message-1',text:'No',requestId:crypto.randomUUID()})).status,403);
});
