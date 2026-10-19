-- Bind every drawer command to the manager-reviewed trading day.
-- This follows the already-deployed additive cash reconciliation migration.
begin;

create or replace function public.crm_pos_cash_command(p_workspace text,p_key uuid,p_command jsonb) returns jsonb
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
 perform pg_advisory_xact_lock(hashtextextended('akihq-hospitality:'||p_workspace,0));
 select * into prior from akihq_hospitality.cash_commands where workspace_id=p_workspace and key=p_key;
 if found then
  if prior.actor<>actor or prior.request<>p_command then raise exception 'Request reference already used'; end if;
  return prior.response;
 end if;
 select * into day from akihq_hospitality.trading_days where workspace_id=p_workspace and ended_at is null order by started_at desc limit 1 for update;
 if day.id is null then raise exception 'Start a trading day before using cash controls'; end if;
 if nullif(p_command->>'trading_day_id','')::uuid is distinct from day.id then raise exception 'Trading day changed; reload cash controls'; end if;
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

revoke all on function public.crm_pos_cash_command(text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.crm_pos_cash_command(text,uuid,jsonb) to authenticated;
commit;
