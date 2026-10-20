/** In-app delivery only. No email or provider APIs; retry durable SQL outbox. */
export async function processToolboxNotifications(env,fetcher=fetch){
 if(env.AKIBUSINESS_TOOLBOX_NOTIFICATIONS_ENABLED!=='true')return {enabled:false};
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base.startsWith('https://')||!key)throw Error('Notification service bindings missing');
 const response=await fetcher(`${base}/rest/v1/rpc/crm_toolbox_deliver_notifications`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({p_limit:100})});
 if(!response.ok)throw Error('Notification delivery retained for retry');
 return response.json();
}
