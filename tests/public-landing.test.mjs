import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("the public homepage and operations shell stay separate", () => {
  const publicPage = read("index.html");
  const authPage = read("login.html");
  const rewrites = read("_redirects");
  assert.match(publicPage, /<title>AkiBusiness \|/);
  assert.match(publicPage, /id="tools"/);
  assert.match(publicPage, /id="pricing"/);
  assert.match(publicPage, /€19\.99/);
  assert.match(publicPage, /€48\.99/);
  assert.match(publicPage, /€97\.99/);
  assert.match(publicPage, /href="\/login"/);
  assert.doesNotMatch(publicPage, /src="assets\/app-v32\.js/);
  assert.doesNotMatch(publicPage, /src="assets\/supabase\.js/);
  assert.match(authPage, /src="assets\/app-v32\.js\?v=45"/);
  assert.match(authPage, /<div id="app"/);
  assert.doesNotMatch(rewrites, /^\/login\/?\s/m);
  assert.match(rewrites, /^\/app \/login 302$/m);
  assert.doesNotMatch(rewrites, /\/\* \/index\.html/);
});

test("public language switch preserves canonical local login destinations", () => {
  const page = read("index.html");
  const script = read("assets/landing.js");
  assert.match(page, /id="ab-language"/);
  assert.match(script, /\[data-login-link\]/);
  assert.match(script, /"\/login\?locale="/);
  assert.match(script, /"\/account\?locale="/);
  assert.match(page, /location\.replace\("\/login" \+ location\.search \+ location\.hash\)/);
  assert.match(page, /location\.replace\("\/app" \+ location\.search \+ location\.hash\)/);
});

test("login uses same-origin OAuth and recovery; dashboard URL requires an authorised session", () => {
  const source = read("assets/app-v32.js");
  assert.match(source, /const redirectTarget = window\.AkiBusinessNativeAuth\?\.callbackUrl\(\) \|\| window\.location\.origin \+ "\/login"/);
  assert.match(source, /redirectTo: window\.location\.origin \+ "\/login"/);
  assert.match(source, /history\.replaceState\(null, "", "\/app#\/" \+ \(ui\.route \|\| "dashboard"\)\)/);
  assert.ok(source.indexOf("const selectedWorkspace = selectInitialWorkspace(") < source.indexOf('history.replaceState(null, "", "/app#/"'));
});

test("public operating tools are exactly the twelve authoritative membership catalogue keys and labels", () => {
  const page = read("index.html");
  const membership = read("assets/membership.js");
  const locale = read("assets/landing.js");
  const catalogue = membership.match(/const tools = \[([\s\S]*?)\n  \];/);
  assert.ok(catalogue, "Missing authoritative membership catalogue");
  const tools = [...catalogue[1].matchAll(/\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]/g)];
  assert.equal(tools.length, 12, "Expected all twelve parent tools, not subtools");
  const landing = [...page.matchAll(/<article data-tool-key="([^"]+)">[\s\S]*?<h3 data-i18n="([^"]+)">([^<]+)<\/h3>/g)];
  assert.equal(landing.length, 12, "Marketing must display exactly the twelve real operating tools");
  assert.deepEqual(landing.map(entry => entry[1]), tools.map(entry => entry[1]));
  assert.deepEqual(landing.map(entry => entry[3]), tools.map(entry => entry[2]));
  for (const [, key, en, es] of tools) {
    const card = landing.find(entry => entry[1] === key);
    assert.ok(card);
    assert.match(locale, new RegExp(card[2] + ':\\s*"' + es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"'));
    assert.ok(en.length > 0 && es.length > 0);
  }
  assert.match(page, /next eligible monthly rotation/);
  assert.match(page, /€19\.99/);
  assert.match(page, /€48\.99/);
  assert.match(page, /€97\.99/);
  assert.doesNotMatch(page, /data-i18n="toolTogether"|data-i18n="toolReports"/);
});
