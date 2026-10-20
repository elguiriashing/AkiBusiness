import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("AkiBusiness links to its local approved toolbox catalogue in EN/ES", () => {
  const source = readFileSync(new URL("../assets/app-v32.js", import.meta.url), "utf8");
  assert.match(source, /\/membership\.html\?locale=/);
  assert.match(source, /Planes AkiBusiness/);
  assert.match(source, /AkiBusiness plans/);
  assert.match(source, /state\.settings\?\.locale === "es"/);
});

test("plans use the authoritative account handoff and never collect payment locally", () => {
  const page = readFileSync(new URL("../membership.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../assets/membership.js", import.meta.url), "utf8");
  assert.match(page, /data-plan="standard"/);
  assert.match(page, /data-plan="basico"/);
  assert.doesNotMatch(page, /data-plan="plus"/);
  assert.match(page, /data-plan="pro"/);
  assert.match(page, /id="operations-subscription-link"/);
  assert.match(script, /account\/subscription\/operations/);
  assert.doesNotMatch(page + script, /checkout\.sessions|payment_intent|stripe\.com|<form|fetch\(/i);
});

test("the membership navigation bundle has a fresh and consistent offline cache key", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /\.\/membership\.html/);
  assert.match(sw, /\.\/assets\/membership\.js\?v=4/);
  assert.match(sw, /\.\/assets\/membership\.css\?v=2/);
  assert.match(html, /app-v32\.js\?v=43/);
  assert.match(sw, /app-v32\.js\?v=43/);
  const cache = sw.match(/^const CACHE = "akihq-v(\d+)";/m);
  assert.ok(cache, "Service-worker cache must carry an explicit release version");
  assert.ok(Number(cache[1]) >= 120, "Membership navigation must not reuse a pre-navigation cache");
  const replacements = JSON.parse(readFileSync(new URL("../tools/operations-product-release.json", import.meta.url), "utf8"))["sw.js"];
  const cacheReplacement = replacements.find(entry => entry.from.startsWith("const CACHE = "));
  assert.equal(cacheReplacement?.from.trim(), cache[0], "Paid-product cache transform must match this source release");
  const paidCache = cacheReplacement.to.match(/^const CACHE = "akihq-v(\d+)";/);
  assert.ok(paidCache && Number(paidCache[1]) > Number(cache[1]), "Paid-product release needs a distinct, newer cache");
});
