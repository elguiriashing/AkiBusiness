/** Reconcile current billing before rotations. No charges or subscription writes. */
export async function processToolboxRotations(env, fetcher=fetch) {
 if(env.AKIBUSINESS_TOOLBOX_ENABLED!=='true')return {enabled:false};
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const service=env.SUPABASE_SERVICE_ROLE_KEY,key=env.STRIPE_TOOLBOX_RESTRICTED_KEY;
 if(!base||!service||!key)throw new Error('Toolbox reconciliation bindings missing');
 const prices=JSON.parse(env.AKIBUSINESS_TOOLBOX_PRICE_MAP||'{}');
 async function rpc(name,body){const r=await fetcher(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:service,authorization:`Bearer ${service}`,'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`Toolbox RPC ${name} failed`);return r.status===204?null:r.json();}
 const due=await rpc('crm_toolbox_due',{});let completed=0,failed=0;
 for(const b of due){try{
  if(b.source!=='stripe'){await rpc('crm_toolbox_rotate',{p_workspace:b.workspace_id});completed++;continue;}
  const revision=Date.now();
  const url=new URL(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(b.subscription_id)}`);url.searchParams.set('expand[]','latest_invoice.lines');
  const r=await fetcher(url,{headers:{authorization:`Bearer ${key}`}});if(!r.ok)throw new Error('Stripe reconciliation failed');const s=await r.json();
  if(s.id!==b.subscription_id||s.metadata?.workspace_id!==b.workspace_id||s.items?.data?.length!==1)throw new Error('Subscription scope mismatch');
  const item=s.items.data[0],tier=prices[item.price?.id];
  if(!['basico','standard','pro'].includes(tier)||tier!==b.tier||item.quantity!==1)throw new Error('Tier change requires confirmed lifecycle handler');
  if(Number(s.billing_cycle_anchor)*1000!==Date.parse(b.anchor))throw new Error('Billing anchor mismatch');
  const invoice=s.latest_invoice;
  const line=invoice?.lines?.data?.find(l=>(l.subscription_item===item.id||l.parent?.subscription_item_details?.subscription_item===item.id)&&l.period?.end);
  let until=b.paid_until;
  if(invoice?.status==='paid'&&invoice.paid!==false&&line&&Number(line.period.end)*1000>Date.parse(until))until=new Date(Number(line.period.end)*1000).toISOString();
  await rpc('crm_toolbox_billing_sync',{p_workspace:b.workspace_id,p_tier:tier,p_tools:b.active_tools,p_anchor:b.anchor,p_paid_until:until,p_status:s.status,p_source:'stripe',p_subscription:s.id,p_billing_revision:revision,p_evidence:`stripe-refresh:${invoice?.id||s.id}`,p_enabled:true});
  await rpc('crm_toolbox_rotate',{p_workspace:b.workspace_id});completed++;
 }catch{failed++; /* Keep entitlement expiry and retry next cron. Do not log customer data. */}}
 return {enabled:true,completed,failed};
}
