-- Additive, operator-attested refund evidence for CLOSED hospitality bills.
-- No card capture/refund API, fiscal rectification, or AEAT submission is performed.
-- Historical sales and issued fiscal documents stay immutable.
begin;
create table akihq_hospitality.refund_records (
 id uuid primary key default gen_random_uuid(),
 workspace_id text not null references public.crm_workspaces(id),
 request_key uuid not null,
 request_payload jsonb not null check (jsonb_typeof(request_payload)='object'),
 order_id uuid not null references akihq_hospitality.orders(id),
 sale_id uuid not null references public.crm_pos_sales(id),
 original_payment_id uuid not null,
 amount_cents bigint not null check (amount_cents between 1 and 2000000000),
 method text not null check (method in ('cash','card','other')),
 external_reference text,
 fiscal_correction_reference text,
 reason text not null check (length(reason) between 5 and 500),
 actor uuid not null,
 payout_trading_day_id uuid references akihq_hospitality.trading_days(id),
 status text not null default 'operator_attested' check (status='operator_attested'),
 created_at timestamptz not null default now(),
 unique (workspace_id,request_key),
 check (external_reference is null or length(external_reference) between 3 and 120),
 check (fiscal_correction_reference is null or length(fiscal_correction_reference) between 3 and 120),
 check (method='cash' or external_reference is not null),
 check (method<>'cash' or payout_trading_day_id is not null)
);
create unique index refund_external_reference_once on akihq_hospitality.refund_records(workspace_id,method,external_reference)
 where method<>'cash';
create index refund_order_lookup on akihq_hospitality.refund_records(workspace_id,order_id,created_at desc);
create index refund_cash_day_lookup on akihq_hospitality.refund_records(workspace_id,payout_trading_day_id)
 where method='cash';
alter table akihq_hospitality.refund_records enable row level security;
revoke all on akihq_hospitality.refund_records from public,anon,authenticated,service_role;
create function akihq_hospitality.reject_refund_change() returns trigger language plpgsql
 set search_path='' as $$ begin raise exception 'Refund evidence is append-only; use a separately audited correction'; end $$;
create trigger refund_evidence_immutable before update or delete on akihq_hospitality.refund_records
 for each row execute function akihq_hospitality.reject_refund_change();
revoke all on function akihq_hospitality.reject_refund_change() from public,anon,authenticated,service_role;

-- Cash refunds reduce the current day's expected physical drawer, not original-day gross sales.
create or replace function akihq_hospitality.cash_expected(p_workspace text,p_day uuid) returns bigint
language sql stable set search_path='' as $$
 select s.opening_float_cents
   + coalesce((select sum((payment->>'amount_cents')::bigint)
      from akihq_hospitality.closed_bill_audit bill,
           jsonb_array_elements(bill.payments) payment
      where bill.workspace_id=p_workspace and bill.trading_day_id=p_day
        and payment->>'method'='cash'),0)
   - coalesce((select sum(refund.amount_cents) from akihq_hospitality.refund_records refund where refund.workspace_id=p_workspace and refund.payout_trading_day_id=p_day and refund.method='cash'),0)
   + coalesce((select sum(case when movement.kind='pay_in' then movement.amount_cents else -movement.amount_cents end)
      from akihq_hospitality.cash_movements movement
      where movement.workspace_id=p_workspace and movement.trading_day_id=p_day),0)
 from akihq_hospitality.cash_shifts s
 where s.workspace_id=p_workspace and s.trading_day_id=p_day;
$$;


