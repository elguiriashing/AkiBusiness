-- Rotas is a separate operational view included with People for this release.
-- No subscription prices, allowances or existing toolbox selections change.
begin;
create schema if not exists akibusiness_rotas;
revoke all on schema akibusiness_rotas from public,anon;
grant usage on schema akibusiness_rotas to authenticated;
create table akibusiness_rotas.schedules (
 workspace_id text primary key references public.crm_workspaces(id) on delete cascade,
 data jsonb not null,
 published jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 updated_by uuid not null,
 published_at timestamptz
);
create table akibusiness_rotas.history (
 id bigint generated always as identity primary key,
 workspace_id text not null references public.crm_workspaces(id) on delete cascade,
 revision bigint not null, actor uuid not null, action text not null check(action in ('save','publish')),
 created_at timestamptz not null default now()
);
create index rota_history_workspace on akibusiness_rotas.history(workspace_id,revision);
alter table akibusiness_rotas.schedules enable row level security;
alter table akibusiness_rotas.history enable row level security;
revoke all on all tables in schema akibusiness_rotas from public,anon,authenticated;
revoke all on all sequences in schema akibusiness_rotas from public,anon,authenticated;

create function akibusiness_rotas.allowed(w text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and akihq_security.can_tool(w,'employees')
 and exists(select 1 from public.crm_workspaces where id=w and status in ('active','trial'));
$$;
create function akibusiness_rotas.manager(w text) returns boolean language sql stable security definer set search_path='' as $$
 select akibusiness_rotas.allowed(w) and akihq_security.can_administer(w);
$$;
create function akibusiness_rotas.empty_data() returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('settings',jsonb_build_object('title','Team rota','timezone','Europe/Madrid','timeFormat','24'),'staff','[]'::jsonb,'shifts','[]'::jsonb,'absences','[]'::jsonb,'templates','[]'::jsonb);
$$;
create function akibusiness_rotas.read_schedule(w text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s akibusiness_rotas.schedules; d jsonb; m boolean; team jsonb; own_ids text[];
begin
 if not coalesce(akibusiness_rotas.allowed(w),false) then raise exception 'People access required' using errcode='42501';end if;
 m:=akibusiness_rotas.manager(w);
 select * into s from akibusiness_rotas.schedules where workspace_id=w;
 d:=coalesce(s.data,akibusiness_rotas.empty_data());
 if m then
  select coalesce(jsonb_agg(jsonb_build_object('profileId',a.profile_id,'name',coalesce(nullif(p.display_name,''),'Team member')) order by p.display_name),'[]'::jsonb) into team
   from public.crm_workspace_members a left join public.profiles p on p.id=a.profile_id where a.workspace_id=w and a.status='active';
  return jsonb_build_object('workspace',w,'manage',true,'revision',coalesce(s.revision,0),'data',d,'published',s.published,'publishedAt',s.published_at,'members',team);
 end if;
 -- Staff receive only their published shifts, never drafts, coworker records or leave reasons.
 d:=coalesce(s.published,akibusiness_rotas.empty_data());
 select coalesce(array_agg(p->>'id'),'{}') into own_ids from jsonb_array_elements(d->'staff') p where p->>'profileId'=auth.uid()::text;
 d:=jsonb_build_object('settings',d->'settings','staff',coalesce((select jsonb_agg(jsonb_build_object('id',p->>'id','name',p->>'name','profileId',p->>'profileId','weeklyHours',0)) from jsonb_array_elements(d->'staff') p where p->>'id'=any(own_ids)),'[]'::jsonb),
  'shifts',coalesce((select jsonb_agg(a) from jsonb_array_elements(d->'shifts') a where a->>'staffId'=any(own_ids)),'[]'::jsonb),'absences','[]'::jsonb,'templates','[]'::jsonb);
 return jsonb_build_object('workspace',w,'manage',false,'revision',coalesce(s.revision,0),'data',d,'published',d,'publishedAt',s.published_at,'members','[]'::jsonb);
end $$;

create function akibusiness_rotas.validate_document(w text,d jsonb) returns void language plpgsql security definer set search_path='' as $$
declare p jsonb; s jsonb; a jsonb; start_at timestamp; end_at timestamp; n integer;
begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>1000000 or d-array['settings','staff','shifts','absences','templates'] <> '{}'::jsonb
 or jsonb_typeof(d->'settings') is distinct from 'object'
 or jsonb_typeof(d->'staff') is distinct from 'array' or jsonb_typeof(d->'shifts') is distinct from 'array'
 or jsonb_typeof(d->'absences') is distinct from 'array' or jsonb_typeof(d->'templates') is distinct from 'array'
 then raise exception 'Invalid rota document';end if;
 if jsonb_array_length(d->'staff')>200 or jsonb_array_length(d->'shifts')>1000 or jsonb_array_length(d->'absences')>1000 or jsonb_array_length(d->'templates')>100 then raise exception 'Rota size limit exceeded';end if;
 if coalesce(length(d#>>'{settings,title}'),0) not between 1 and 120
 or not exists(select 1 from pg_catalog.pg_timezone_names where name=d#>>'{settings,timezone}')
 or coalesce(d#>>'{settings,timeFormat}','') not in ('12','24') then raise exception 'Invalid rota settings';end if;
 if exists(select 1 from jsonb_array_elements(d->'staff') x group by x->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(d->'staff') x where nullif(x->>'profileId','') is not null group by x->>'profileId' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(d->'shifts') x group by x->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(d->'absences') x group by x->>'id' having count(*)>1)
 then raise exception 'Duplicate rota identifiers';end if;
 for p in select value from jsonb_array_elements(d->'staff') loop
  if coalesce(length(p->>'id'),0) not between 1 and 100 or coalesce(length(btrim(p->>'name')),0) not between 1 and 120
  or coalesce(length(p->>'department'),0)>120 or coalesce(p->>'weeklyHours','') !~ '^\d+(\.\d+)?$'
  or (p->>'weeklyHours')::numeric not between 0 and 168 then raise exception 'Invalid staff profile';end if;
  if nullif(p->>'profileId','') is not null and not exists(select 1 from public.crm_workspace_members where workspace_id=w and profile_id::text=p->>'profileId' and status='active')
   -- Preserve historical records when someone leaves; never create a new link to a non-member.
   and not exists(select 1 from akibusiness_rotas.schedules old cross join lateral jsonb_array_elements(old.data->'staff') prev where old.workspace_id=w and prev->>'id'=p->>'id' and prev->>'profileId'=p->>'profileId')
   then raise exception 'Linked staff must belong to this workspace';end if;
 end loop;
 for s in select value from jsonb_array_elements(d->'shifts') loop
  if coalesce(length(s->>'id'),0) not between 1 and 100 or not exists(select 1 from jsonb_array_elements(d->'staff') st where st->>'id'=s->>'staffId')
  or coalesce(s->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(s->>'endDate','') !~ '^\d{4}-\d{2}-\d{2}$'
  or coalesce(s->>'start','') !~ '^([01]\d|2[0-3]):[0-5]\d$' or coalesce(s->>'end','') !~ '^([01]\d|2[0-3]):[0-5]\d$'
  or coalesce(s->>'breakMinutes','') !~ '^\d{1,4}$' or coalesce(length(s->>'role'),0)>120 or coalesce(length(s->>'location'),0)>120 or coalesce(length(s->>'notes'),0)>1000 then raise exception 'Invalid shift';end if;
  start_at:=(s->>'date')::date+(s->>'start')::time;end_at:=(s->>'endDate')::date+(s->>'end')::time;n:=(s->>'breakMinutes')::integer;
  if end_at<=start_at or end_at-start_at>interval '24 hours' or n<0 or n>=extract(epoch from(end_at-start_at))/60 then raise exception 'Shift must last up to 24 hours with a shorter break';end if;
 end loop;
 for a in select value from jsonb_array_elements(d->'absences') loop
  if coalesce(length(a->>'id'),0) not between 1 and 100 or not exists(select 1 from jsonb_array_elements(d->'staff') st where st->>'id'=a->>'staffId')
   or coalesce(a->>'from','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(a->>'through','') !~ '^\d{4}-\d{2}-\d{2}$'
   or (a->>'through')::date<(a->>'from')::date or coalesce(length(a->>'reason'),0)>200 then raise exception 'Invalid absence';end if;
 end loop;
 for s in select value from jsonb_array_elements(d->'templates') loop
  if coalesce(length(s->>'id'),0) not between 1 and 100 or coalesce(length(btrim(s->>'name')),0) not between 1 and 120
   or coalesce(s->>'start','') !~ '^([01]\d|2[0-3]):[0-5]\d$' or coalesce(s->>'end','') !~ '^([01]\d|2[0-3]):[0-5]\d$'
   or coalesce(s->>'breakMinutes','') !~ '^\d{1,4}$' or (s->>'breakMinutes')::int>=1440
   or jsonb_typeof(s->'overnight') is distinct from 'boolean' or coalesce(length(s->>'role'),0)>120 or coalesce(length(s->>'location'),0)>120 then raise exception 'Invalid shift template';end if;
 end loop;
end $$;

create function akibusiness_rotas.save_schedule(w text,d jsonb,r bigint,publish boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision bigint;begin
 if not coalesce(akibusiness_rotas.manager(w),false) then raise exception 'People administrator access required' using errcode='42501';end if;
 -- Serialize first saves as well as subsequent updates, including across browser tabs.
 perform 1 from public.crm_workspaces where id=w for update;
 select revision into current_revision from akibusiness_rotas.schedules where workspace_id=w for update;
 if r is null or r<>coalesce(current_revision,0) then raise exception 'Rota changed; reload latest before saving' using errcode='40001';end if;
 perform akibusiness_rotas.validate_document(w,d);
 if publish then
  if exists(select 1 from jsonb_array_elements(d->'shifts') with ordinality x(s,i) join jsonb_array_elements(d->'shifts') with ordinality y(t,j)
    on x.i<y.j and s->>'staffId'=t->>'staffId'
    where (s->>'date')::date+(s->>'start')::time < (t->>'endDate')::date+(t->>'end')::time
    and (t->>'date')::date+(t->>'start')::time < (s->>'endDate')::date+(s->>'end')::time)
   or exists(select 1 from jsonb_array_elements(d->'shifts') s join jsonb_array_elements(d->'absences') a on s->>'staffId'=a->>'staffId'
    where (s->>'date')::date+(s->>'start')::time < (a->>'through')::date+interval '1 day'
    and (s->>'endDate')::date+(s->>'end')::time > (a->>'from')::date)
   then raise exception 'Resolve overlapping shifts and time-off conflicts before publishing';end if;
 end if;
 insert into akibusiness_rotas.schedules(workspace_id,data,published,revision,updated_by,published_at)
 values(w,d,case when publish then d end,coalesce(current_revision,0)+1,auth.uid(),case when publish then now() end)
 on conflict(workspace_id) do update set data=d,revision=coalesce(current_revision,0)+1,updated_by=auth.uid(),updated_at=now(),
 published=case when publish then d else schedules.published end,published_at=case when publish then now() else schedules.published_at end;
 insert into akibusiness_rotas.history(workspace_id,revision,actor,action)values(w,coalesce(current_revision,0)+1,auth.uid(),case when publish then 'publish' else 'save' end);
 return akibusiness_rotas.read_schedule(w);
end $$;
create function public.crm_rota_read(p_workspace text) returns jsonb language sql stable security invoker set search_path='' as $$select akibusiness_rotas.read_schedule(p_workspace)$$;
create function public.crm_rota_save(p_workspace text,p_data jsonb,p_revision bigint,p_publish boolean default false) returns jsonb language sql security invoker set search_path='' as $$select akibusiness_rotas.save_schedule(p_workspace,p_data,p_revision,coalesce(p_publish,false))$$;
revoke all on all functions in schema akibusiness_rotas from public,anon,authenticated;
grant execute on function akibusiness_rotas.read_schedule(text),akibusiness_rotas.save_schedule(text,jsonb,bigint,boolean) to authenticated;
revoke all on function public.crm_rota_read(text),public.crm_rota_save(text,jsonb,bigint,boolean) from public,anon;
grant execute on function public.crm_rota_read(text),public.crm_rota_save(text,jsonb,bigint,boolean) to authenticated;
commit;
