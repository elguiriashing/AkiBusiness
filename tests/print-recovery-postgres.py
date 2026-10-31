"""Synthetic multi-connection recovery races. No deployed database or printer."""
import concurrent.futures
import json
import os
import subprocess
import threading
import uuid

if os.environ.get('PGDATABASE') != 'printer_recovery_test' or os.environ.get('PGHOST') not in ('127.0.0.1', 'localhost'):
    raise SystemExit('Requires the isolated localhost printer_recovery_test database')
OWNER = '00000000-0000-0000-0000-000000000001'

def sql(statement):
    result = subprocess.run(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', statement], text=True, capture_output=True, timeout=20)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()

pair = json.loads(sql(f"begin; set local test.user_id='{OWNER}'; set local role authenticated; select public.crm_printer_manage('tenant-a','pair','{{\"name\":\"Isolated race fixture\",\"stations\":[\"kitchen\"]}}'); commit;"))

def fixture(state):
    order, ticket = str(uuid.uuid4()), str(uuid.uuid4())
    sql(f"insert into akihq_hospitality.orders(id,workspace_id,label,opened_by) values('{order}','tenant-a','Synthetic race','{OWNER}'); insert into akihq_hospitality.tickets(id,workspace_id,order_id,station,kind,payload,status,printer_id) values('{ticket}','tenant-a','{order}','kitchen','preparation','{{}}','{state}','{pair['device_id']}');")
    return ticket

def report(ticket, action):
    result = sql(f"begin; set local role anon; select public.crm_printer_report('{pair['device_id']}','{pair['token']}','{ticket}','{action}'); select pg_sleep(0.1); commit;")
    return json.loads(next(line for line in result.splitlines() if line.startswith('{')))

def race(jobs):
    barrier = threading.Barrier(len(jobs))
    def run(job):
        barrier.wait()
        try:
            return {'ok': job()}
        except RuntimeError as error:
            return {'error': str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(jobs)) as pool:
        return list(pool.map(run, jobs))

def status(ticket):
    return sql(f"select status from akihq_hospitality.tickets where id='{ticket}'")

def count(ticket):
    return int(sql(f"select count(*) from akihq_hospitality.events where action='printer_recover' and metadata->>'ticket_id'='{ticket}'"))

for initial in ('claimed', 'uncertain', 'spooled', 'confirmed'):
    ticket = fixture(initial)
    results = race([lambda: report(ticket, 'recover') for _ in range(8)])
    expected = 'uncertain' if initial == 'claimed' else initial
    assert all('ok' in result for result in results), results
    assert all(result['ok'] == results[0]['ok'] for result in results), results
    assert status(ticket) == expected and count(ticket) == 1
    assert all(result['ok']['reprint'] is False for result in results)
    print(f'PASS: eight concurrent recoveries preserve {initial} and create one audit event')

ticket = fixture('claimed')
results = race([lambda: report(ticket, 'begin'), lambda: report(ticket, 'recover')])
assert 'ok' in results[1], results
assert 'ok' in results[0] or 'already attempted' in results[0].get('error', ''), results
assert status(ticket) == 'uncertain' and count(ticket) == 1
try:
    report(ticket, 'begin')
    raise AssertionError('Recovery authorized a duplicate print attempt')
except RuntimeError as error:
    assert 'already attempted' in str(error)
print('PASS: begin versus recovery cannot authorize a later duplicate attempt')

ticket = fixture('uncertain')
results = race([lambda: report(ticket, 'spooled'), lambda: report(ticket, 'recover')])
assert all('ok' in result for result in results), results
assert status(ticket) == 'spooled' and count(ticket) == 1
print('PASS: recovery never downgrades a simultaneous completed spool')
