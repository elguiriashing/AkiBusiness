import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../assets/suite-navigation.js', import.meta.url), 'utf8');
function create(search = '', saved) {
  const values = new Map(saved ? [['akisuite.language', saved]] : []);
  const context = vm.createContext({ URL, URLSearchParams, location: { search }, localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } });
  vm.runInContext(source, context);
  return context.AkiSuiteNavigation;
}
for (const language of ['en', 'es']) {
  for (const [product, expected] of Object.entries({ pasa: `https://akipasa.com/${language}`, duermo: `https://akiduermo.com/?lang=${language}`, coches: `https://akicoches.com/?lang=${language}`, hq: `https://akihq.app/${language}/business`, business: `https://akibusiness.com/?locale=${language}` })) {
    test(`${language} navigation to ${product}`, () => assert.equal(create().href(product, language), expected));
  }
}
test('explicit arrival language wins over saved locale and survives workspace reloads', () => {
  const nav = create('?locale=es', 'en');
  assert.equal(nav.locale('en'), 'es');
  assert.equal(nav.locale('en'), 'es');
  nav.remember('en');
  assert.equal(nav.locale('es'), 'en');
});
test('legacy lang arrival and saved preference are supported', () => {
  assert.equal(create('?lang=es').locale(), 'es');
  assert.equal(create('', 'es').locale('en'), 'es');
  assert.equal(create('?locale=evil', 'es').locale('en'), 'es');
});
test('unsafe paths and arbitrary products cannot become cross-origin links', () => {
  const nav = create();
  for (const path of ['//evil.test', 'https://evil.test', '/%2f%2fevil', '/auth#token=secret', '/auth?next=evil', '/a/../auth', '/a/./auth', '/\\evil']) assert.throws(() => nav.href('hq', 'en', { path }));
  assert.throws(() => nav.href('__proto__', 'en'));
});
test('only a single valid public referral code crosses domains', () => {
  for (const product of ['pasa', 'duermo', 'coches', 'hq', 'business']) {
    assert.equal(new URL(create('?ref=ALEX1234&access_token=secret').href(product, 'en')).searchParams.get('ref'), 'ALEX1234');
    assert.equal(new URL(create('?ref=ALEX1234&access_token=secret').href(product, 'en')).searchParams.has('access_token'), false);
    assert.equal(new URL(create('?ref=ALEX1234&ref=OTHER123').href(product, 'en')).searchParams.has('ref'), false);
  }
});
