-- Generated with Supabase CLI 2.122.0 (Actions run 41197723571).
-- Forward-only recovery contract. No queue replay, fiscal activation or data reset.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '8s';

create unique index hospitality_printer_recovery_once
 on akihq_hospitality.events(workspace_id,(metadata->>'device_id'),(metadata->>'ticket_id'))
 where action='printer_recover';

create or replace function public.crm_printer_report(p_device uuid,p_token text,p_ticket uuid,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d akihq_hospitality.printers; t akihq_hospitality.tickets; prior_status text;
begin
 d:=akihq_hospitality.printer_guard(p_device,p_token);
 perform pg_advisory_xact_lock(hashtextextended('akihq-hospitality:'||d.workspace_id,0));
 d:=akihq_hospitality.printer_guard(p_device,p_token);
 select * into t from akihq_hospitality.tickets where id=p_ticket and workspace_id=d.workspace_id and printer_id=d.id and station=any(d.stations) for update;
 if not found then raise exception 'Printer ticket not found'; end if;
 if p_action='recover' then
  if t.status not in ('claimed','uncertain','spooled','confirmed') then raise exception 'Invalid printer recovery state'; end if;
  prior_status:=t.status;
  if t.status='claimed' then
   update akihq_hospitality.tickets set status='uncertain' where id=t.id returning * into t;
  end if;
  -- Preserve completed states and append evidence once even if a reply is lost.
  insert into akihq_hospitality.events(workspace_id,order_id,actor,command_id,action,metadata)
  values(d.workspace_id,t.order_id,d.authorized_by,gen_random_uuid(),'printer_recover',
   jsonb_build_object('device_id',d.id,'ticket_id',t.id,'previous_status',prior_status,'status',t.status,'reprint',false))
  on conflict do nothing;
  return jsonb_build_object('recovery_contract',1,'device_id',d.id,'ticket_id',t.id,'status',t.status,'reprint',false);
 elsif p_action='begin' then
  -- A duplicate begin is never permission to print again.
  if t.status<>'claimed' then raise exception 'Print already attempted; inspect printer and request a marked copy'; end if;
  update akihq_hospitality.tickets set status='uncertain' where id=t.id;
 elsif p_action='spooled' then
  if t.status='spooled' then return '{"status":"spooled"}'; end if;
  if t.status<>'uncertain' then raise exception 'Record an attempt before spooling'; end if;
  update akihq_hospitality.tickets set status='spooled' where id=t.id;
 elsif p_action='uncertain' then
  if t.status not in ('claimed','uncertain') then raise exception 'Invalid print state'; end if;
  update akihq_hospitality.tickets set status='uncertain' where id=t.id;
 else raise exception 'Unknown printer status'; end if;
 insert into akihq_hospitality.events(workspace_id,order_id,actor,command_id,action,metadata) values(d.workspace_id,t.order_id,d.authorized_by,gen_random_uuid(),'printer_'||p_action,jsonb_build_object('device_id',d.id,'ticket_id',t.id));
 return jsonb_build_object('status',case when p_action='spooled' then 'spooled' else 'uncertain' end);
end $$;
-- Keep the existing device-token-scoped endpoint permissions; no table grants.
revoke all on function public.crm_printer_report(uuid,text,uuid,text) from public;
grant execute on function public.crm_printer_report(uuid,text,uuid,text) to anon,authenticated;
commit;
