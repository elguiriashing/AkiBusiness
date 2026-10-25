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
  const timer = dom.window.setTimeout;
  dom.window.setTimeout = (_callback, delay) => { dom.handoffDelay = delay; return 0; };
  dom.window.eval(native);
  dom.window.setTimeout = timer;
  return dom;
}
test('Android initiation marks fixed HTTPS callback; ordinary browser stays unchanged', () => {
  for (const [agent, expected] of [['AkiBusinessAndroid/1.0', 'https://akibusiness.com/login?android=1&locale=en'], ['Chrome', 'https://akibusiness.com/login']]) {
    const dom = page('/account?next=https://evil.test', agent);
    assert.equal(dom.window.AkiBusinessNativeAuth.callbackUrl(), expected);
    dom.window.close();
  }
});
test('browser handoff copies code and provider errors only and never starts WebView auth boot', () => {
  const dom = page('/login?android=1&code=one-time&access_token=secret&refresh_token=secret&next=https://evil.test&error_description=%22%3Cscript%3E');
  assert.equal(dom.window.AkiBusinessNativeAuth.handoff, true);
  assert.equal(dom.handoffDelay, 5000);
  const target = new URL(dom.window.document.querySelector('a').href);
  assert.equal(target.protocol, 'akibusiness:');
  assert.equal(target.searchParams.get('code'), 'one-time');
  assert.deepEqual([...target.searchParams.keys()], ['locale', 'code', 'error_description']);
  assert.equal(dom.window.document.querySelectorAll('script').length, 0);
  assert.equal(dom.window.document.querySelector('#return-seconds').textContent, '5');
  assert.equal(dom.window.document.body.classList.contains('native-oauth-handoff'), true);
  // Execute the actual full application: the early return must precede SDK init,
  // cache restoration and any code exchange in this external browser.
  dom.window.eval(app);
  assert.equal(dom.window._sbClientInstance, undefined);
  dom.window.close();
});
test('Spanish Android callback and return preserve the selected language', () => {
  const start = page('/account?locale=es', 'AkiBusinessAndroid/1.0');
  assert.equal(new URL(start.window.AkiBusinessNativeAuth.callbackUrl()).searchParams.get('locale'), 'es');
  const returned = page('/login?android=1&code=one-time&locale=es');
  assert.match(returned.window.document.querySelector('a').textContent, /Volver/);
  assert.equal(new URL(returned.window.document.querySelector('a').href).searchParams.get('locale'), 'es');
  start.window.close(); returned.window.close();
});
test('native return and ordinary callbacks proceed in the original WebView', () => {
  for (const path of ['/login?android=1&native=1&code=one-time', '/login?code=ordinary', '/account?android=1']) {
    const dom = page(path);
    assert.equal(dom.window.AkiBusinessNativeAuth.handoff, false);
    assert.equal(dom.window.document.querySelector('a'), null);
    dom.window.close();
  }
});
test('runtime and account clients retain their existing default email/password flow', () => {
  let options;
  const context = vm.createContext({window:{AKIHQ_CONFIG:{SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'public'},supabase:{createClient:(url,key,config)=>{options=config;return {};}}}});
  vm.runInContext(app.slice(app.indexOf('  function getSupabaseClient()'), app.indexOf('  // Auth state')), context);
  vm.runInContext('getSupabaseClient()', context);
  assert.equal(options, undefined);
  const snippet = account.slice(account.indexOf('  const client ='), account.indexOf('  const message ='));
  const accountContext = vm.createContext({config:context.window.AKIHQ_CONFIG,window:context.window});
  vm.runInContext(snippet, accountContext);
  assert.equal(options, undefined);
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
  dom.window.AKIHQ_CONFIG = {SUPABASE_URL:'https://reviewfixture.supabase.co',SUPABASE_ANON_KEY:'public-fixture-key'};
  const client = dom.window.AkiBusinessNativeAuth.oauthClient(null);
  const result = await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:dom.window.AkiBusinessNativeAuth.callbackUrl(),skipBrowserRedirect:true}});
  assert.equal(result.error, null);
  const authUrl = new URL(result.data.url);
  const verifier = JSON.parse(dom.window.localStorage.getItem('sb-reviewfixture-auth-token-code-verifier'));
  assert.equal(typeof verifier, 'string');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 's256');
  assert.equal(authUrl.searchParams.get('code_challenge'), createHash('sha256').update(verifier).digest('base64url'));
  assert.equal(authUrl.searchParams.get('redirect_to'), 'https://akibusiness.com/login?android=1&locale=en');
  const external = page('/login?android=1&code=one-time');
  assert.equal(external.window.localStorage.getItem('sb-reviewfixture-auth-token-code-verifier'), null);
  assert.equal(external.window.AkiBusinessNativeAuth.handoff, true);
  dom.window.close(); external.window.close();
});

