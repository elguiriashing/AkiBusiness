import {evaluateOperationsSubscription} from '../billing/operations-lifecycle.mjs';
/** Internal adapter; the signed webhook stays exclusively in AkiPasa. */
export async function reconcileOperationsBinding(env,subscriptionId,{eventId,fetcher=fetch,revision=Date.now()}={}){
 if(env.AKIBUSINESS_OPERATIONS_BILLING_READY!=='true')return {enabled:false};
 if(!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)||!eventId)throw Error('Authoritative event reference required');
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),service=env.SUPABASE_SERVICE_ROLE_KEY,key=env.STRIPE_TOOLBOX_RESTRICTED_KEY;
 if(!base||!service||!key)throw Error('Billing reconciliation bindings unavailable');
 async function rpc(name,body){const response=await fetcher(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:service,authorization:`Bearer ${service}`,'content-type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error('Billing state RPC unavailable');return response.status===204?null:response.json();}
 const response=await fetcher(`https://api.stripe.com/v1/subscriptions/${subscriptionId}?expand[]=latest_invoice.lines`,{headers:{authorization:`Bearer ${key}`,'stripe-version':'2026-08-26.dahlia'}});if(!response.ok)throw Error('Stripe subscription unavailable');
 const subscription=await response.json();const binding=await rpc('crm_operations_binding',{p_subscription:subscriptionId,p_token:subscription.metadata?.operations_checkout_token||null});
 const state=evaluateOperationsSubscription(subscription,binding);if(state.action==='awaiting_payment')return state;
 await rpc('apply_crm_operations_billing',{p_event:eventId,p_subscription:subscriptionId,p_token:binding.token||null,p_profile:binding.profileId,p_customer:binding.customerId,p_workspace:binding.workspaceId,p_tier:state.tier,p_tools:state.tools,p_anchor:state.anchor,p_paid_until:state.paidUntil,p_status:state.status,p_revision:revision,p_evidence:state.evidence});
 return {enabled:true,applied:true};
}
