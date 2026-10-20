"""Disposable PostgreSQL concurrency acceptance. Never points at customer data."""
import concurrent.futures,json,os,subprocess
if os.environ.get('PGDATABASE')!='toolbox_test':
    raise SystemExit('Requires isolated toolbox_test database')
def sql(value,ok=True):
    result=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-c',value],text=True,capture_output=True)
    if ok and result.returncode:raise AssertionError(result.stderr)
    return result
owner='00000000-0000-4000-8000-000000000001'
role=f"set role authenticated;select set_config('request.jwt.claim.sub','{owner}',false);"
sql(f"insert into crm_workspaces values('w','active','{owner}');insert into crm_workspace_members values('w','{owner}','active','owner',null);insert into crm_tool_catalog select t,true from unnest(array['crm','inbox','tasks','calendar','pos','inventory'])t;")
sql("select public.crm_toolbox_billing_sync('w','basico',array['crm','inbox','tasks','calendar'],now()-interval '4 months',now()+interval '1 year','active','stripe','sub_test',1,'synthetic-invoice',true);")
sql("update akibusiness_private.toolboxes set saved_tools=array['crm','inbox','tasks','pos'];")
def rotate(_):return sql("set role service_role;begin;select public.crm_toolbox_rotate('w');commit;").stdout.strip()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(rotate,range(8)))
assert results.count('t')==1,results
assert sql("select count(*) from akibusiness_private.toolbox_history where action='rotation'").stdout.strip()=='1'
revision=int(sql("select revision from akibusiness_private.toolboxes where workspace_id='w'").stdout.strip())
def save(i):return sql(role+f"select public.crm_toolbox_save('w',array['crm','inbox','tasks','{('inventory' if i else 'calendar')}'],{revision});",False)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:responses=list(pool.map(save,range(2)))
assert sum(x.returncode==0 for x in responses)==1,[x.stderr for x in responses]
assert any('Configuration changed' in x.stderr for x in responses)
assert sql("select cardinality(active_tools) from akibusiness_private.toolboxes where workspace_id='w'").stdout.strip()=='4'
print('PASS PostgreSQL: eight concurrent rotations apply once; two concurrent saves have one winner, active selection unchanged')
