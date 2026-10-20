-- Failed recipients must not monopolise every bounded claim. No activation.
begin;
alter table akibusiness_private.toolbox_notifications add column retry_after timestamptz not null default now();
create index toolbox_notifications_due on akibusiness_private.toolbox_notifications(retry_after,history_id) where delivered_at is null;
create or replace function akibusiness_private.deliver_toolbox_notifications(p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path='' as $$
declare n akibusiness_private.toolbox_notifications; h akibusiness_private.toolbox_history; completed integer:=0; failed integer:=0; recipients integer;
begin
 if not exists(select 1 from akibusiness_private.toolbox_notification_settings where enabled) then return jsonb_build_object('enabled',false); end if;
 for n in select * from akibusiness_private.toolbox_notifications where delivered_at is null and retry_after<=statement_timestamp() order by retry_after,history_id limit greatest(1,least(coalesce(p_limit,100),500)) for update skip locked loop
  begin
   select * into strict h from akibusiness_private.toolbox_history where id=n.history_id and workspace_id=n.workspace_id;
   if n.snapshot is null then
    -- Historical outbox rows cannot reconstruct historical employee permissions.
    -- Report unknown rather than inventing an affected count from current grants.
    n.snapshot:=jsonb_build_object('affected_staff',null);
   end if;
   select count(*) into recipients from public.crm_workspace_members m where m.workspace_id=n.workspace_id and m.role='owner' and m.status='active';
   if recipients=0 then raise exception 'No active owner'; end if;
   insert into akibusiness_private.toolbox_owner_inbox(history_id,recipient,workspace_id,active_tools,removed_tools,affected_staff,created_at)
   select h.id,m.profile_id,h.workspace_id,h.new_tools,array(select t from unnest(h.old_tools)t where not t=any(h.new_tools)),coalesce(n.snapshot->'affected_staff','null'::jsonb),h.created_at
   from public.crm_workspace_members m where m.workspace_id=h.workspace_id and m.role='owner' and m.status='active'
   on conflict(history_id,recipient) do nothing;
   update akibusiness_private.toolbox_notifications set delivered_at=now(),attempts=attempts+1 where history_id=n.history_id;
   completed:=completed+1;
  exception when others then
   update akibusiness_private.toolbox_notifications set attempts=attempts+1,
    retry_after=statement_timestamp()+make_interval(secs=>least(3600,30*power(2,least(greatest(n.attempts,0),7)))::integer)
    where history_id=n.history_id;
   failed:=failed+1;
  end;
 end loop;
 return jsonb_build_object('enabled',true,'completed',completed,'failed',failed);
end $$;
revoke all on function akibusiness_private.deliver_toolbox_notifications(integer) from public,anon,authenticated;
grant execute on function akibusiness_private.deliver_toolbox_notifications(integer) to service_role;
commit;
