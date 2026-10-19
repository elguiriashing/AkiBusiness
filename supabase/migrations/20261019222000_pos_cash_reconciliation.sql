-- Operational cash-drawer reconciliation for hospitality trading days.
-- This is not a fiscal close, accounting ledger, bank settlement or proof of card capture.
begin;

create table akihq_hospitality.cash_shifts (
 trading_day_id uuid primary key references akihq_hospitality.trading_days(id),
 workspace_id text not null references public.crm_workspaces(id),
 opening_float_cents bigint not null default 0 check (opening_float_cents between 0 and 100000000),
 expected_cash_cents bigint,
 counted_cash_cents bigint check (counted_cash_cents between 0 and 100000000),
 discrepancy_cents bigint,
 reconciliation_note text not null default '' check (length(reconciliation_note) <= 500),
 reconciled_at timestamptz,
 reconciled_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,trading_day_id)
);
create table akihq_hospitality.cash_movements (
 id uuid primary key default gen_random_uuid(),
 workspace_id text not null references public.crm_workspaces(id),
 trading_day_id uuid not null references akihq_hospitality.cash_shifts(trading_day_id),
 kind text not null check (kind in ('pay_in','cash_drop')),
 amount_cents bigint not null check (amount_cents between 1 and 10000000),
 reason text not null check (length(btrim(reason)) between 3 and 500),
 actor uuid not null,
 created_at timestamptz not null default now()
);
create table akihq_hospitality.cash_commands (
 workspace_id text not null references public.crm_workspaces(id),
 key uuid not null,
 actor uuid not null,
 request jsonb not null,
 response jsonb not null,
 created_at timestamptz not null default now(),
 primary key(workspace_id,key)
);
create index cash_movements_timeline on akihq_hospitality.cash_movements(workspace_id,trading_day_id,created_at,id);
alter table akihq_hospitality.cash_shifts enable row level security;
alter table akihq_hospitality.cash_movements enable row level security;
alter table akihq_hospitality.cash_commands enable row level security;
revoke all on akihq_hospitality.cash_shifts,akihq_hospitality.cash_movements,akihq_hospitality.cash_commands from public,anon,authenticated,service_role;

create function akihq_hospitality.open_cash_shift() returns trigger
language plpgsql set search_path='' as $$
begin
 insert into akihq_hospitality.cash_shifts(trading_day_id,workspace_id)
 values(new.id,new.workspace_id) on conflict(trading_day_id) do nothing;
 return new;
end $$;
create trigger hospitality_open_cash_shift after insert on akihq_hospitality.trading_days
 for each row execute function akihq_hospitality.open_cash_shift();

-- There were no active production trading days at migration review. This still
-- safely adopts an active day if one was opened between review and deployment.
insert into akihq_hospitality.cash_shifts(trading_day_id,workspace_id)
select id,workspace_id from akihq_hospitality.trading_days where ended_at is null
on conflict(trading_day_id) do nothing;

create function akihq_hospitality.cash_expected(p_workspace text,p_day uuid) returns bigint
language sql stable set search_path='' as $$
 select s.opening_float_cents
   + coalesce((select sum((payment->>'amount_cents')::bigint)
      from akihq_hospitality.closed_bill_audit bill,
           jsonb_array_elements(bill.payments) payment
      where bill.workspace_id=p_workspace and bill.trading_day_id=p_day
        and payment->>'method'='cash'),0)
   + coalesce((select sum(case when movement.kind='pay_in' then movement.amount_cents else -movement.amount_cents end)
      from akihq_hospitality.cash_movements movement
      where movement.workspace_id=p_workspace and movement.trading_day_id=p_day),0)
 from akihq_hospitality.cash_shifts s
 where s.workspace_id=p_workspace and s.trading_day_id=p_day;
$$;

