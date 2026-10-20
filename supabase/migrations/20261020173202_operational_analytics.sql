begin;

-- Existing source tables keep their RLS and grants. No browser access to private events is added.
create index if not exists hospitality_events_workspace_time on akihq_hospitality.events(workspace_id,created_at);
create index if not exists inventory_value_events_workspace_time on public.crm_inventory_value_events(workspace_id,recorded_at);

create function akihq_security.operational_analytics(p_workspace text,p_days integer default 30,p_through date default null,p_export boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 tz text; today date; through_day date; from_day date; previous_day date;
 from_at timestamptz; until_at timestamptz; previous_at timestamptz; cutoff timestamptz;
 can_pos boolean; can_inventory boolean; can_staff boolean; export_tools jsonb;
 sales jsonb:=null; inventory jsonb:=null; staff jsonb:=null;
 sale_summary jsonb; sale_daily jsonb; snapshots jsonb:='{}'; flows jsonb;
 snapshot_name text; snapshot_at timestamptz; snapshot_rows jsonb;
 staff_rows jsonb; actor_count integer; staff_totals jsonb; active_members integer;
begin
 if (select auth.uid()) is null or not public.crm_can_access_workspace(p_workspace)
 or not exists(select 1 from public.crm_workspaces w where w.id=p_workspace and w.status in ('active','trial')) then
  raise exception 'Active location membership required' using errcode='42501';
 end if;
 if p_days is null or p_days<1 or p_days>366 then raise exception 'Choose a period of 1 to 366 calendar days' using errcode='22023'; end if;
 if p_export is null then raise exception 'Invalid export mode' using errcode='22023'; end if;
 select coalesce(nullif(timezone,''),'Europe/Madrid') into tz from public.crm_workspaces where id=p_workspace;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then raise exception 'Location timezone must be corrected' using errcode='22023'; end if;
 today:=(now() at time zone tz)::date;
 through_day:=coalesce(p_through,today-1);
 if through_day>today or through_day<today-3650 then raise exception 'Choose a recorded date within the past ten years' using errcode='22023'; end if;
 from_day:=through_day-p_days+1; previous_day:=from_day-p_days;
 from_at:=from_day::timestamp at time zone tz;
 until_at:=(through_day+1)::timestamp at time zone tz;
 previous_at:=previous_day::timestamp at time zone tz;
 cutoff:=least(until_at,now());
 can_pos:=coalesce(akihq_security.can_tool(p_workspace,'pos'),false) and (not p_export or coalesce(akihq_security.can_export(p_workspace,'pos'),false));
 can_inventory:=coalesce(akihq_security.can_tool(p_workspace,'inventory'),false) and (not p_export or coalesce(akihq_security.can_export(p_workspace,'inventory'),false));
 can_staff:=coalesce(akihq_security.can_tool(p_workspace,'employees'),false) and (not p_export or coalesce(akihq_security.can_export(p_workspace,'employees'),false));
 select coalesce(jsonb_agg(tool),'[]') into export_tools from unnest(array['pos','inventory','employees']) tool
 where akihq_security.can_export(p_workspace,tool);
 if p_export and not(can_pos or can_inventory or can_staff) then raise exception 'Report export permission required' using errcode='42501'; end if;

 if can_pos then
  if (select count(distinct currency) from public.crm_pos_sales where workspace_id=p_workspace and sold_at>=previous_at and sold_at<cutoff)>16 then
   raise exception 'Too many historical currencies for one report; use a reviewed currency-specific export' using errcode='54000';
  end if;
  with facts as (
   select currency,case when sold_at>=from_at then 'current' else 'previous' end as period,
    count(*) filter(where status='completed') as completed_sales,
    coalesce(sum(total_cents) filter(where status='completed'),0)::text as recorded_sales_cents,
    count(*) filter(where status='refunded') as refunded_sales,
    count(*) filter(where status='voided') as voided_sales
   from public.crm_pos_sales where workspace_id=p_workspace and sold_at>=previous_at and sold_at<cutoff
   group by currency,case when sold_at>=from_at then 'current' else 'previous' end
  ) select coalesce(jsonb_agg(to_jsonb(facts) order by currency,period),'[]') into sale_summary from facts;
  with facts as (
   select (sold_at at time zone tz)::date as day,currency,count(*) as completed_sales,sum(total_cents)::text as recorded_sales_cents
   from public.crm_pos_sales where workspace_id=p_workspace and status='completed' and sold_at>=from_at and sold_at<cutoff
   group by (sold_at at time zone tz)::date,currency
  ) select coalesce(jsonb_agg(to_jsonb(facts) order by day,currency),'[]') into sale_daily from facts;
  sales:=jsonb_build_object('summary',sale_summary,'daily',sale_daily,'tips_available',false,'source','crm_pos_sales','measure','recorded_completed_sale_totals','profitability_available',false);
 end if;

 if can_inventory then
  foreach snapshot_name in array array['previous_opening','opening','closing'] loop
   snapshot_at:=case snapshot_name when 'previous_opening' then previous_at-interval '1 microsecond' when 'opening' then from_at-interval '1 microsecond' else cutoff-interval '1 microsecond' end;
   with valuation as (select * from public.crm_inventory_valuation(p_workspace,snapshot_at)), grouped as (
    select currency,count(*) as tracked_rows,
     count(*) filter(where cost_status='unknown_cost') as unknown_cost_rows,
     count(*) filter(where cost_status='not_recorded') as unrecorded_rows,
     coalesce(sum(carrying_value_cents),0)::text as known_value_cents,
     case when bool_and(cost_status='recorded_weighted_average') then coalesce(sum(carrying_value_cents),0)::text else null end as complete_value_cents
    from valuation group by currency
   ) select coalesce(jsonb_agg(to_jsonb(grouped) order by currency),'[]') into snapshot_rows from grouped;
   if jsonb_array_length(snapshot_rows)>16 then raise exception 'Too many inventory currencies for one report' using errcode='54000'; end if;
   snapshots:=snapshots||jsonb_build_object(snapshot_name,jsonb_build_object('at',snapshot_at,'currencies',snapshot_rows));
  end loop;
  with facts as (
   select currency,case when recorded_at>=from_at then 'current' else 'previous' end as period,
    count(*) filter(where event_type='sale') as sale_movements,
    count(*) filter(where event_type='waste') as waste_movements,
    count(*) filter(where event_type in ('sale','waste') and value_delta_cents is null) as unknown_outflow_cost_rows,
    coalesce(sum(-value_delta_cents) filter(where event_type='sale' and value_delta_cents<=0),0)::text as known_sale_consumption_cents,
    coalesce(sum(-value_delta_cents) filter(where event_type='waste' and value_delta_cents<=0),0)::text as known_waste_cents
   from public.crm_inventory_value_events where workspace_id=p_workspace and recorded_at>=previous_at and recorded_at<cutoff
   group by currency,case when recorded_at>=from_at then 'current' else 'previous' end
  ) select coalesce(jsonb_agg(to_jsonb(facts) order by currency,period),'[]') into flows from facts;
  if jsonb_array_length(flows)>32 then raise exception 'Too many inventory currency groups for one report' using errcode='54000'; end if;
  inventory:=jsonb_build_object('snapshots',snapshots,'flows',flows,'source','crm_inventory_value_events','valuation_method','recorded_weighted_average','profitability_available',false);
 end if;

 if can_staff then
  -- Source access is intersected again: an Employees-only user never sees PoS or inventory activity.
  with actions as (
   select e.actor as actor_id,e.created_at as at,'pos'::text as source from akihq_hospitality.events e
   where can_pos and e.workspace_id=p_workspace and e.created_at>=previous_at and e.created_at<cutoff
   union all
   select o.actor_id,o.recorded_at,'inventory' from public.crm_inventory_operations o
   where can_inventory and o.workspace_id=p_workspace and o.recorded_at>=previous_at and o.recorded_at<cutoff
  ), grouped as (
   select actor_id,count(*) filter(where at>=from_at) as current_actions,count(*) filter(where at<from_at) as previous_actions,
    count(*) filter(where at>=from_at and source='pos') as pos_actions,count(*) filter(where at>=from_at and source='inventory') as inventory_actions
   from actions group by actor_id
  ), limited as (select * from grouped order by current_actions desc,actor_id limit 50)
  select coalesce(jsonb_agg(jsonb_build_object('actor_id',g.actor_id,'display_name',case when exists(select 1 from public.crm_workspace_members m where m.workspace_id=p_workspace and m.profile_id=g.actor_id) then nullif(p.display_name,'') else null end,
    'current_actions',g.current_actions,'previous_actions',g.previous_actions,'pos_actions',g.pos_actions,'inventory_actions',g.inventory_actions) order by g.current_actions desc,g.actor_id),'[]') into staff_rows
  from limited g left join public.profiles p on p.id=g.actor_id;
  with actions as (
   select e.actor as actor_id,e.created_at as at from akihq_hospitality.events e where can_pos and e.workspace_id=p_workspace and e.created_at>=previous_at and e.created_at<cutoff
   union all
   select o.actor_id,o.recorded_at from public.crm_inventory_operations o where can_inventory and o.workspace_id=p_workspace and o.recorded_at>=previous_at and o.recorded_at<cutoff
  ) select count(distinct actor_id),jsonb_build_object('current_actions',count(*) filter(where at>=from_at),'previous_actions',count(*) filter(where at<from_at)) into actor_count,staff_totals from actions;
  select count(*) into active_members from public.crm_workspace_members where workspace_id=p_workspace and status='active';
  staff:=jsonb_build_object('actors',staff_rows,'actor_count',actor_count,'actors_truncated',actor_count>50,'totals',staff_totals,'active_members',active_members,
    'sources',to_jsonb(array_remove(array[case when can_pos then 'pos' end,case when can_inventory then 'inventory' end],null)),'measure','recorded_actions_not_hours_or_productivity');
 end if;
 return jsonb_build_object('schema_version',1,'workspace_id',p_workspace,'timezone',tz,'generated_at',now(),
  'period',jsonb_build_object('from_date',from_day,'through_date',through_day,'from_at',from_at,'until_at',until_at,'effective_until',cutoff,'partial',until_at>now(),'days',p_days,
   'previous_from_date',previous_day,'previous_through_date',from_day-1,'previous_from_at',previous_at,'previous_until_at',from_at),
  'permissions',jsonb_build_object('pos',can_pos,'inventory',can_inventory,'employees',can_staff,'export_tools',export_tools),
  'sales',sales,'inventory',inventory,'staff',staff,'export',p_export,'sitewide_discovery_included',false,'profitability_available',false);
end $$;
revoke all on function akihq_security.operational_analytics(text,integer,date,boolean) from public,anon;
grant execute on function akihq_security.operational_analytics(text,integer,date,boolean) to authenticated;

create function public.crm_operational_analytics(p_workspace text,p_days integer default 30,p_through date default null,p_export boolean default false)
returns jsonb language sql stable security invoker set search_path='' as $$
 select akihq_security.operational_analytics(p_workspace,p_days,p_through,p_export);
$$;
revoke all on function public.crm_operational_analytics(text,integer,date,boolean) from public,anon;
grant execute on function public.crm_operational_analytics(text,integer,date,boolean) to authenticated;
comment on function public.crm_operational_analytics(text,integer,date,boolean) is 'Scoped paid operational aggregates. Source-tool and export authorization are rechecked on every request. Unknown historical costs remain unknown; no profit or sitewide discovery attribution.';
commit;
