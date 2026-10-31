-- Read-only, manager-verified external-tender evidence for LOCAL statement comparison.
-- No card charge/refund, bank settlement, invoice issuance or AEAT claim.
begin;

-- Preserve the shared live account-completion boundary before replacing RPCs.
do $$begin
 if to_regprocedure('public.account_features_allowed()') is null then
  raise exception 'Shared account-completion prerequisite is missing';
 end if;
end $$;
create function public.crm_pos_settlement_feed(p_workspace text,p_from timestamptz,p_until timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_payments jsonb; v_refunds jsonb; n_payments bigint; n_refunds bigint;
begin
 if auth.uid() is null or not coalesce(public.account_features_allowed(),false) then
  raise exception 'account completion required [coverage-v1]' using errcode='42501';
 end if;
 perform akihq_hospitality.guard(p_workspace);
 if not coalesce(akihq_security.can_administer(p_workspace),false) then
  raise exception 'Manager access required for external settlement evidence' using errcode='42501';
 end if;
 if p_from is null or p_until is null or p_from>=p_until
    or p_until-p_from>interval '32 days' or p_from<timestamp with time zone '2020-01-01 00:00:00+00'
    or p_until>now()+interval '1 day' then raise exception 'Select a valid, bounded reconciliation period'; end if;
 select count(*) into n_payments
 from akihq_hospitality.orders o
 cross join lateral jsonb_array_elements(o.payments) p
 where o.workspace_id=p_workspace and o.status in ('open','closed')
  and p->>'method' in ('card','other')
  and (p->>'at')::timestamptz>=p_from and (p->>'at')::timestamptz<p_until;
 select count(*) into n_refunds
 from akihq_hospitality.refund_records r
 where r.workspace_id=p_workspace and r.method in ('card','other')
  and r.created_at>=p_from and r.created_at<p_until;
 if n_payments>10000 or n_refunds>10000 then
   raise exception 'More than 10000 transactions; select a shorter period';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',p->>'id','order_id',o.id,'sale_id',o.sale_id,
   'status',o.status,'reversal_recorded',coalesce((p->>'amount_cents')::bigint<0,false),
   'reference',p->>'reference','kind',case when (p->>'amount_cents')::bigint<0 then 'reversal_note' else 'payment' end,
   'amount_cents',abs((p->>'amount_cents')::bigint),'method',p->>'method','at',p->>'at')
   order by (p->>'at')::timestamptz,o.id,p->>'id'),'[]'::jsonb)
 into v_payments
 from akihq_hospitality.orders o
 cross join lateral jsonb_array_elements(o.payments) p
 where o.workspace_id=p_workspace and o.status in ('open','closed')
  and p->>'method' in ('card','other')
  and (p->>'at')::timestamptz>=p_from and (p->>'at')::timestamptz<p_until;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'order_id',r.order_id,'sale_id',r.sale_id,'kind','refund',
   'method',r.method,'reference',r.external_reference,'amount_cents',r.amount_cents,
   'at',r.created_at,'status',r.status,'fiscal_correction_reference',r.fiscal_correction_reference)
   order by r.created_at,r.id),'[]'::jsonb)
 into v_refunds
 from akihq_hospitality.refund_records r
 where r.workspace_id=p_workspace and r.method in ('card','other')
  and r.created_at>=p_from and r.created_at<p_until;
 return jsonb_build_object(
  'workspace_id',p_workspace,'from',p_from,'until',p_until,'captured_at',now(),
  'currency','EUR','payments',v_payments,'refunds',v_refunds,
  'raw_payment_entries',n_payments,'raw_refund_entries',n_refunds,
  'provider_payment_verified',false,'provider_refund_verified',false,'bank_settlement_verified',false,
  'fiscal_invoice_or_rectification_issued',false,
  'notice','Recorded external tender/refund evidence for local comparison only. External provider CSV and bank deposits must be independently verified. Reversal notes are not proof of provider refunds.');
end $$;
revoke all on function public.crm_pos_settlement_feed(text,timestamptz,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.crm_pos_settlement_feed(text,timestamptz,timestamptz) to authenticated;
commit;