create function public.crm_pos_cash_overview(p_workspace text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare active_shift jsonb; recent jsonb;
begin
 perform akihq_hospitality.guard(p_workspace);
 select jsonb_build_object(
   'trading_day_id',s.trading_day_id,'opening_float_cents',s.opening_float_cents,
   'cash_sales_cents',coalesce((select sum((p->>'amount_cents')::bigint)
     from akihq_hospitality.closed_bill_audit b,jsonb_array_elements(b.payments) p
     where b.workspace_id=p_workspace and b.trading_day_id=s.trading_day_id and p->>'method'='cash'),0),
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

create function public.crm_pos_cash_command(p_workspace text,p_key uuid,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); prior akihq_hospitality.cash_commands%rowtype;
 action text:=p_command->>'action'; day akihq_hospitality.trading_days%rowtype;
 shift akihq_hospitality.cash_shifts%rowtype; amount bigint; counted bigint;
 expected bigint; discrepancy bigint; reason text:=btrim(coalesce(p_command->>'reason',''));
 response jsonb; kind text:=p_command->>'kind';
begin
 perform akihq_hospitality.guard(p_workspace);
 if not akihq_security.can_administer(p_workspace) then raise exception 'Manager permission is required for cash controls' using errcode='42501'; end if;
 if p_key is null or jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>4000 then raise exception 'Invalid cash command'; end if;
 perform pg_advisory_xact_lock(hashtextextended('akihq-trading-day:'||p_workspace,0));
 -- Serialize against order/payment writes as well as other drawer commands.
 -- The lock order is stable: hospitality commands never acquire the trading-day lock.
 perform pg_advisory_xact_lock(hashtextextended('akihq-hospitality:'||p_workspace,0));
 select * into prior from akihq_hospitality.cash_commands where workspace_id=p_workspace and key=p_key;
 if found then
  if prior.actor<>actor or prior.request<>p_command then raise exception 'Request reference already used'; end if;
  return prior.response;
 end if;
 select * into day from akihq_hospitality.trading_days where workspace_id=p_workspace and ended_at is null order by started_at desc limit 1 for update;
 if day.id is null then raise exception 'Start a trading day before using cash controls'; end if;
 select * into shift from akihq_hospitality.cash_shifts where workspace_id=p_workspace and trading_day_id=day.id for update;
 if shift.trading_day_id is null then raise exception 'Cash controls are unavailable for this trading day'; end if;
 if action='opening_float' then
  amount:=nullif(p_command->>'amount_cents','')::bigint;
  if amount is null or amount<0 or amount>100000000 then raise exception 'Invalid opening float'; end if;
  if exists(select 1 from akihq_hospitality.closed_bill_audit b where b.workspace_id=p_workspace and b.trading_day_id=day.id)
    or exists(select 1 from akihq_hospitality.cash_movements m where m.workspace_id=p_workspace and m.trading_day_id=day.id)
    then raise exception 'Opening float is locked after the first sale or movement'; end if;
  update akihq_hospitality.cash_shifts set opening_float_cents=amount,updated_at=now() where trading_day_id=day.id returning * into shift;
  response:=jsonb_build_object('trading_day_id',day.id,'opening_float_cents',amount);
 elsif action='movement' then
  amount:=nullif(p_command->>'amount_cents','')::bigint;
  if kind not in ('pay_in','cash_drop') or amount is null or amount<1 or amount>10000000 then raise exception 'Invalid cash movement'; end if;
  if length(reason) not between 3 and 500 then raise exception 'Cash movement reason is required'; end if;
  insert into akihq_hospitality.cash_movements(workspace_id,trading_day_id,kind,amount_cents,reason,actor)
   values(p_workspace,day.id,kind,amount,reason,actor);
  response:=jsonb_build_object('trading_day_id',day.id,'kind',kind,'amount_cents',amount);
 elsif action='reconcile_close' then
  counted:=nullif(p_command->>'counted_cents','')::bigint;
  if counted is null or counted<0 or counted>100000000 then raise exception 'Invalid counted cash'; end if;
  if exists(select 1 from akihq_hospitality.orders where workspace_id=p_workspace and status='open')
   then raise exception 'Close or cancel every open bill before reconciling the drawer'; end if;
  expected:=akihq_hospitality.cash_expected(p_workspace,day.id);discrepancy:=counted-expected;
  if discrepancy<>0 and length(reason) not between 3 and 500 then raise exception 'Explain the cash discrepancy before closing'; end if;
  update akihq_hospitality.cash_shifts set expected_cash_cents=expected,counted_cash_cents=counted,
    discrepancy_cents=discrepancy,reconciliation_note=reason,reconciled_at=now(),reconciled_by=actor,updated_at=now()
   where trading_day_id=day.id returning * into shift;
  update akihq_hospitality.trading_days set ended_at=now(),ended_by=actor where id=day.id returning * into day;
  response:=jsonb_build_object('trading_day_id',day.id,'expected_cash_cents',expected,
    'counted_cash_cents',counted,'discrepancy_cents',discrepancy,'ended_at',day.ended_at);
 else raise exception 'Unknown cash command'; end if;
 insert into akihq_hospitality.cash_commands(workspace_id,key,actor,request,response) values(p_workspace,p_key,actor,p_command,response);
 return response;
end $$;

-- Older clients may still call the trading-day end action. New trading days
-- must be closed through the atomic count-and-close command instead.
create or replace function public.crm_pos_trading_day(p_workspace text,p_action text,p_day uuid default null,p_label text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare d akihq_hospitality.trading_days%rowtype; open_bills integer;
begin
 perform akihq_hospitality.guard(p_workspace);
 if not akihq_security.can_administer(p_workspace) then raise exception 'Manager permission is required to start or end a trading day' using errcode='42501'; end if;
 if p_action not in ('start','end') or p_action is null then raise exception 'Invalid trading day action'; end if;
 perform pg_advisory_xact_lock(hashtextextended('akihq-trading-day:'||p_workspace,0));
 if p_action='start' then
  select * into d from akihq_hospitality.trading_days where workspace_id=p_workspace and ended_at is null for update;
  if d.id is null then insert into akihq_hospitality.trading_days(workspace_id,label,started_by)
    values(p_workspace,left(btrim(coalesce(p_label,'')),100),auth.uid()) returning * into d; end if;
 else
  select * into d from akihq_hospitality.trading_days
   where workspace_id=p_workspace and (p_day is null and ended_at is null or id=p_day)
   order by started_at desc limit 1 for update;
  if d.id is null then raise exception 'No trading day to close'; end if;
  if d.ended_at is null and exists(select 1 from akihq_hospitality.cash_shifts s where s.trading_day_id=d.id and s.reconciled_at is null)
   then raise exception 'Count and reconcile the cash drawer before ending this trading day'; end if;
  if d.ended_at is null then update akihq_hospitality.trading_days set ended_at=now(),ended_by=auth.uid() where id=d.id returning * into d; end if;
 end if;
 select count(*) into open_bills from akihq_hospitality.orders where workspace_id=p_workspace and status='open';
 return jsonb_build_object('day',to_jsonb(d),'open_bills',open_bills);
end $$;

revoke all on function akihq_hospitality.open_cash_shift(),akihq_hospitality.cash_expected(text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.crm_pos_cash_overview(text),public.crm_pos_cash_command(text,uuid,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.crm_pos_trading_day(text,text,uuid,text) from public,anon;
grant execute on function public.crm_pos_cash_overview(text),public.crm_pos_cash_command(text,uuid,jsonb),public.crm_pos_trading_day(text,text,uuid,text) to authenticated;
commit;
