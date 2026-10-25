import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { buildProductRelease } from '../tools/build-product-release.mjs';
import { productionProject, verifyProductionTarget } from '../tools/verify-production-target.mjs';

test('production preflight accepts the canonical self-owned project and rejects retired or drifted targets', () => {
  const project = {
    name: productionProject, domains: ['akibusiness.com', 'operations.akipasa.com'], production_branch: 'main',
    source: { type: 'github', config: { owner: 'elguiriashing', repo_name: 'AkiBusiness', production_branch: 'main' } },
  };
  const stamp = { sourceCommit: 'verified-commit', sourceTreeDirty: false, product: 'AkiBusiness', roleSwap: true, canonicalOrigin: 'https://akibusiness.com' };
  assert.doesNotThrow(() => verifyProductionTarget(project, stamp, 'verified-commit'));
  for (const change of [
    value => { value.name = 'akibusiness-operations-preview'; },
    value => { value.domains = ['preview.pages.dev']; },
    value => { value.production_branch = 'migration/old'; },
    value => { value.source.config.owner = 'another-owner'; },
    value => { value.source.config.repo_name = 'akihq'; },
    value => { value.source.config.production_branch = 'migration/old'; },
    value => { delete value.source; },
  ]) {
    const drifted = structuredClone(project);
    change(drifted);
    assert.throws(() => verifyProductionTarget(drifted, stamp, 'verified-commit'));
  }
  for (const change of [{ sourceCommit: 'older-commit' }, { sourceTreeDirty: true }, { product: 'AkiHQ' }, { roleSwap: false }, { canonicalOrigin: 'https://crm.akipasa.com' }]) {
    assert.throws(() => verifyProductionTarget(project, { ...stamp, ...change }, 'verified-commit'));
  }
  assert.throws(() => verifyProductionTarget(project, stamp, ''));
});

