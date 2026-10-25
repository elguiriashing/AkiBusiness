import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';
const require = createRequire(new URL('../cloudflare/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const native = readFileSync(new URL('../assets/native-auth.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../assets/app-v32.js', import.meta.url), 'utf8');
const account = readFileSync(new URL('../assets/account.js', import.meta.url), 'utf8');
function page(path, agent = 'Chrome') {
  const dom = new JSDOM('<div id="app"></div>', { url: `https://akibusiness.com${path}`, runScripts: 'outside-only' });
  Object.defineProperty(dom.window.navigator, 'userAgent', { value: agent });
  dom.window.eval(native);
  return dom;
}
test('Android initiation marks fixed HTTPS callback; ordinary browser stays unchanged', () => {
  for (const [agent, expected] of [['AkiBusinessAndroid/1.0', 'https://akibusiness.com/login?android=1'], ['Chrome', 'https://akibusiness.com/login']]) {
    const dom = page('/account?next=https://evil.test', agent);
    assert.equal(dom.window.AkiBusinessNativeAuth.callbackUrl(), expected);
    dom.window.close();
  }
});
test('browser handoff copies code and provider errors only and never starts WebView auth boot', () => {
  const dom = page('/login?android=1&code=one-time&access_token=secret&refresh_token=secret&next=https://evil.test&error_description=%22%3Cscript%3E');
  assert.equal(dom.window.AkiBusinessNativeAuth.handoff, true);
  const target = new URL(dom.window.document.querySelector('a').href);
  assert.equal(target.protocol, 'akibusiness:');
  assert.equal(target.searchParams.get('code'), 'one-time');
  assert.deepEqual([...target.searchParams.keys()], ['code', 'error_description']);
  assert.equal(dom.window.document.querySelectorAll('script').length, 0);
  // Execute the actual full application: the early return must precede SDK init,
  // cache restoration and any code exchange in this external browser.
  dom.window.eval(app);
  assert.equal(dom.window._sbClientInstance, undefined);
  dom.window.close();
});
test('native return and ordinary callbacks proceed in the original WebView', () => {
  for (const path of ['/login?android=1&native=1&code=one-time', '/login?code=ordinary', '/account?android=1']) {
    const dom = page(path);
    assert.equal(dom.window.AkiBusinessNativeAuth.handoff, false);
    assert.equal(dom.window.document.querySelector('a'), null);
    dom.window.close();
  }
});
test('runtime and account clients use PKCE with the same default origin storage', () => {
  let options;
  const context = vm.createContext({window:{AKIHQ_CONFIG:{SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'public'},supabase:{createClient:(url,key,config)=>{options=config;return {};}}}});
  vm.runInContext(app.slice(app.indexOf('  function getSupabaseClient()'), app.indexOf('  // Auth state')), context);
  vm.runInContext('getSupabaseClient()', context);
  assert.equal(options.auth.flowType, 'pkce');
  assert.equal(options.auth.storage, undefined);
  const snippet = account.slice(account.indexOf('  const client ='), account.indexOf('  const message ='));
  const accountContext = vm.createContext({config:context.window.AKIHQ_CONFIG,window:context.window});
  vm.runInContext(snippet, accountContext);
  assert.equal(options.auth.flowType, 'pkce');
  assert.equal(options.auth.storage, undefined);
});
test('handoff script loads before SDK and auth clients in both entry pages', () => {
  for (const file of ['login.html','account.html']) {
    const html = readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
    assert(html.indexOf('assets/native-auth.js') < html.indexOf('assets/supabase.js'));
  }
});

test('actual SDK creates S256 challenge with verifier retained only in the initiating WebView storage', async () => {
  const dom = page('/account', 'AkiBusinessAndroid/1.0');
  Object.defineProperty(dom.window, 'crypto', {value: webcrypto});
  dom.window.TextEncoder = TextEncoder;
  dom.window.TextDecoder = TextDecoder;
  dom.window.eval(readFileSync(new URL('../assets/supabase.js', import.meta.url), 'utf8'));
  const client = dom.window.supabase.createClient('https://reviewfixture.supabase.co', 'public-fixture-key', {auth:{flowType:'pkce',autoRefreshToken:false,detectSessionInUrl:false}});
  const result = await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:dom.window.AkiBusinessNativeAuth.callbackUrl(),skipBrowserRedirect:true}});
  assert.equal(result.error, null);
  const authUrl = new URL(result.data.url);
  const verifier = JSON.parse(dom.window.localStorage.getItem('sb-reviewfixture-auth-token-code-verifier'));
  assert.equal(typeof verifier, 'string');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 's256');
  assert.equal(authUrl.searchParams.get('code_challenge'), createHash('sha256').update(verifier).digest('base64url'));
  assert.equal(authUrl.searchParams.get('redirect_to'), 'https://akibusiness.com/login?android=1');
  const external = page('/login?android=1&code=one-time');
  assert.equal(external.window.localStorage.getItem('sb-reviewfixture-auth-token-code-verifier'), null);
  assert.equal(external.window.AkiBusinessNativeAuth.handoff, true);
  dom.window.close(); external.window.close();
});
