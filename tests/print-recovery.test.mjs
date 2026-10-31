import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {withAgentLock,acknowledgeRecovery} from '../tools/print-agent/recovery.mjs';
import {processTicket,rpcClient} from '../tools/print-agent/agent.mjs';

const exec=promisify(execFile);
const ticket='10000000-0000-4000-8000-000000000001';
const device='20000000-0000-4000-8000-000000000001';
const config={supabase_url:'https://test.supabase.co',publishable_key:'sb_publishable_test',device_id:device,token:'a'.repeat(64),routes:{bar:{type:'tcp',host:'192.168.1.50',port:9100,columns:42}}};
const pending={ticket_id:ticket,device_id:device,project_origin:config.supabase_url};
const ack=status=>({recovery_contract:1,ticket_id:ticket,device_id:device,status,reprint:false});
async function fixture(t,value=pending){
 const dir=await mkdtemp(join(tmpdir(),'aki-recovery-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const journal=join(dir,'printer.json.pending.json'),lock=join(dir,'printer.json.lock');
 await writeFile(journal,JSON.stringify(value));
 return {dir,journal,lock};
}

for(const status of ['uncertain','spooled','confirmed'])test(`recovery validates ${status} acknowledgement before clearing, without printing`,async t=>{
 const {journal,lock}=await fixture(t);let calls=0;
 const result=await withAgentLock(lock,()=>acknowledgeRecovery(ticket,{config,journal,rpc:async(name,args)=>{
  calls++;assert.equal(name,'crm_printer_report');assert.deepEqual(args,{p_ticket:ticket,p_action:'recover'});
  await access(journal);return ack(status);
 }}));
 assert.equal(result.status,status);assert.equal(calls,1);
 await assert.rejects(access(journal),{code:'ENOENT'});await assert.rejects(access(lock),{code:'ENOENT'});
});

test('legacy journal without project origin still requires matching device and server acknowledgement',async t=>{
 const {journal}=await fixture(t,{ticket_id:ticket,device_id:device});
 await acknowledgeRecovery(ticket,{config,journal,rpc:async()=>ack('spooled')});
 await assert.rejects(access(journal),{code:'ENOENT'});
});

for(const [label,result] of [
 ['legacy reply',{status:'uncertain'}],['null',null],['queued',ack('queued')],
 ['wrong ticket',{...ack('uncertain'),ticket_id:device}],['wrong device',{...ack('uncertain'),device_id:ticket}],
 ['reprint permitted',{...ack('uncertain'),reprint:true}],['unknown contract',{...ack('uncertain'),recovery_contract:2}],
])test(`recovery retains evidence for ${label}`,async t=>{
 const {journal}=await fixture(t),before=await readFile(journal,'utf8');
 await assert.rejects(acknowledgeRecovery(ticket,{config,journal,rpc:async()=>result}),/not acknowledged/);
 assert.equal(await readFile(journal,'utf8'),before);
});

for(const [label,value] of [
 ['wrong pairing',{...pending,device_id:ticket}],['missing pairing',{ticket_id:ticket}],
 ['wrong project',{...pending,project_origin:'https://other.supabase.co'}],['wrong ticket',{...pending,ticket_id:device}],
 ['null journal',null],
])test(`recovery rejects ${label} before any RPC`,async t=>{
 const {journal}=await fixture(t,value);let calls=0;
 await assert.rejects(acknowledgeRecovery(ticket,{config,journal,rpc:async()=>{calls++;return ack('uncertain');}}));
 assert.equal(calls,0);await access(journal);
});

test('lost recovery response retains journal and retry uses the same identity',async t=>{
 const {journal,lock}=await fixture(t);let calls=0;const requests=[];
 const rpc=async(name,args)=>{requests.push({name,args});if(++calls===1)throw Error('Lost committed acknowledgement');return ack('spooled');};
 await assert.rejects(withAgentLock(lock,()=>acknowledgeRecovery(ticket,{config,journal,rpc})),/Lost committed/);
 await access(journal);
 await withAgentLock(lock,()=>acknowledgeRecovery(ticket,{config,journal,rpc}));
 assert.deepEqual(requests[0],requests[1]);await assert.rejects(access(journal),{code:'ENOENT'});
});

test('journal edits during acknowledgement cannot be deleted',async t=>{
 const {journal}=await fixture(t);
 await assert.rejects(acknowledgeRecovery(ticket,{config,journal,rpc:async()=>{
  await writeFile(journal,JSON.stringify({...pending,ticket_id:device}));return ack('uncertain');
 }}),/changed during recovery/);
 assert.equal(JSON.parse(await readFile(journal,'utf8')).ticket_id,device);
});

test('recovery and polling cannot enter while another process owns the lock',async t=>{
 const {journal,lock}=await fixture(t);let entered;let release;
 const enteredPromise=new Promise(r=>entered=r),held=new Promise(r=>release=r);
 const owner=withAgentLock(lock,async()=>{entered();await held;});
 await enteredPromise;
 try{
  await assert.rejects(withAgentLock(lock,()=>acknowledgeRecovery(ticket,{config,journal,rpc:async()=>assert.fail('must not contact server')})),/Agent lock exists/);
  await access(lock);await access(journal);
 }finally{release();await owner;}
 await assert.rejects(access(lock),{code:'ENOENT'});
});

test('the actual CLI refuses recovery under an existing lock and keeps evidence',async t=>{
 const {dir,journal,lock}=await fixture(t),configPath=join(dir,'printer.json');
 await writeFile(configPath,JSON.stringify(config));await writeFile(lock,'fixture owner');
 const agent=fileURLToPath(new URL('../tools/print-agent/agent.mjs',import.meta.url));
 await assert.rejects(exec(process.execPath,[agent,configPath,'--acknowledge-uncertain',ticket],{timeout:5000}),error=>{
  assert.equal(error.code,1);assert.match(error.stderr,/Agent lock exists/);return true;
 });
 assert.equal(await readFile(lock,'utf8'),'fixture owner');await access(journal);
});

test('the actual CLI rejects unknown flags instead of starting to claim work',async t=>{
 const {dir}=await fixture(t),agent=fileURLToPath(new URL('../tools/print-agent/agent.mjs',import.meta.url));
 await assert.rejects(exec(process.execPath,[agent,join(dir,'missing.json'),'--acknowlege-uncertain',ticket],{timeout:5000}),error=>{
  assert.equal(error.code,1);assert.match(error.stderr,/Unknown arguments/);return true;
 });
});

for(const phase of ['begin','spooled'])test(`unrecognised ${phase} success cannot authorize printing or clear evidence`,async t=>{
 const {dir}=await fixture(t),journal=join(dir,'new.json');let sends=0;
 await assert.rejects(processTicket({id:ticket,station:'bar',payload:{}},{config,journal,
  rpc:async(_name,args)=>args.p_action===phase?{}:{status:'uncertain'},send:async()=>{sends++;}
 }),/not acknowledged/);
 assert.equal(sends,phase==='begin'?0:1);await access(journal);
 assert.equal(JSON.parse(await readFile(journal,'utf8')).project_origin,config.supabase_url);
});

test('scoped RPC credentials cannot be overridden by caller arguments',async()=>{
 let body;const rpc=rpcClient(config,async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>ack('uncertain')};});
 await rpc('crm_printer_report',{p_device:ticket,p_token:'wrong',p_ticket:ticket,p_action:'recover'});
 assert.equal(body.p_device,device);assert.equal(body.p_token,config.token);
});

test('normal CLI startup retains a malformed pending journal and does not claim another ticket',async t=>{
 const {dir,journal,lock}=await fixture(t,null),configPath=join(dir,'printer.json');
 await writeFile(configPath,JSON.stringify(config));
 const agent=fileURLToPath(new URL('../tools/print-agent/agent.mjs',import.meta.url));
 await assert.rejects(exec(process.execPath,[agent,configPath],{timeout:5000}),error=>{
  assert.equal(error.code,1);assert.match(error.stderr,/invalid journal/);return true;
 });
 assert.equal(await readFile(journal,'utf8'),'null');await assert.rejects(access(lock),{code:'ENOENT'});
});

test('failed server request or local removal leaves a recoverable journal',async t=>{
 const {journal}=await fixture(t);
 await assert.rejects(acknowledgeRecovery(ticket,{config,journal,rpc:async()=>{throw Error('Service unavailable');}}),/Service unavailable/);
 await access(journal);
 await assert.rejects(acknowledgeRecovery(ticket,{config,journal,rpc:async()=>ack('spooled'),remove:async()=>{throw Error('Disk denied');}}),/Disk denied/);
 await access(journal);
});