create or replace function public.crm_pos_cash_overview(p_workspace text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare active_shift jsonb; recent jsonb;
begin
 perform akihq_hospitality.guard(p_workspace);
 select jsonb_build_object(
   'trading_day_id',s.trading_day_id,'opening_float_cents',s.opening_float_cents,
   'cash_sales_cents',coalesce((select sum((p->>'amount_cents')::bigint)
     from akihq_hospitality.closed_bill_audit b,jsonb_array_elements(b.payments) p
     where b.workspace_id=p_workspace and b.trading_day_id=s.trading_day_id and p->>'method'='cash'),0),
   'cash_refunds_cents',coalesce((select sum(r.amount_cents) from akihq_hospitality.refund_records r where r.workspace_id=p_workspace and r.payout_trading_day_id=s.trading_day_id and r.method='cash'),0),
   'movement_cents',coalesce((select sum(case when m.kind='pay_in' then m.amount_cents else -m.amount_cents end)
     from akihq_hospitality.cash_movements m where m.workspace_id=p_workspace and m.trading_day_id=s.trading_day_id),0),
   'expected_cash_cents',akihq_hospitality.cash_expected(p_workspace,s.trading_day_id),
   'movements',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id)
     from akihq_hospitality.cash_movements m where m.workspace_id=p_workspace and m.trading_day_id=s.trading_day_id),'[]'::jsonb)
 ) into active_shift
 from akihq_hospitality.cash_shifts s join akihq_hospitality.trading_days d on d.id=s.trading_day_id
 where s.workspace_id=p_workspace and d.ended_at is null order by d.started_at desc limit 1;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.reconciled_at desc),'[]'::jsonb) into recent from (
   select s.trading_day_id,s.opening_float_cents,s.expected_cash_cents,s.counted_cash_cents,
    s.discrepancy_cents,s.reconciliation_note,s.reconciled_at,s.reconciled_by
   from akihq_hospitality.cash_shifts s where s.workspace_id=p_workspace and s.reconciled_at is not null
   order by s.reconciled_at desc limit 30
 ) x;
 return jsonb_build_object('contract_version',1,'active_shift',active_shift,'recent',recent,
   'can_manage',akihq_security.can_administer(p_workspace));
end $$;



-- A recorded refund is NOT proof of provider execution. Only an authorized manager
-- can attest that cash was paid out or that a separate provider refund was completed.
-- Every ambiguous retry must use the original request_key and identical JSON.
create function public.crm_pos_record_refund(p_workspace text,p_request_key uuid,p_refund jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); prior akihq_hospitality.refund_records%rowtype;
 o akihq_hospitality.orders%rowtype; pay jsonb;
 v_amount numeric; v_original bigint; v_refunded bigint; v_method text;
 v_reason text:=btrim(coalesce(p_refund->>'reason',''));
 v_external text:=nullif(btrim(coalesce(p_refund->>'external_reference','')),'');
 v_fiscal text:=nullif(btrim(coalesce(p_refund->>'fiscal_correction_reference','')),'');
 v_day uuid; v_id uuid;
