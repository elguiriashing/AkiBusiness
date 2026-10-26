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

test("shared header keeps local login, language, real appearance and canonical app menu working", async () => {
  const { JSDOM } = await import("../cloudflare/node_modules/jsdom/lib/api.js");
  for (const locale of ["en", "es"]) {
    const dom = new JSDOM(read("index.html"), {url: `https://akibusiness.com/?locale=${locale}`, runScripts: "outside-only"});
    const {window} = dom;
    window.eval(read("assets/landing.js"));
    const header = window.document.querySelector(".suite-marketing-header");
    assert.deepEqual(Array.from(header.children).map(el => el.className), ["suite-marketing-brand", "suite-marketing-links", "portal-header-tools", "suite-marketing-signin"]);
    assert.equal(header.querySelector(".suite-marketing-signin").href, `https://akibusiness.com/login?locale=${locale}`);
    const menu = header.querySelector("details");
    menu.open = true;
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
    assert.equal(menu.open, false);
    assert.equal(window.document.activeElement, menu.querySelector("summary"));
    menu.open = true;
    window.document.body.dispatchEvent(new window.Event("pointerdown", {bubbles: true}));
    assert.equal(menu.open, false);
    header.querySelector("#ab-theme").click();
    assert.equal(window.document.documentElement.dataset.theme, "light");
    assert.equal(window.localStorage.getItem("akipasa.theme"), "light");
    header.querySelector("#ab-language").click();
    const other = locale === "en" ? "es" : "en";
    assert.equal(window.document.documentElement.lang, other);
    assert.equal(header.querySelector(".suite-marketing-signin").href, `https://akibusiness.com/login?locale=${other}`);
    assert.equal(header.querySelector('[data-suite-product="hq"]').href, `https://akihq.app/${other}/business`);
    assert.equal(header.querySelector('[data-suite-product="pasa"]').href, `https://akipasa.com/${other}`);
    assert.equal(header.querySelector('[data-suite-product="business"]').getAttribute("aria-current"), "page");
    assert.equal(window.document.documentElement.dataset.theme, "light");
    dom.window.close();
  }
});
