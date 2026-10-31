import {open,readFile,unlink} from 'node:fs/promises';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const recoveryStates=new Set(['uncertain','spooled','confirmed']);

// Normal polling and manual recovery share this exclusive lock. Never break a
// pre-existing lock automatically: a PID file is not proof its owner has stopped.
export async function withAgentLock(path,action){
 let file;
 try{file=await open(path,'wx',0o600);}catch(error){
  if(error.code==='EEXIST')throw Error('Agent lock exists. Stop the other agent; after an unclean exit inspect pending ticket before removing the stale lock.');
  throw error;
 }
 try{
  await file.writeFile(String(process.pid));
  await file.sync();
  return await action();
 }finally{
  try{await file.close();}finally{await unlink(path);}
 }
}

// Caller must own the same agent lock used for printing. This operation never
// sends bytes or requests another ticket. A failed or unfamiliar reply retains
// the local evidence, including when the backend migration is not installed.
export async function acknowledgeRecovery(ticketId,{config,journal,rpc,read=readFile,remove=unlink}){
 if(typeof ticketId!=='string'||!uuid.test(ticketId))throw Error('A valid pending ticket UUID is required');
 const snapshot=await read(journal,'utf8');
 const pending=JSON.parse(snapshot);
 if(!pending||pending.ticket_id!==ticketId)throw Error('Ticket ID does not match pending journal');
 if(pending.device_id!==config.device_id)throw Error('Pending journal belongs to a different printer pairing');
 // Journals created by older agents lack project_origin but still bind device_id.
 const origin=new URL(config.supabase_url).origin;
 if(pending.project_origin!==undefined&&pending.project_origin!==origin)throw Error('Pending journal belongs to a different project');
 const result=await rpc('crm_printer_report',{p_ticket:ticketId,p_action:'recover'});
 if(result?.recovery_contract!==1||result.ticket_id!==ticketId||result.device_id!==config.device_id||
    result.reprint!==false||!recoveryStates.has(result.status)){
  throw Error('Printer recovery was not acknowledged. Keep the journal; verify the recovery migration and pairing.');
 }
 if(await read(journal,'utf8')!==snapshot)throw Error('Pending journal changed during recovery; inspect it before retrying');
 await remove(journal);
 return result;
}