test('default SDK still accepts existing implicit password-recovery email callbacks', async () => {
  const token = `${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'00000000-0000-4000-8000-000000000001',exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'})).toString('base64url')}.fixture-signature`;
  const dom = page(`/login#access_token=${token}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=recovery`);
  dom.window.fetch = async () => new Response(JSON.stringify({id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid'}), {status:200,headers:{'Content-Type':'application/json'}});
  dom.window.Response = Response; dom.window.Headers = Headers; dom.window.Request = Request;
  dom.window.eval(readFileSync(new URL('../assets/supabase.js', import.meta.url), 'utf8'));
  const client = dom.window.supabase.createClient('https://reviewfixture.supabase.co', 'public-fixture-key', {auth:{autoRefreshToken:false}});
  const initialized = await client.auth.initialize();
  assert.equal(initialized.error, null, initialized.error?.message);
  const {data,error} = await client.auth.getSession();
  assert.equal(error, null);
  assert.equal(data.session.access_token, token);
  assert.equal(data.session.user.email, 'fixture@example.invalid');
  assert.equal(dom.window.AkiBusinessNativeAuth.handoff, false);
  dom.window.close();
});

test('native-return callback client exchanges the code exactly once with the original stored verifier', async () => {
  const dom = page('/login?android=1&native=1&code=fixture-code');
  const user = {id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid'};
  const token = `${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'})).toString('base64url')}.fixture-signature`;
  const calls = [];
  dom.window.fetch = async (url, options) => {
    calls.push({url:String(url), body:options?.body});
    return new Response(JSON.stringify({access_token:token,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user}), {status:200,headers:{'Content-Type':'application/json'}});
  };
  dom.window.Response = Response; dom.window.Headers = Headers; dom.window.Request = Request;
  dom.window.localStorage.setItem('sb-reviewfixture-auth-token-code-verifier', JSON.stringify('original-webview-verifier'));
  dom.window.eval(readFileSync(new URL('../assets/supabase.js', import.meta.url), 'utf8'));
  const client = dom.window.supabase.createClient('https://reviewfixture.supabase.co', 'public-fixture-key', {auth:{...dom.window.AkiBusinessNativeAuth.callbackOptions.auth,autoRefreshToken:false}});
  const initialized = await client.auth.initialize();
  assert.equal(initialized.error, null, initialized.error?.message);
  const {data,error} = await client.auth.getSession();
  assert.equal(error, null);
  assert.equal(data.session.access_token, token);
  const exchanges = calls.filter(call => call.url.includes('grant_type=pkce'));
  assert.equal(exchanges.length, 1);
  assert.deepEqual(JSON.parse(exchanges[0].body), {auth_code:'fixture-code',code_verifier:'original-webview-verifier'});
  assert.equal(dom.window.localStorage.getItem('sb-reviewfixture-auth-token-code-verifier'), null);
  assert.equal(dom.window.AkiBusinessNativeAuth.handoff, false);
  dom.window.AKIHQ_CONFIG = {SUPABASE_URL:'https://reviewfixture.supabase.co',SUPABASE_ANON_KEY:'public-fixture-key'};
  const recoveryClient = dom.window.AkiBusinessNativeAuth.emailClient(client);
  const recovery = await recoveryClient.auth.resetPasswordForEmail('fixture@example.invalid', {redirectTo:'https://akibusiness.com/login'});
  assert.equal(recovery.error, null);
  const request = calls.find(call => call.url.includes('/recover'));
  assert(request);
  assert.equal(JSON.parse(request.body).code_challenge == null, true);
  assert.equal(JSON.parse(request.body).email, 'fixture@example.invalid');
  dom.window.close();
});
