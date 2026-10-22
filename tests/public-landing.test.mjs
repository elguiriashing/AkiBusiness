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
  assert.match(publicPage, /€24\.99/);
  assert.match(publicPage, /€44\.99/);
  assert.match(publicPage, /€64\.99/);
  assert.match(publicPage, /href="\/login"/);
  assert.doesNotMatch(publicPage, /src="assets\/app-v32\.js/);
  assert.doesNotMatch(publicPage, /src="assets\/supabase\.js/);
  assert.match(authPage, /src="assets\/app-v32\.js\?v=43"/);
  assert.match(authPage, /<div id="app"/);
  assert.match(rewrites, /^\/login \/login\.html 200$/m);
  assert.match(rewrites, /^\/app \/login\.html 200$/m);
  assert.doesNotMatch(rewrites, /\/\* \/index\.html/);
});

test("public language switch preserves canonical local login destinations", () => {
  const page = read("index.html");
  const script = read("assets/landing.js");
  assert.match(page, /id="ab-language"/);
  assert.match(script, /\[data-login-link\]/);
  assert.match(script, /"\/login\?locale="/);
  assert.match(script, /"\/membership\.html\?locale="/);
  assert.match(page, /location\.replace\("\/login" \+ location\.search \+ location\.hash\)/);
  assert.match(page, /location\.replace\("\/app" \+ location\.search \+ location\.hash\)/);
});

test("login uses same-origin OAuth and recovery; dashboard URL requires an authorised session", () => {
  const source = read("assets/app-v32.js");
  assert.match(source, /const redirectTarget = window\.location\.origin \+ "\/login"/);
  assert.match(source, /redirectTo: window\.location\.origin \+ "\/login"/);
  assert.match(source, /history\.replaceState\(null, "", "\/app#\/" \+ \(ui\.route \|\| "dashboard"\)\)/);
  assert.ok(source.indexOf("const selectedWorkspace = selectInitialWorkspace(") < source.indexOf('history.replaceState(null, "", "/app#/"'));
});