for (const enabled of [false, true]) {
  test(`isolated ${enabled ? 'AkiBusiness' : 'legacy AkiHQ'} release preserves operations and initiating-origin authentication`, async () => {
    const temporary = await mkdtemp(path.join(tmpdir(), 'akisuite-release-'));
    try {
      const output = await buildProductRelease(path.join(temporary, 'site'), enabled);
      const read = file => readFile(path.join(output, file), 'utf8');
      const source = await read('assets/app-v32.js');
      const original = await readFile(new URL('../assets/app-v32.js', import.meta.url), 'utf8');
      const product = enabled ? 'AkiBusiness' : 'AkiHQ';
      assert.match(await read('index.html'), /<title>AkiBusiness/);
      assert.match(await read('login.html'), new RegExp(`<title>${product}</title>`));
      // Cloudflare Pages SPA rewrites nested routes back to index.html; base URL
      // must stay rooted so /es/business loads /assets and /config.js.
      assert.match(await read('index.html'), /<base href="\/"\s*\/>/);
      assert.equal(JSON.parse(await read('manifest.webmanifest')).name, product);
      assert.match(await read('membership.html'), /data-plan="standard"/);
      assert.match(await read('membership.html'), /id="operations-subscription-link"/);
      assert.match(await read('membership.html'), /data-plan="basico"/);
      assert.equal(JSON.parse(await read('release-source.json')).roleSwap, enabled);
      assert.equal(typeof JSON.parse(await read('release-source.json')).sourceTreeDirty, 'boolean');
      if (enabled) assert.doesNotMatch(source, /void client\.rpc\("queue_suite_portal_welcome"/);
      else assert.match(source, /void client\.rpc\("queue_suite_portal_welcome"/);
      // Native clean /login and one-hop /app redirect preserve auth without an SPA wildcard.
      const rewrites = await read('_redirects');
      const privacy = await read('privacy.html');
      assert.match(privacy, /id="en"/);
      assert.match(privacy, /id="es"/);
      assert.match(privacy, /https:\/\/akipasa.com\/en\/account-deletion/);
      assert.match(privacy, /https:\/\/akipasa.com\/es\/account-deletion/);
      assert.match(privacy, /not a confirmed maximum/);
      assert.match(privacy, /no un máximo confirmado/);
      assert.doesNotMatch(rewrites, /^\/login\/?\s/m);
      assert.match(rewrites, /^\/app \/login 302$/m);
      assert.doesNotMatch(rewrites, /\/\* \/index\.html/);
      assert.match(await read('config.js'), new RegExp(`CRM_URL: +"https://${enabled ? 'akibusiness.com' : 'akihq.app'}"`));
      // Permissions, workspace selection and operational implementations are byte-identical.
      const operations = text => text.slice(text.indexOf('  async function loadAccessibleWorkspaces('), text.indexOf('  async function loadAccessibleWorkspaces(') + 3800);
      assert.equal(operations(source), operations(original));
      for (const file of ['assets/hospitality-pos.js', 'assets/inventory-ops.js', 'assets/checkout-session.js', 'assets/supabase.js']) {
        assert.equal(await read(file), await readFile(new URL('../' + file, import.meta.url), 'utf8'));
      }
      const version = (await read('login.html')).match(/app-v32.js\?v=\d+/)[0];
      assert.ok((await read('sw.js')).includes(version));
      for (const origin of ['https://akibusiness.com', 'https://akihq.app', 'https://crm.akipasa.com', 'https://exact-preview.pages.dev']) {
        const handlers = {};
        let oauth;
        const elements = new Map(['google-login-btn', 'login-form'].map(id => [id, { addEventListener: (event, fn) => { handlers[`${id}:${event}`] = fn; }, querySelector: () => ({ textContent: '' }) }]));
        const context = { appRoot: {}, portal: {}, state: { settings: { locale: 'en' } }, applySettings() {}, escapeHtml: String,
          window: { AkiSuiteNavigation: { href: (product, locale) => product === "pasa" ? `https://akipasa.com/${locale}/auth` : `https://akihq.app/${locale}/business` }, location: { origin }, scrollTo() {} }, document: { getElementById: id => elements.get(id) }, requestAnimationFrame: fn => fn(),
          getSupabaseClient: () => ({ auth: { signInWithOAuth: async options => { oauth = options; return {}; } } }) };
        const login = source.slice(source.indexOf('  function renderLoginScreen('), source.indexOf('  function renderAccessDenied('));
        vm.runInNewContext(`${login}\nrenderLoginScreen();`, context);
        assert.match(context.appRoot.innerHTML, new RegExp(`Sign in to ${product}`));
        assert.match(context.appRoot.innerHTML, /suite-product-card active" href="\/login"/);
        if (enabled) assert.match(context.appRoot.innerHTML, /href="https:\/\/akihq.app\/en\/business"/);
        await handlers['google-login-btn:click']();
        assert.equal(oauth.options.redirectTo, origin + '/login');
      }
    } finally { await rm(temporary, { recursive: true, force: true }); }
  });
}

test('release builder refuses to overwrite any existing directory', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'akisuite-release-'));
  try { await assert.rejects(buildProductRelease(temporary, true), /new directory/); }
  finally { await rm(temporary, { recursive: true, force: true }); }
});


test('PoS review workflows assert the current paid-release cache', async () => {
  const rules = JSON.parse(await readFile(new URL('../tools/operations-product-release.json', import.meta.url), 'utf8'));
  const paid = rules['sw.js'].find(rule => rule.from.startsWith('const CACHE = ')).to.match(/akihq-v[0-9]+/)[0];
  for (const workflow of ['pos-kitchen-review.yml', 'pos-course-review.yml', 'pos-service-review.yml', 'pos-variants-review.yml']) {
    const source = await readFile(new URL('../.github/workflows/' + workflow, import.meta.url), 'utf8');
    assert.ok(source.includes(`includes('${paid}')`), `${workflow} must verify the actual paid-product cache`);
  }
});
