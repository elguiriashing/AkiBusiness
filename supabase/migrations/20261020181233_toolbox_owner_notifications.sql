begin;
-- The inspected shared schema has no general notifications table. Extend the
-- existing Business bell using a private durable recipient inbox, not customer mail.
create table akibusiness_private.toolbox_notification_settings (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into akibusiness_private.toolbox_notification_settings values(true,false);
alter table akibusiness_private.toolbox_notification_settings enable row level security;
create table akibusiness_private.toolbox_owner_inbox (
 history_id bigint not null references akibusiness_private.toolbox_history(id),
 recipient uuid not null references public.profiles(id) on delete cascade,workspace_id text not null,
 active_tools text[] not null,removed_tools text[] not null,affected_staff jsonb not null,
 created_at timestamptz not null default now(),primary key(history_id,recipient)
);
alter table akibusiness_private.toolbox_owner_inbox enable row level security;
create index toolbox_owner_inbox_latest on akibusiness_private.toolbox_owner_inbox(recipient,workspace_id,created_at desc);
alter table akibusiness_private.toolbox_notifications add column snapshot jsonb;
revoke all on akibusiness_private.toolbox_notification_settings,akibusiness_private.toolbox_owner_inbox from public,anon,authenticated;

create function akibusiness_private.capture_toolbox_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare h akibusiness_private.toolbox_history;
begin
 select * into strict h from akibusiness_private.toolbox_history where id=new.history_id;
 if h.workspace_id<>new.workspace_id then raise exception 'Notification scope mismatch'; end if;
 new.snapshot:=jsonb_build_object('affected_staff',(select coalesce(jsonb_agg(jsonb_build_object('profile_id',m.profile_id,'label',coalesce(p.display_name,p.username,'Team member'),'tools',x.tools)),'[]')
 from public.crm_workspace_members m left join public.profiles p on p.id=m.profile_id
 cross join lateral (select coalesce(array_agg(t),'{}') tools from unnest(h.old_tools)t
 where not t=any(h.new_tools) and (m.role='admin' and m.role_template_id is null or exists(
 select 1 from public.crm_role_templates rt join public.crm_role_template_tools tt on tt.template_id=rt.id
 where rt.id=m.role_template_id and rt.workspace_id=m.workspace_id and akibusiness_private.parent_tool(tt.tool_key)=t))
 and (not exists(select 1 from akibusiness_private.member_tool_limits l where l.workspace_id=m.workspace_id and l.profile_id=m.profile_id)
 or exists(select 1 from akibusiness_private.member_tool_limits l where l.workspace_id=m.workspace_id and l.profile_id=m.profile_id and t=any(l.tools))))x
 where m.workspace_id=h.workspace_id and m.status='active' and m.role<>'owner' and cardinality(x.tools)>0));
 return new;
end $$;
create trigger toolbox_notification_snapshot before insert on akibusiness_private.toolbox_notifications for each row execute function akibusiness_private.capture_toolbox_notification();

create function akibusiness_private.deliver_toolbox_notifications(p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path='' as $$
declare n akibusiness_private.toolbox_notifications; h akibusiness_private.toolbox_history; completed integer:=0; failed integer:=0; recipients integer;
begin
 if not exists(select 1 from akibusiness_private.toolbox_notification_settings where enabled) then return jsonb_build_object('enabled',false); end if;
 for n in select * from akibusiness_private.toolbox_notifications where delivered_at is null order by history_id limit greatest(1,least(coalesce(p_limit,100),500)) for update skip locked loop
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
   update akibusiness_private.toolbox_notifications set attempts=attempts+1 where history_id=n.history_id;
   failed:=failed+1;
  end;
 end loop;
 return jsonb_build_object('enabled',true,'completed',completed,'failed',failed);
end $$;
create function akibusiness_private.deliver_new_toolbox_notification() returns trigger
language plpgsql security definer set search_path='' as $$begin
 -- Delivery exceptions are isolated by the processor; never lose a rotation.
 perform akibusiness_private.deliver_toolbox_notifications(100);return new;
end $$;
create trigger toolbox_notification_delivery after insert on akibusiness_private.toolbox_notifications for each row execute function akibusiness_private.deliver_new_toolbox_notification();

create function public.crm_toolbox_deliver_notifications(p_limit integer default 100) returns jsonb language sql security invoker set search_path='' as $$select akibusiness_private.deliver_toolbox_notifications(p_limit)$$;
create function akibusiness_private.owner_notifications(p_workspace text) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if not akibusiness_private.owner(p_workspace) then raise exception 'Owner access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(n)-'recipient' order by n.created_at desc,n.history_id desc) from (
 select * from akibusiness_private.toolbox_owner_inbox where workspace_id=p_workspace and recipient=auth.uid() order by created_at desc,history_id desc limit 30)n),'[]');
end $$;
create function public.crm_toolbox_owner_notifications(p_workspace text) returns jsonb language sql stable security invoker set search_path='' as $$select akibusiness_private.owner_notifications(p_workspace)$$;
revoke all on function akibusiness_private.capture_toolbox_notification(),akibusiness_private.deliver_new_toolbox_notification(),akibusiness_private.deliver_toolbox_notifications(integer),akibusiness_private.owner_notifications(text),public.crm_toolbox_deliver_notifications(integer),public.crm_toolbox_owner_notifications(text) from public,anon,authenticated;
grant execute on function akibusiness_private.deliver_toolbox_notifications(integer),public.crm_toolbox_deliver_notifications(integer) to service_role;
grant execute on function akibusiness_private.owner_notifications(text),public.crm_toolbox_owner_notifications(text) to authenticated;
-- A reviewed service migration enables this table flag. It is false on install.
commit;
