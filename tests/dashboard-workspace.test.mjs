import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/app-v32.js', import.meta.url), 'utf8');
function functionSource(name, next) {
  return source.slice(source.indexOf(`  function ${name}(`), source.indexOf(`  function ${next}(`));
}
function dashboard(tools, pipelines) {
  const state = {
    workspace: { id: 'business-fixture', name: 'Fixture', toolKeys: tools, canAdminister: false },
    pipelines, activities: [], deals: [], invoices: [], tasks: [], events: [], companies: [],
    contacts: [], employees: [], integrations: {}, audit: []
  };
  const context = vm.createContext({
    state, ui: { pipelineId: 'sales' }, Date, JSON, Math,
    workspaceMutationVersion: 0, workspaceCommittedVersion: 0, lastRemoteWorkspaceUpdate: null,
    collectionTools: { pipelines: 'crm', deals: 'crm', contacts: 'crm' },
    store: { save() {} },
    isPlatformWorkspace: () => false, canUseRoute: () => true,
    routeForActivity: () => 'dashboard', liveStats: null, authUser: { id: 'fixture' },
    tipBalance: () => 0, formatMoney: value => `EUR ${value}`, escapeHtml: value => String(value ?? ''),
    icon: () => '', renderMetric: (label, value) => `<strong>${label}</strong><span data-metric-value>${value}</span>`
  });
  vm.runInContext(functionSource('canUseTool', 'clearDeniedCollections').replace(/  const collectionTools = .*;\r?\n/, '')
    + functionSource('clearDeniedCollections', 'requireExport')
    + functionSource('renderDashboard', 'renderAITeamCRM')
    + functionSource('applyRemoteStateSnapshot', 'clearRevokedWorkspace')
    + '\nfunction requestBackgroundRender() { rendered = renderDashboard(); }', context);
  return { state, render: () => vm.runInContext('renderDashboard()', context), apply: remote => {
    context.remote = remote;
    vm.runInContext('applyRemoteStateSnapshot(remote, "next-version")', context);
    return context.rendered;
  } };
}

test('operations dashboard survives permission-filtered CRM during snapshot refresh', () => {
  const fixture = dashboard(['pos'], [{ id: 'sales', name: 'Private pipeline', stages: [] }]);
  const html = fixture.apply({ workspace: { name: 'Renamed fixture' }, deals: [{ id: 'hidden', value: 100 }] });
  assert.match(html, /Locations/);
  assert.match(html, /Your tips this month/);
  assert.doesNotMatch(html, /Private pipeline|Value currently sitting/);
  assert.equal(fixture.state.pipelines.length, 0);
  assert.equal(fixture.state.deals.length, 0);
  assert.deepEqual([...fixture.state.workspace.toolKeys], ['pos']);
});

for (const pipelines of [undefined, null, [], [null], [{ id: 'sales' }], [{ id: 'sales', stages: null }]]) {
  test(`dashboard renders with incomplete CRM cache ${JSON.stringify(pipelines)}`, () => {
    const fixture = dashboard(['crm'], pipelines);
    const before = JSON.stringify(fixture.state.pipelines);
    assert.match(fixture.render(), /Recent activity/);
    assert.doesNotMatch(fixture.render(), /Value currently sitting/);
    assert.equal(JSON.stringify(fixture.state.pipelines), before);
    assert.match(fixture.apply({ tasks: [{ id: 'refresh', status: 'done' }] }), /Recent activity/);
  });
}

test('valid CRM dashboard retains pipeline stages and values without modifying records', () => {
  const fixture = dashboard(['crm'], [{ id: 'sales', name: 'Sales', stages: [null, { id: 'new', name: 'New' }] }]);
  fixture.state.deals.push({ pipelineId: 'sales', stageId: 'new', value: 125 });
  const before = JSON.stringify(fixture.state);
  const html = fixture.render();
  assert.match(html, /Sales value/);
  assert.match(html, /EUR 125/);
  assert.match(html, /New/);
  assert.equal(JSON.stringify(fixture.state), before);
});

test('business dashboard counts the authorized operating workspace, never CRM customers as locations', () => {
  const fixture = dashboard(['pos'], []);
  fixture.state.companies.push({id:'customer-1'},{id:'customer-2'});
  const html = fixture.render();
  assert.match(html, /<strong>Locations<\/strong><span data-metric-value>1<\/span>/);
  assert.doesNotMatch(html, /<strong>Locations<\/strong><span data-metric-value>2<\/span>/);
});

