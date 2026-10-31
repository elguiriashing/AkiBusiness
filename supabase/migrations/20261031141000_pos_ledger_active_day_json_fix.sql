-- Repair active trading-day counts: opened is a JSONB variable, not a table alias.
-- This additive function replacement preserves source fields and tenant guard.
begin;

-- Preserve the shared live account-completion boundary before replacing RPCs.
do $$begin
 if to_regprocedure('public.account_features_allowed()') is null then
  raise exception 'Shared account-completion prerequisite is missing';
 end if;
end $$;
create or replace function public.crm_pos_ledger(p_workspace text,p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 tz text; now_local timestamp; from_at timestamptz; until_at timestamptz;
 term_item text;term_table text;term_account text;term_shift text;
 min_price bigint;max_price bigint;take integer;skip integer;
 result_rows jsonb;filtered_count bigint;
 days jsonb;opened jsonb;actors jsonb;calendar_cents bigint;weekly_cents bigint;current_cents bigint;
 calendar_count bigint;weekly_count bigint;current_count bigint;unassigned bigint;
begin
 if auth.uid() is null or not coalesce(public.account_features_allowed(),false) then
  raise exception 'account completion required [coverage-v1]' using errcode='42501';
 end if;
 perform akihq_hospitality.guard(p_workspace);
 if p_filters is null then p_filters:='{}'::jsonb; end if;
 if jsonb_typeof(p_filters)<>'object' or octet_length(p_filters::text)>4000 then raise exception 'Invalid lookup filters'; end if;
 select coalesce(nullif(timezone,''),'Europe/Madrid') into tz from public.crm_workspaces where id=p_workspace;
 now_local:=now() at time zone tz;
 term_item:=left(btrim(coalesce(p_filters->>'item','')),100);
 term_table:=left(btrim(coalesce(p_filters->>'table','')),100);
 term_account:=left(btrim(coalesce(p_filters->>'account','')),100);
 term_shift:=coalesce(p_filters->>'trading_day','');
 if length(term_shift)>100 then raise exception 'Invalid trading day filter'; end if;
 if p_filters ? 'from_date' and nullif(p_filters->>'from_date','') is not null then
  from_at:=(p_filters->>'from_date')::date::timestamp at time zone tz;
 end if;
 if p_filters ? 'to_date' and nullif(p_filters->>'to_date','') is not null then
  until_at:=((p_filters->>'to_date')::date+1)::timestamp at time zone tz;
 end if;
 if from_at is not null and until_at is not null and until_at<=from_at then raise exception 'Invalid date range'; end if;
 min_price:=nullif(p_filters->>'min_cents','')::bigint;
 max_price:=nullif(p_filters->>'max_cents','')::bigint;
 if min_price<0 or max_price<0 or (min_price is not null and max_price is not null and min_price>max_price) then raise exception 'Invalid price range'; end if;
 take:=least(greatest(coalesce(nullif(p_filters->>'limit','')::integer,30),1),60);
 skip:=least(greatest(coalesce(nullif(p_filters->>'offset','')::integer,0),0),100000);
 -- Avoid resolving a broad, unbounded calendar range into a gigantic response:
 -- only lightweight totals are calculated over the entire workspace.
 with selected as (
  select b.* from akihq_hospitality.closed_bill_audit b
  where b.workspace_id=p_workspace
    and (from_at is null or b.closed_at>=from_at)
    and (until_at is null or b.closed_at<until_at)
    and (term_item='' or exists(select 1 from jsonb_array_elements(b.lines) x where x->>'name' ilike '%'||term_item||'%'))
    and (term_table='' or b.label ilike '%'||term_table||'%' or b.table_id::text ilike '%'||term_table||'%')
    and (term_account='' or b.closed_by_name ilike '%'||term_account||'%' or b.closed_by::text ilike '%'||term_account||'%')
    and (min_price is null or b.total_cents>=min_price)
    and (max_price is null or b.total_cents<=max_price)
    and (term_shift='' or (term_shift='unassigned' and b.trading_day_id is null) or
         (term_shift<>'unassigned' and b.trading_day_id::text=term_shift))
 ),
 paged as (
   select * from selected order by closed_at desc,id desc limit take offset skip
 )
 select (select count(*) from selected),
        coalesce((select jsonb_agg(jsonb_build_object(
         'id',p.id,'sale_id',p.sale_id,'closed_at',p.closed_at,'opened_at',p.opened_at,
         'label',p.label,'table_id',p.table_id,'closed_by',p.closed_by,
         'closed_by_name',p.closed_by_name,'total_cents',p.total_cents,
         'trading_day_id',p.trading_day_id,'lines',p.lines,'payments',p.payments,
         'guests',p.guests,'note',p.note,
         'history',coalesce((
           select jsonb_agg(jsonb_build_object('action',ev.action,'at',ev.created_at,
            'actor',coalesce(nullif(actor_profile.display_name,''),ev.actor::text))
            order by ev.id)
           from akihq_hospitality.events ev
           left join public.profiles actor_profile on actor_profile.id=ev.actor
           where ev.workspace_id=p_workspace and ev.order_id=p.id
         ),'[]'::jsonb)
        ) order by p.closed_at desc,p.id desc) from paged p),'[]'::jsonb)
 into filtered_count,result_rows;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.started_at desc),'[]'::jsonb) into days
 from (
  select d.id,d.label,d.started_at,d.ended_at,d.started_by,d.ended_by,
    coalesce((select sum(b.total_cents) from akihq_hospitality.closed_bill_audit b
      where b.workspace_id=p_workspace and b.trading_day_id=d.id),0)::bigint total_cents,
    (select count(*) from akihq_hospitality.closed_bill_audit b
      where b.workspace_id=p_workspace and b.trading_day_id=d.id)::bigint bill_count
  from akihq_hospitality.trading_days d where d.workspace_id=p_workspace
  order by d.started_at desc limit 120
 ) x;
 select to_jsonb(d) into opened from akihq_hospitality.trading_days d
   where workspace_id=p_workspace and ended_at is null order by started_at desc limit 1;
 select coalesce(sum(b.total_cents) filter (where b.closed_at >= (date_trunc('day',now_local) at time zone tz)),0),
        count(*) filter (where b.closed_at >= (date_trunc('day',now_local) at time zone tz)),
        coalesce(sum(b.total_cents) filter (where b.closed_at >= (date_trunc('week',now_local) at time zone tz)),0),
        count(*) filter (where b.closed_at >= (date_trunc('week',now_local) at time zone tz)),
        coalesce(sum(b.total_cents) filter (where b.trading_day_id=(opened->>'id')::uuid),0),
        count(*) filter (where b.trading_day_id=(opened->>'id')::uuid),
        count(*) filter (where b.trading_day_id is null)
 into calendar_cents,calendar_count,weekly_cents,weekly_count,current_cents,current_count,unassigned
 from akihq_hospitality.closed_bill_audit b where b.workspace_id=p_workspace;
 select coalesce(jsonb_agg(to_jsonb(a) order by a.actor_name),'[]'::jsonb) into actors from (
  select distinct b.closed_by::text actor_id,b.closed_by_name actor_name
  from akihq_hospitality.closed_bill_audit b where b.workspace_id=p_workspace
 ) a;
 return jsonb_build_object('rows',result_rows,'total_count',filtered_count,'offset',skip,'limit',take,
  'trading_days',days,'active_day',opened,'staff',actors,'timezone',tz,
  'summary',jsonb_build_object('calendar_cents',calendar_cents,'calendar_count',calendar_count,
    'week_cents',weekly_cents,'week_count',weekly_count,
    'active_cents',current_cents,'active_count',current_count,
    'unassigned_count',unassigned));
end $$;

revoke all on function public.crm_pos_ledger(text,jsonb) from public,anon;
grant execute on function public.crm_pos_ledger(text,jsonb) to authenticated;
commit;