begin
 perform akihq_hospitality.guard(p_workspace);
 if not akihq_security.can_administer(p_workspace) then
   raise exception 'Manager permission required to record refunds' using errcode='42501';
 end if;
 if p_request_key is null or jsonb_typeof(p_refund) is distinct from 'object' or octet_length(p_refund::text)>4000 then
   raise exception 'Invalid refund request';
 end if;
 -- Same workspace mutex as cash controls, then hospitality orders: cash < hospitality.
 perform pg_advisory_xact_lock(hashtextextended('akihq-trading-day:'||p_workspace,0));
 perform pg_advisory_xact_lock(hashtextextended('akihq-hospitality:'||p_workspace,0));
 select * into prior from akihq_hospitality.refund_records
  where workspace_id=p_workspace and request_key=p_request_key;
 if found then
  if prior.actor<>actor or prior.request_payload<>p_refund then
   raise exception 'Refund reference was already used for different details';
  end if;
  return jsonb_build_object('refund_id',prior.id,'order_id',prior.order_id,
    'amount_cents',prior.amount_cents,'method',prior.method,'status',prior.status,
    'fiscal_review_required',true,'cash_trading_day_id',prior.payout_trading_day_id);
 end if;
 if length(v_reason) not between 5 and 500 then raise exception 'Refund reason must be 5 to 500 characters'; end if;
 if v_external is not null and length(v_external) not between 3 and 120 then raise exception 'Invalid external refund reference'; end if;
 if v_fiscal is not null and length(v_fiscal) not between 3 and 120 then raise exception 'Invalid external fiscal correction reference'; end if;
 if jsonb_typeof(p_refund->'amount_cents') is distinct from 'number' then raise exception 'Refund amount must be integer cents'; end if;
 v_amount:=(p_refund->>'amount_cents')::numeric;
 if v_amount is null or v_amount<>trunc(v_amount) or v_amount<1 or v_amount>2000000000 then
   raise exception 'Refund amount must be positive integer cents';
 end if;
 select * into o from akihq_hospitality.orders
  where workspace_id=p_workspace and id=nullif(p_refund->>'order_id','')::uuid
  for update;
 if not found or o.status<>'closed' or o.sale_id is null then
   raise exception 'Only a closed, posted bill can be refunded';
 end if;
 select value into pay from jsonb_array_elements(o.payments)
  where value->>'id'=p_refund->>'original_payment_id' and (value->>'amount_cents')::bigint>0
  limit 1;
 if pay is null or exists(select 1 from jsonb_array_elements(o.payments) x
     where x->>'reverses'=pay->>'id') then
   raise exception 'Original recorded payment not found or already reversed';
 end if;
 v_method:=pay->>'method';
 if v_method not in ('cash','card','other') or v_method is distinct from p_refund->>'method' then
   raise exception 'Refund method must match the original recorded tender';
 end if;
 v_original:=(pay->>'amount_cents')::bigint;
 select coalesce(sum(amount_cents),0)::bigint into v_refunded
  from akihq_hospitality.refund_records
  where workspace_id=p_workspace and order_id=o.id
    and original_payment_id=(pay->>'id')::uuid;
 if v_amount > v_original-v_refunded then
   raise exception 'Refund exceeds the remaining recorded payment balance';
 end if;
 if v_method='cash' then
  if p_refund->'cash_paid_out' is distinct from 'true'::jsonb then
    raise exception 'Confirm that physical cash was handed to the customer';
  end if;
  if v_external is not null then raise exception 'Cash payouts cannot use external terminal references'; end if;
  select id into v_day from akihq_hospitality.trading_days
   where workspace_id=p_workspace and ended_at is null order by started_at desc limit 1 for update;
  if v_day is null or not exists(select 1 from akihq_hospitality.cash_shifts
    where workspace_id=p_workspace and trading_day_id=v_day and reconciled_at is null) then
    raise exception 'Open a cash trading day before recording a physical cash refund';
  end if;
  if v_amount>akihq_hospitality.cash_expected(p_workspace,v_day) then
    raise exception 'Physical refund exceeds the expected cash in the open drawer';
  end if;
 else
  if p_refund->'external_refund_completed' is distinct from 'true'::jsonb
    or v_external is null then
    raise exception 'Confirm the external refund and its distinct terminal/provider reference';
  end if;
 end if;
 insert into akihq_hospitality.refund_records
  (workspace_id,request_key,request_payload,order_id,sale_id,original_payment_id,
   amount_cents,method,external_reference,fiscal_correction_reference,reason,
   actor,payout_trading_day_id)
 values(p_workspace,p_request_key,p_refund,o.id,o.sale_id,(pay->>'id')::uuid,
   v_amount::bigint,v_method,v_external,v_fiscal,v_reason,actor,v_day)
 returning id into v_id;
 return jsonb_build_object('refund_id',v_id,'order_id',o.id,'amount_cents',v_amount::bigint,
   'method',v_method,'status','operator_attested','fiscal_review_required',true,
   'cash_trading_day_id',v_day);
end $$;
revoke all on function public.crm_pos_record_refund(text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.crm_pos_record_refund(text,uuid,jsonb) to authenticated;

create function public.crm_pos_refund_overview(p_workspace text,p_order uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o akihq_hospitality.orders%rowtype; records jsonb; total_records bigint;
begin
 perform akihq_hospitality.guard(p_workspace);
 if not akihq_security.can_administer(p_workspace) then
   raise exception 'Manager permission required for refund evidence' using errcode='42501';
 end if;
 if p_order is null then raise exception 'Closed bill ID required'; end if;
 select * into o from akihq_hospitality.orders where workspace_id=p_workspace and id=p_order;
 if not found or o.status<>'closed' then raise exception 'Closed bill not found'; end if;
 select count(*) into total_records from akihq_hospitality.refund_records where workspace_id=p_workspace and order_id=p_order;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at,x.id),'[]'::jsonb)
  into records from (
   select id,order_id,original_payment_id,amount_cents,method,external_reference,
    fiscal_correction_reference,reason,actor,payout_trading_day_id,created_at,status
   from akihq_hospitality.refund_records
   where workspace_id=p_workspace and order_id=p_order order by created_at,id limit 500
  ) x;
 return jsonb_build_object('order_id',o.id,'original_payments',o.payments,
   'refunds',records,'refund_count',total_records,'has_more',total_records>500,'fiscal_issuance_or_rectification_performed',false,
   'notice','Operator-attested monetary evidence only. Check provider settlement and issue the legally required fiscal rectification separately.');
end $$;
revoke all on function public.crm_pos_refund_overview(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.crm_pos_refund_overview(text,uuid) to authenticated;
commit;
